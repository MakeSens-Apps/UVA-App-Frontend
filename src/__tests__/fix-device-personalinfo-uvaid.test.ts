/**
 * Device bug (CRÍTICO, datos) — 2026-09-10 17:59, usuario 3000000002
 *
 * Guardar "Información personal" enviaba `uvaID: ''` y AppSync rechazaba:
 *   "Cannot return null for non-nullable type: 'ID' within parent 'UVA'
 *    (/updateUser/UVA/id)"
 * dejando al usuario SIN UVA (relación User→UVA borrada en local y en la nube).
 *
 * Causa: `UserDSService.updateUser` copiaba literalmente el original
 * (src/app/core/services/storage/datastore/user-ds.service.ts:37-45), que hace
 * `updated.uvaID = session.uvaID ?? ''`. En Ionic la sesión vive en UN store
 * (Capacitor Preferences) y `uvaID` siempre está tras el setup; en RN está
 * partida entre expo-secure-store (userID/phone) y AsyncStorage (uvaID,
 * racimoID, …) — session.ts:27 —, así que se puede estar autenticado y sin
 * `uvaID`, y entonces la asignación borraba la relación.
 *
 * Cubre:
 *   1. Sesión con / sin uvaID (pérdida asimétrica entre los dos stores).
 *   2. `updateUser` conserva `uvaID` cuando la sesión no lo tiene.
 *   3. `SetupService.ensureUvaID()` rehidrata la sesión desde el `User` local.
 */

/* eslint-disable import/first */

// ─── Stores en memoria (prefijo 'mock' — permitido en factories de jest.mock) ──

const mockAsyncStorage = new Map<string, string>();
const mockSecureStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (k: string, v: string) => {
    mockAsyncStorage.set(k, v);
  }),
  getItem: jest.fn(async (k: string) => mockAsyncStorage.get(k) ?? null),
  removeItem: jest.fn(async (k: string) => {
    mockAsyncStorage.delete(k);
  }),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecureStore.set(k, v);
  }),
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecureStore.delete(k);
  }),
}));

// ─── DataStore + modelos ──────────────────────────────────────────────────────

interface FakeUser {
  id: string;
  Name: string;
  LastName: string;
  Email?: string | null;
  uvaID?: string | null;
}

const mockQuery = jest.fn();
const mockSave = jest.fn(async (m: FakeUser) => m);

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    query: (...a: unknown[]) => mockQuery(...a),
    save: (...a: unknown[]) => mockSave(...(a as [FakeUser])),
  },
}));

jest.mock('@/data/models', () => ({
  User: {
    // Réplica del comportamiento de Amplify: clona y aplica el mutador.
    copyOf: (source: FakeUser, mutator: (d: FakeUser) => void) => {
      const draft = { ...source };
      mutator(draft);
      return draft;
    },
  },
  UVA: {},
}));

// Las APIs remotas no se tocan en estos tests, pero `setup.ts` las importa.
jest.mock('@/data/auth/auth', () => ({ authService: {} }));
jest.mock('@/data/api/user-api', () => ({ userAPIService: {} }));
jest.mock('@/data/api/user-progress-api', () => ({
  userProgressAPIService: {},
}));

import { sessionService } from '@/data/session/session';
import { UserDSService } from '@/data/datastore/user-ds';
import { SetupService } from '@/domain/setup/setup';

const USER_ID = '6448f468-3011-70a4-431d-d157237a1fa4';
const UVA_ID = 'UVA_ANT025_00001';

function baseUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: USER_ID,
    Name: 'María esperanza',
    LastName: 'Gil Calderón',
    Email: null,
    uvaID: UVA_ID,
    ...overrides,
  };
}

