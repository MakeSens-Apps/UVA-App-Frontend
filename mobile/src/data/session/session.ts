/**
 * B04 — SessionService PROVISIONAL PLACEHOLDER
 * WILL BE REPLACED IN B05 with the full AsyncStorage/expo-secure-store implementation.
 *
 * This placeholder exists because DS services (measurement-ds, user-ds, uva-ds,
 * gamification-event-ds, user-progress-ds) all do `static session = new SessionService()`
 * and call `this.session.getInfo()`. They need the same public API to compile.
 *
 * Ported from: src/app/core/services/session/session.service.ts (public API only)
 * Original backing store: @capacitor/preferences → B05 replaces with AsyncStorage/expo-secure-store
 *
 * PUBLIC API preserved (B05 must implement the same signatures):
 *   setInfo(userInfo: Session): Promise<void>
 *   getInfo(): Promise<Session>
 *   setInfoField(key: keyof Session, value: string | undefined): Promise<void>
 *   clearSession(): void   (NOTE: B05 changes to clear() → key-by-key per sessionKeys, R-37)
 *
 * NOTE: This placeholder uses AsyncStorage directly (no expo-secure-store yet).
 * B05 will split storage: non-sensitive keys → AsyncStorage, tokens/phone → expo-secure-store.
 *
 * DO NOT use this file in production screens — it is provisional until B05.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, sessionKeys } from '@/data/models/session.model';

const SESSION_PREFIX = 'session_';

class SessionService {
  /**
   * Guarda información parcial o completa en AsyncStorage.
   * Recorre las claves del objeto `userInfo` y guarda los valores correspondientes.
   * @param {Session} userInfo - Objeto que contiene la información del usuario a guardar.
   * @returns {Promise<void>} Promesa que se resuelve cuando se completa la operación de guardado.
   */
  async setInfo(userInfo: Session): Promise<void> {
    for (const key of Object.keys(userInfo)) {
      const value = userInfo[key as keyof Session];
      if (value) {
        await AsyncStorage.setItem(SESSION_PREFIX + key, value);
      }
    }
  }

  /**
   * Obtiene información parcial o completa desde AsyncStorage.
   * Recorre las claves del modelo y recupera los valores almacenados.
   * @returns {Promise<Session>} Promesa que se resuelve con el objeto `Session` que contiene la información recuperada.
   */
  async getInfo(): Promise<Session> {
    const session: Session = {};

    for (const key of sessionKeys) {
      const value = await AsyncStorage.getItem(SESSION_PREFIX + (key as string));
      if (value) {
        session[key] = value;
      }
    }

    return session;
  }

  /**
   * Guarda o actualiza un campo específico en AsyncStorage.
   * @param {keyof Session} key - La clave del campo que se va a guardar o actualizar.
   * @param {string | undefined} value - El valor que se va a guardar. Si es `undefined`, se eliminará el valor almacenado.
   * @returns {Promise<void>} Promesa que se resuelve cuando se completa la operación de guardado.
   */
  async setInfoField(
    key: keyof Session,
    value: string | undefined,
  ): Promise<void> {
    if (value !== undefined) {
      await AsyncStorage.setItem(SESSION_PREFIX + (key as string), value);
    } else {
      await AsyncStorage.removeItem(SESSION_PREFIX + (key as string));
    }
  }

  /**
   * Borra toda la información almacenada en AsyncStorage para las sessionKeys.
   * B05 will implement clave-por-clave removal (no global clear()) per R-37.
   * @returns {void} No devuelve nada.
   */
  clearSession(): void {
    // Provisional: clears all session keys one by one
    // B05 will implement this with expo-secure-store for sensitive keys
    void Promise.all(
      sessionKeys.map((key) =>
        AsyncStorage.removeItem(SESSION_PREFIX + (key as string)),
      ),
    );
  }
}

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const sessionService = new SessionService();

/**
 * Export the class as default for DS services that do `new SessionService()`
 * (static session = new SessionService() pattern from original).
 * B05 will replace this class with the full implementation.
 */
export default SessionService;
