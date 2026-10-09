/**
 * B05 Gate — SessionService tests
 * Gate criteria:
 *   1. round-trip: setInfo + getInfo recovers all sessionKeys
 *   2. clear() removes all sessionKeys without leaving orphans
 *   3. clearSession() is a synchronous shim for clear()
 *   4. setInfoField(key, undefined) removes the key
 *   5. setInfoField(key, value) stores the value
 *   6. Sensitive keys (userID, phone) go to SecureStore; rest to AsyncStorage
 *
 * Note: jest.mock factories cannot reference out-of-scope variables.
 *       We use module-level maps prefixed with 'mock' (Jest allowlist).
 */

/* eslint-disable import/first */
// In-memory stores — 'mock' prefix is allowed in jest.mock() factories
const mockAsyncStorage = new Map<string, string>();
const mockSecureStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import SessionService, { sessionService } from '@/data/session/session';
import { sessionKeys } from '@/data/models/session.model';
import type { Session } from '@/data/models/session.model';

function bindMocks() {
  (AsyncStorage.setItem as jest.Mock).mockImplementation(
    async (key: string, value: string) => {
      mockAsyncStorage.set(key, value);
    },
  );
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => {
      return mockAsyncStorage.get(key) ?? null;
    },
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(
    async (key: string) => {
      mockAsyncStorage.delete(key);
    },
  );
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(
    async (key: string, value: string) => {
      mockSecureStore.set(key, value);
    },
  );
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(
    async (key: string) => {
      return mockSecureStore.get(key) ?? null;
    },
  );
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(
    async (key: string) => {
      mockSecureStore.delete(key);
    },
  );
}

beforeEach(() => {
  mockAsyncStorage.clear();
  mockSecureStore.clear();
  jest.clearAllMocks();
  bindMocks();
});

describe('B05 — SessionService', () => {
  const fullSession: Session = {
    userID: 'user-123',
    name: 'Juan',
    lastName: 'García',
    phone: '3001234567',
    racimoID: 'racimo-abc',
    uvaID: 'uva-xyz',
    racimoName: 'Mi Racimo',
    racimoLinkCode: 'LINK01',
    racimoConfiguration: '{"test":true}',
  };

  describe('setInfo + getInfo round-trip', () => {
    it('recovers all sessionKeys after setInfo', async () => {
      const svc = new SessionService();
      await svc.setInfo(fullSession);
      const recovered = await svc.getInfo();

      for (const key of sessionKeys) {
        expect(recovered[key]).toBe(fullSession[key]);
      }
    });

    it('sensitive keys (userID, phone) are stored in SecureStore', async () => {
      const svc = new SessionService();
      await svc.setInfo(fullSession);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_userID',
        fullSession.userID,
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_phone',
        fullSession.phone,
      );
    });

    it('non-sensitive keys are stored in AsyncStorage', async () => {
      const svc = new SessionService();
      await svc.setInfo(fullSession);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'session_name',
        fullSession.name,
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'session_racimoLinkCode',
        fullSession.racimoLinkCode,
      );
    });

    it('returns empty session when no data stored', async () => {
      const svc = new SessionService();
      const session = await svc.getInfo();
      expect(session).toEqual({});
    });

    it('partial setInfo only stores defined fields', async () => {
      const svc = new SessionService();
      await svc.setInfo({ name: 'Ana', racimoLinkCode: 'CODE01' });
      const recovered = await svc.getInfo();

      expect(recovered.name).toBe('Ana');
      expect(recovered.racimoLinkCode).toBe('CODE01');
      expect(recovered.userID).toBeUndefined();
      expect(recovered.phone).toBeUndefined();
    });
  });

  describe('setInfoField', () => {
    it('stores a value for a given key', async () => {
      const svc = new SessionService();
      await svc.setInfoField('racimoName', 'NuevoRacimo');
      const session = await svc.getInfo();
      expect(session.racimoName).toBe('NuevoRacimo');
    });

    it('removes the key when value is undefined', async () => {
      const svc = new SessionService();
      await svc.setInfoField('racimoName', 'ToDelete');
      await svc.setInfoField('racimoName', undefined);
      const session = await svc.getInfo();
      expect(session.racimoName).toBeUndefined();
    });

    it('stores sensitive key in SecureStore', async () => {
      const svc = new SessionService();
      await svc.setInfoField('userID', 'u-999');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_userID',
        'u-999',
      );
    });

    it('removes sensitive key from SecureStore when undefined', async () => {
      const svc = new SessionService();
      await svc.setInfoField('userID', 'u-999');
      await svc.setInfoField('userID', undefined);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'session_userID',
      );
    });
  });

  describe('clear() — R-37 key-by-key removal', () => {
    it('removes ALL sessionKeys after being set', async () => {
      const svc = new SessionService();
      await svc.setInfo(fullSession);

      // Verify data is present before clear
      const before = await svc.getInfo();
      expect(before.name).toBe(fullSession.name);

      await svc.clear();

      const after = await svc.getInfo();
      expect(after).toEqual({});
    });

    it('does NOT leave orphaned keys in AsyncStorage after clear', async () => {
      const svc = new SessionService();
      await svc.setInfo(fullSession);
      await svc.clear();

      // Check all session_ prefixed keys are gone from the in-memory AsyncStorage map
      for (const key of mockAsyncStorage.keys()) {
        expect(key.startsWith('session_')).toBe(false);
      }
    });

    it('does NOT leave orphaned keys in SecureStore after clear', async () => {
      const svc = new SessionService();
      await svc.setInfo(fullSession);
      await svc.clear();

      expect(mockSecureStore.size).toBe(0);
    });

    it('clearSession() does not throw synchronously', () => {
      const svc = new SessionService();
      expect(() => svc.clearSession()).not.toThrow();
    });

    it('singleton sessionService.clear() works', async () => {
      await sessionService.setInfo({ name: 'Test', phone: '3000000000' });
      await sessionService.clear();
      const session = await sessionService.getInfo();
      expect(session).toEqual({});
    });
  });

  describe('sessionKeys completeness', () => {
    it('sessionKeys contains all 9 expected keys', () => {
      expect(sessionKeys).toHaveLength(9);
      expect(sessionKeys).toContain('userID');
      expect(sessionKeys).toContain('name');
      expect(sessionKeys).toContain('lastName');
      expect(sessionKeys).toContain('phone');
      expect(sessionKeys).toContain('racimoID');
      expect(sessionKeys).toContain('uvaID');
      expect(sessionKeys).toContain('racimoName');
      expect(sessionKeys).toContain('racimoLinkCode');
      expect(sessionKeys).toContain('racimoConfiguration');
    });
  });
});
