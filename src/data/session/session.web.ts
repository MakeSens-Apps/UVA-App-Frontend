/**
 * Web shim for SessionService (platform=web)
 *
 * expo-secure-store does NOT work on web (its native module exports {}
 * and throws "getValueWithKeyAsync is not a function" on all calls).
 *
 * On web all session keys — including the sensitive ones (userID, phone) —
 * are stored in AsyncStorage (backed by localStorage on web).
 * This is acceptable for the visual-validation / pixel-perfect use case.
 *
 * IMPORTANT: This file is ONLY bundled when platform=web. Native (Android/iOS)
 * always uses session.ts (with SecureStore). No native code-path is altered.
 *
 * Metro web resolution: Metro resolves `session.web.ts` before `session.ts`
 * when bundling for the web platform.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, sessionKeys } from '@/data/models/session.model';

/** Prefix for AsyncStorage keys — identical to native implementation (R-09). */
const SESSION_PREFIX = 'session_';

function storageKey(key: keyof Session): string {
  return SESSION_PREFIX + (key as string);
}

class SessionService {
  async setInfo(userInfo: Session): Promise<void> {
    for (const key of Object.keys(userInfo)) {
      const value = userInfo[key as keyof Session];
      if (value) {
        await AsyncStorage.setItem(storageKey(key as keyof Session), value);
      }
    }
  }

  async getInfo(): Promise<Session> {
    const session: Session = {};
    for (const key of sessionKeys) {
      const value = await AsyncStorage.getItem(storageKey(key));
      if (value) {
        session[key] = value;
      }
    }
    return session;
  }

  async setInfoField(
    key: keyof Session,
    value: string | undefined,
  ): Promise<void> {
    if (value !== undefined) {
      await AsyncStorage.setItem(storageKey(key), value);
    } else {
      await AsyncStorage.removeItem(storageKey(key));
    }
  }

  clearSession(): void {
    void this.clear();
  }

  async clear(): Promise<void> {
    for (const key of sessionKeys) {
      await AsyncStorage.removeItem(storageKey(key));
    }
  }
}

export const sessionService = new SessionService();
export default SessionService;
