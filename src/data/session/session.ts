/**
 * B05 — SessionService
 * Ported from: src/app/core/services/session/session.service.ts
 * Classification: Major adaptation
 * Changes:
 *   - @Injectable removed → singleton export (portability-matrix §4.1)
 *   - @capacitor/preferences → AsyncStorage (non-sensitive) + expo-secure-store (tokens/phone)
 *   - clearSession() → clear() deletes key-by-key via sessionKeys (R-37)
 *   - SESSION_PREFIX preserved for key isolation
 *   - SENSITIVE_KEYS: phone, userID stored in expo-secure-store; rest in AsyncStorage
 *
 * PUBLIC API (identical to original):
 *   setInfo(userInfo: Session): Promise<void>
 *   getInfo(): Promise<Session>
 *   setInfoField(key: keyof Session, value: string | undefined): Promise<void>
 *   clearSession(): void   (also exposed as clear() for B05+ callers)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Session, sessionKeys } from '@/data/models/session.model';

/**
 * Keys that contain sensitive data and must be stored in expo-secure-store.
 * Remaining session keys go to AsyncStorage.
 *
 * ⚠️ DIVERGENCIA CON EL ORIGINAL (fuente del bug de `uvaID`):
 * en Ionic las 9 claves viven en UN solo store (Capacitor Preferences), así que
 * o están todas o no está ninguna. Aquí la sesión está partida en dos backends
 * con ciclos de vida independientes (SharedPreferences cifradas + Keystore para
 * SecureStore, SQLite `RKStorage` para AsyncStorage): se puede quedar con
 * `userID`/`phone` presentes — el auth gate y `UserDSService.getUser()` pasan —
 * y `uvaID`/`racimoID` ausentes. Todo consumidor de `uvaID` debe tolerar eso;
 * ver `SetupService.ensureUvaID()` (rehidratación desde el `User` local) y
 * `UserDSService.updateUser` (nunca pisa la relación con '').
 */
const SENSITIVE_KEYS: Set<keyof Session> = new Set(['userID', 'phone']);

/** Prefix for AsyncStorage keys to avoid collisions with other libs (e.g. Amplify). */
const SESSION_PREFIX = 'session_';

function storageKey(key: keyof Session): string {
  return SESSION_PREFIX + (key as string);
}

async function storeValue(key: keyof Session, value: string): Promise<void> {
  if (SENSITIVE_KEYS.has(key)) {
    await SecureStore.setItemAsync(storageKey(key), value);
  } else {
    await AsyncStorage.setItem(storageKey(key), value);
  }
}

async function retrieveValue(key: keyof Session): Promise<string | null> {
  if (SENSITIVE_KEYS.has(key)) {
    return SecureStore.getItemAsync(storageKey(key));
  } else {
    return AsyncStorage.getItem(storageKey(key));
  }
}

async function removeValue(key: keyof Session): Promise<void> {
  if (SENSITIVE_KEYS.has(key)) {
    await SecureStore.deleteItemAsync(storageKey(key));
  } else {
    await AsyncStorage.removeItem(storageKey(key));
  }
}

class SessionService {
  /**
   * Guarda información parcial o completa.
   * Recorre las claves del objeto `userInfo` y guarda los valores correspondientes.
   * Sensitive keys (userID, phone) go to SecureStore; others go to AsyncStorage.
   * @param {Session} userInfo - Objeto que contiene la información del usuario a guardar.
   * @returns {Promise<void>}
   */
  async setInfo(userInfo: Session): Promise<void> {
    for (const key of Object.keys(userInfo)) {
      const value = userInfo[key as keyof Session];
      if (value) {
        await storeValue(key as keyof Session, value);
      }
    }
  }

  /**
   * Obtiene información parcial o completa.
   * Recorre sessionKeys y recupera los valores almacenados desde AsyncStorage o SecureStore.
   * @returns {Promise<Session>}
   */
  async getInfo(): Promise<Session> {
    const session: Session = {};

    for (const key of sessionKeys) {
      const value = await retrieveValue(key);
      if (value) {
        session[key] = value;
      }
    }

    return session;
  }

  /**
   * Guarda o actualiza un campo específico.
   * Sensitive keys go to SecureStore; others go to AsyncStorage.
   * If value is undefined, removes the stored value.
   * @param {keyof Session} key
   * @param {string | undefined} value
   * @returns {Promise<void>}
   */
  async setInfoField(
    key: keyof Session,
    value: string | undefined,
  ): Promise<void> {
    if (value !== undefined) {
      await storeValue(key, value);
    } else {
      await removeValue(key);
    }
  }

  /**
   * Borra toda la información de sesión almacenada.
   * Removes each key individually (no global clear() per R-37 — other data must not be wiped).
   * Both AsyncStorage and SecureStore keys are deleted.
   * @returns {void}
   */
  clearSession(): void {
    void this.clear();
  }

  /**
   * Async version of clearSession() — awaitable for callers that need to know when it's done.
   * Deletes all sessionKeys one by one (R-37: no global clear()).
   * @returns {Promise<void>}
   */
  async clear(): Promise<void> {
    for (const key of sessionKeys) {
      await removeValue(key);
    }
  }
}

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const sessionService = new SessionService();

/**
 * Export the class as default for DS services that do `new SessionService()`
 * (static session = new SessionService() pattern from original).
 */
export default SessionService;