beforeEach(() => {
  mockAsyncStorage.clear();
  mockSecureStore.clear();
  mockQuery.mockReset();
  mockSave.mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1 — Sesión con / sin uvaID
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionService — uvaID a través de los dos stores', () => {
  it('con uvaID guardado, getInfo() lo devuelve junto al userID', async () => {
    await sessionService.setInfo({ userID: USER_ID, uvaID: UVA_ID });

    const info = await sessionService.getInfo();
    expect(info.userID).toBe(USER_ID);
    expect(info.uvaID).toBe(UVA_ID);
  });

  it('REGRESIÓN (pérdida asimétrica): userID sobrevive en SecureStore pero uvaID se pierde de AsyncStorage', async () => {
    await sessionService.setInfo({ userID: USER_ID, uvaID: UVA_ID });

    // Escenario real del device: AsyncStorage se vacía (RKStorage) y
    // expo-secure-store (SharedPreferences + Keystore) conserva sus claves.
    mockAsyncStorage.clear();

    const info = await sessionService.getInfo();
    expect(info.userID).toBe(USER_ID); // el auth gate sigue pasando…
    expect(info.uvaID).toBeUndefined(); // …pero uvaID ya no está
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 — updateUser conserva uvaID
// ─────────────────────────────────────────────────────────────────────────────

describe('UserDSService.updateUser — nunca borra la relación User→UVA', () => {
  it('REGRESIÓN: sesión SIN uvaID → conserva el uvaID del User local (no manda "")', async () => {
    await sessionService.setInfo({ userID: USER_ID }); // sin uvaID
    mockQuery.mockResolvedValue(baseUser());

    await UserDSService.updateUser({
      name: 'María esperanza r',
      lastName: 'Gil Calderón',
      email: undefined,
    });

    const saved = mockSave.mock.calls[0][0] as FakeUser;
    expect(saved.uvaID).toBe(UVA_ID);
    // '' era exactamente lo que provocaba el rechazo del backend
    expect(saved.uvaID).not.toBe('');
    expect(saved.Name).toBe('María esperanza r');
  });

  it('sesión CON uvaID → gana el de la sesión (paridad con el original)', async () => {
    await sessionService.setInfo({ userID: USER_ID, uvaID: UVA_ID });
    mockQuery.mockResolvedValue(baseUser({ uvaID: null }));

    await UserDSService.updateUser({ name: 'A', lastName: 'B' });

    // Además REPARA un uvaID local nulo (el estado en que quedó el device)
    expect((mockSave.mock.calls[0][0] as FakeUser).uvaID).toBe(UVA_ID);
  });

  it('sin uvaID por ningún lado → no inventa "" (deja el valor tal cual estaba)', async () => {
    await sessionService.setInfo({ userID: USER_ID });
    mockQuery.mockResolvedValue(baseUser({ uvaID: null }));

    await UserDSService.updateUser({ name: 'A', lastName: 'B' });

    const saved = mockSave.mock.calls[0][0] as FakeUser;
    expect(saved.uvaID).toBeNull();
    expect(saved.uvaID).not.toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 — ensureUvaID: reparación de la sesión
// ─────────────────────────────────────────────────────────────────────────────

describe('ensureSessionUvaID / SetupService.ensureUvaID — rehidratan la sesión desde el User local', () => {
  it('UserDSService.ensureSessionUvaID escribe el uvaID del User local en la sesión', async () => {
    await sessionService.setInfo({ userID: USER_ID });
    mockQuery.mockResolvedValue(baseUser());

    expect(await UserDSService.ensureSessionUvaID()).toBe(UVA_ID);
    expect((await sessionService.getInfo()).uvaID).toBe(UVA_ID);
  });

  it('sesión sin uvaID + User local con uvaID → lo persiste en la sesión', async () => {
    await sessionService.setInfo({ userID: USER_ID });
    mockQuery.mockResolvedValue(baseUser());

    const result = await SetupService.ensureUvaID();

    expect(result).toBe(UVA_ID);
    expect((await sessionService.getInfo()).uvaID).toBe(UVA_ID);
  });

  it('sesión ya con uvaID → no consulta DataStore', async () => {
    await sessionService.setInfo({ userID: USER_ID, uvaID: UVA_ID });

    const result = await SetupService.ensureUvaID();

    expect(result).toBe(UVA_ID);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('usuario sin UVA asignada → devuelve undefined y no escribe nada', async () => {
    await sessionService.setInfo({ userID: USER_ID });
    mockQuery.mockResolvedValue(baseUser({ uvaID: null }));

    expect(await SetupService.ensureUvaID()).toBeUndefined();
    expect((await sessionService.getInfo()).uvaID).toBeUndefined();
  });

  it('DataStore no disponible (offline) → no propaga el error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await sessionService.setInfo({ userID: USER_ID });
    mockQuery.mockRejectedValue(new Error('DataStore not started'));

    await expect(SetupService.ensureUvaID()).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});
