/**
 * F4-06 (#61) — RACIMO desactivado: regla de ADR-005 para el RACIMO, estado combinado de la
 * estación, prioridad del bloqueo, aviso de reactivación, errores de AppSync y vinculación
 * por código. Las funciones de dominio son puras; el servicio se prueba con almacenamiento en
 * memoria. Todos los datos son sintéticos.
 */

import {
  canProposeStreakRecovery,
  getEffectiveRacimoStatus,
  getStationStatus,
  isRacimoClosedToNewParticipants,
  LOCK_REASON_PRIORITY,
  resolveRegistrationLock,
  shouldPauseReminders,
} from '@/domain/registration-lock/registration-lock';
import type {
  RacimoStatus,
  UvaStatus,
} from '@/domain/registration-lock/registration-lock';
import {
  getGraphQLErrorType,
  handleGraphQLError,
  RACIMO_INACTIVE_ERROR_TYPE,
} from '@/data/api/errors-handle/errors';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockStorage = new Map<string, string>();
jest.mock('@/data/storage/preferences', () => ({
  Preferences: {
    get: jest.fn(({ key }: { key: string }) =>
      Promise.resolve({ value: mockStorage.get(key) ?? null }),
    ),
    set: jest.fn(({ key, value }: { key: string; value: string }) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    remove: jest.fn(({ key }: { key: string }) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
  },
}));

const mockSession: { uvaID?: string; userID?: string; racimoID?: string } = {};
const mockSetInfoField = jest.fn((..._a: unknown[]) => Promise.resolve());
jest.mock('@/data/session/session', () => ({
  sessionService: {
    getInfo: jest.fn(() => Promise.resolve({ ...mockSession })),
    setInfoField: (...a: unknown[]) => mockSetInfoField(...a),
  },
}));

type UvaRow = { id: string; racimoID?: string; enabled?: boolean | null };
const mockUvas = new Map<string, UvaRow>();
const mockGetUVA = jest.fn((id: string) => Promise.resolve(mockUvas.get(id)));
jest.mock('@/data/datastore/uva-ds', () => ({
  UvaDSService: { getUVA: (id: string) => mockGetUVA(id) },
}));

type RacimoRow = { id: string; Name?: string | null; enabled?: boolean | null };
const mockRacimos = new Map<string, RacimoRow>();
const mockGetRACIMODS = jest.fn((id: string) =>
  Promise.resolve(mockRacimos.get(id)),
);
jest.mock('@/data/datastore/racimo-ds', () => ({
  RacimoDSService: { getRACIMO: (id: string) => mockGetRACIMODS(id) },
}));

jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: { ensureSessionUvaID: jest.fn(() => Promise.resolve()) },
}));

jest.mock('@/native/notifications/LocalRemindersService', () => {
  const reminders = {
    setRemindersPaused: jest.fn(),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    getEnableNotifications: jest.fn(() => Promise.resolve(true)),
    scheduleDailyNotifications: jest.fn(() => Promise.resolve()),
  };
  return { localRemindersService: reminders };
});
const mockReminders = (
  jest.requireMock('@/native/notifications/LocalRemindersService') as {
    localRemindersService: {
      setRemindersPaused: jest.Mock;
      cancelAllNotifications: jest.Mock;
      getEnableNotifications: jest.Mock;
      scheduleDailyNotifications: jest.Mock;
    };
  }
).localRemindersService;

jest.mock('@/native/device/appVersion', () => ({
  getInstalledAppVersion: () => '2.3.1',
}));

jest.mock('@/data/storage/s3', () => ({
  s3Service: { getFile: jest.fn() },
}));

// API: the real uvaAPIService over a mocked Amplify client, and a mocked RACIMO API.
const mockGraphql = jest.fn();
jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: (...a: unknown[]) => mockGraphql(...a),
  }),
}));

const mockListRACIMOS = jest.fn();
const mockGetRACIMOAPI = jest.fn();
jest.mock('@/data/api/racimo-api', () => ({
  racimoAPIService: {
    listRACIMOS: (...a: unknown[]) => mockListRACIMOS(...a),
    getRACIMO: (...a: unknown[]) => mockGetRACIMOAPI(...a),
  },
}));

// eslint-disable-next-line import/first
import { RegistrationLockService } from '@/data/registration-lock/registration-lock-service';
// eslint-disable-next-line import/first
import { VERSION_POLICY_CACHE_KEY } from '@/data/registration-lock/version-policy';
// eslint-disable-next-line import/first
import { UVA_STATUS_STORE_KEY } from '@/data/registration-lock/uva-status-store';
// eslint-disable-next-line import/first
import { SetupRacimoService } from '@/domain/setup/setup-racimo';
// eslint-disable-next-line import/first
import { uvaAPIService } from '@/data/api/uva-api';

const NOW = new Date('2026-10-15T15:00:00Z');
const UVA_ID = 'UVA_ABC123_00001';
const RACIMO_ID = 'racimo-test-1';
const OTHER_RACIMO_ID = 'racimo-test-2';
const RACIMO_NAME = 'Prueba sintética';

function setUva(enabled: boolean | null, racimoID: string = RACIMO_ID): void {
  mockUvas.set(UVA_ID, { id: UVA_ID, racimoID, enabled });
}

function setRacimo(
  enabled: boolean | null,
  name: string | null = RACIMO_NAME,
  id: string = RACIMO_ID,
): void {
  mockRacimos.set(id, { id, Name: name, enabled });
}

function silenceConsoleError(): jest.SpyInstance {
  return jest.spyOn(console, 'error').mockImplementation(() => undefined);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  mockUvas.clear();
  mockRacimos.clear();
  mockSession.uvaID = UVA_ID;
  mockSession.userID = 'user-test-1';
  mockSession.racimoID = RACIMO_ID;
});

// ─── Domain ──────────────────────────────────────────────────────────────────

describe('getEffectiveRacimoStatus (ADR-005: enabled !== false es activo)', () => {
  it('enabled true, null o sin el campo cuenta como activo (sin fecha de corte)', () => {
    expect(getEffectiveRacimoStatus({ enabled: true })).toBe('active');
    expect(getEffectiveRacimoStatus({ enabled: null })).toBe('active');
    expect(getEffectiveRacimoStatus({ enabled: undefined })).toBe('active');
    expect(getEffectiveRacimoStatus({})).toBe('active');
  });

  it('enabled false es inactivo', () => {
    expect(getEffectiveRacimoStatus({ enabled: false })).toBe('inactive');
  });

  it('un RACIMO que aún no está en el teléfono es desconocido', () => {
    expect(getEffectiveRacimoStatus(undefined)).toBe('unknown');
    expect(getEffectiveRacimoStatus(null)).toBe('unknown');
  });

  it('solo un RACIMO conocido e inactivo rechaza nuevos participantes', () => {
    expect(isRacimoClosedToNewParticipants({ enabled: false })).toBe(true);
    expect(isRacimoClosedToNewParticipants({ enabled: true })).toBe(false);
    expect(isRacimoClosedToNewParticipants({ enabled: null })).toBe(false);
    expect(isRacimoClosedToNewParticipants({})).toBe(false);
    expect(isRacimoClosedToNewParticipants(undefined)).toBe(false);
    expect(isRacimoClosedToNewParticipants(null)).toBe(false);
  });
});

describe('getStationStatus (UVA + RACIMO)', () => {
  const table: [UvaStatus, RacimoStatus, UvaStatus][] = [
    ['enabled', 'active', 'enabled'],
    ['enabled', 'inactive', 'disabled'],
    ['enabled', 'unknown', 'unknown'],
    ['disabled', 'active', 'disabled'],
    ['disabled', 'inactive', 'disabled'],
    ['disabled', 'unknown', 'disabled'],
    ['unknown', 'active', 'unknown'],
    ['unknown', 'inactive', 'disabled'],
    ['unknown', 'unknown', 'unknown'],
  ];

  it.each(table)('UVA %s + RACIMO %s → %s', (uva, racimo, expected) => {
    expect(getStationStatus(uva, racimo)).toBe(expected);
  });

  it('un RACIMO inactivo oculta la recuperación de racha como una UVA deshabilitada', () => {
    expect(
      canProposeStreakRecovery(getStationStatus('enabled', 'inactive')),
    ).toBe(false);
    expect(
      canProposeStreakRecovery(getStationStatus('enabled', 'active')),
    ).toBe(true);
    expect(
      canProposeStreakRecovery(getStationStatus('enabled', 'unknown')),
    ).toBe(true);
  });
});

describe('resolveRegistrationLock con el RACIMO', () => {
  it('el orden de prioridad es RACIMO inactivo, UVA deshabilitada, actualización', () => {
    expect(LOCK_REASON_PRIORITY).toEqual([
      'racimo-inactive',
      'uva-disabled',
      'update-required',
    ]);
  });

  it('RACIMO inactivo va antes que UVA deshabilitada y que la actualización', () => {
    expect(
      resolveRegistrationLock({
        racimoStatus: 'inactive',
        uvaStatus: 'disabled',
        updateRequired: true,
      }),
    ).toBe('racimo-inactive');
    expect(
      resolveRegistrationLock({
        racimoStatus: 'inactive',
        uvaStatus: 'enabled',
        updateRequired: false,
      }),
    ).toBe('racimo-inactive');
    expect(
      resolveRegistrationLock({
        racimoStatus: 'inactive',
        uvaStatus: 'unknown',
        updateRequired: false,
      }),
    ).toBe('racimo-inactive');
  });

  it('UVA deshabilitada va antes que la actualización con el RACIMO activo', () => {
    expect(
      resolveRegistrationLock({
        racimoStatus: 'active',
        uvaStatus: 'disabled',
        updateRequired: true,
      }),
    ).toBe('uva-disabled');
    expect(
      resolveRegistrationLock({
        racimoStatus: 'active',
        uvaStatus: 'enabled',
        updateRequired: true,
      }),
    ).toBe('update-required');
  });

  it('un RACIMO desconocido (o sin evaluar) nunca bloquea', () => {
    expect(
      resolveRegistrationLock({
        racimoStatus: 'unknown',
        uvaStatus: 'enabled',
        updateRequired: false,
      }),
    ).toBeNull();
    expect(
      resolveRegistrationLock({ uvaStatus: 'enabled', updateRequired: false }),
    ).toBeNull();
    expect(
      resolveRegistrationLock({
        racimoStatus: 'unknown',
        uvaStatus: 'disabled',
        updateRequired: false,
      }),
    ).toBe('uva-disabled');
  });

  it('el RACIMO inactivo pausa los recordatorios', () => {
    expect(shouldPauseReminders('racimo-inactive')).toBe(true);
  });
});

// ─── Service ─────────────────────────────────────────────────────────────────

describe('RegistrationLockService con el RACIMO', () => {
  let service: RegistrationLockService;

  beforeEach(() => {
    service = new RegistrationLockService();
  });

  it('RACIMO inactivo: bloquea con su nombre sincronizado y pausa los recordatorios', async () => {
    setUva(true);
    setRacimo(false);
    const state = await service.evaluate(NOW);
    expect(state).toEqual({
      uvaId: UVA_ID,
      uvaStatus: 'enabled',
      racimoId: RACIMO_ID,
      racimoStatus: 'inactive',
      racimoName: RACIMO_NAME,
      stationStatus: 'disabled',
      reason: 'racimo-inactive',
      reactivationPending: false,
    });
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(true);
    expect(mockReminders.cancelAllNotifications).toHaveBeenCalledTimes(1);
    expect(mockReminders.scheduleDailyNotifications).not.toHaveBeenCalled();
  });

  it('un RACIMO renombrado desde el dashboard muestra el nombre nuevo', async () => {
    setUva(true);
    setRacimo(false);
    expect((await service.evaluate(NOW)).racimoName).toBe(RACIMO_NAME);

    setRacimo(false, '  Prueba sintética renombrada  ');
    const state = await service.evaluate(NOW);
    expect(state.reason).toBe('racimo-inactive');
    expect(state.racimoName).toBe('Prueba sintética renombrada');
  });

  it('un nombre vacío se reporta como null', async () => {
    setUva(true);
    setRacimo(false, '   ');
    expect((await service.evaluate(NOW)).racimoName).toBeNull();
  });

  it('el racimoID sale de la UVA, no de la sesión', async () => {
    setUva(true, OTHER_RACIMO_ID);
    setRacimo(true); // the session one is active…
    setRacimo(false, 'Otro RACIMO sintético', OTHER_RACIMO_ID); // …the UVA's is not
    const state = await service.evaluate(NOW);
    expect(mockGetRACIMODS).toHaveBeenCalledWith(OTHER_RACIMO_ID);
    expect(mockGetRACIMODS).not.toHaveBeenCalledWith(RACIMO_ID);
    expect(state.racimoId).toBe(OTHER_RACIMO_ID);
    expect(state.racimoName).toBe('Otro RACIMO sintético');
    expect(state.reason).toBe('racimo-inactive');
  });

  it('sin la UVA en el teléfono usa el racimoID de la sesión', async () => {
    setRacimo(false);
    const state = await service.evaluate(NOW);
    expect(mockGetRACIMODS).toHaveBeenCalledWith(RACIMO_ID);
    expect(state.uvaStatus).toBe('unknown');
    expect(state.racimoId).toBe(RACIMO_ID);
    expect(state.stationStatus).toBe('disabled');
    expect(state.reason).toBe('racimo-inactive');
  });

  it('sin racimoID en ninguna parte: RACIMO desconocido y sin bloqueo', async () => {
    mockSession.racimoID = undefined;
    mockUvas.set(UVA_ID, { id: UVA_ID, enabled: true });
    const state = await service.evaluate(NOW);
    expect(mockGetRACIMODS).not.toHaveBeenCalled();
    expect(state.racimoId).toBeNull();
    expect(state.racimoStatus).toBe('unknown');
    expect(state.stationStatus).toBe('unknown');
    expect(state.reason).toBeNull();
  });

  it('RACIMO inactivo + UVA deshabilitada + actualización: un solo aviso, el del RACIMO', async () => {
    mockStorage.set(VERSION_POLICY_CACHE_KEY, '99.0.0');
    setUva(false);
    setRacimo(false);
    const state = await service.evaluate(NOW);
    expect(state.reason).toBe('racimo-inactive');
    expect(state.stationStatus).toBe('disabled');
  });

  it('reactivación del RACIMO con la UVA habilitada: aviso una sola vez', async () => {
    setUva(true);
    setRacimo(false);
    // First open with the RACIMO inactive: remembered, no notice.
    let state = await service.evaluate(NOW);
    expect(state.reactivationPending).toBe(false);

    setRacimo(true);
    state = await service.evaluate(NOW);
    expect(state.reason).toBeNull();
    expect(state.stationStatus).toBe('enabled');
    expect(state.reactivationPending).toBe(true);
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(false);
    expect(mockReminders.scheduleDailyNotifications).toHaveBeenCalledTimes(1);

    await service.consumeReactivationNotice(UVA_ID);
    state = await service.evaluate(NOW);
    expect(state.reactivationPending).toBe(false);
    state = await service.evaluate(NOW);
    expect(state.reactivationPending).toBe(false);
  });

  it('RACIMO reactivado con la UVA aún deshabilitada: sigue el aviso de la UVA, sin reactivación', async () => {
    setUva(false);
    setRacimo(false);
    expect((await service.evaluate(NOW)).reason).toBe('racimo-inactive');

    setRacimo(true);
    const state = await service.evaluate(NOW);
    expect(state.reason).toBe('uva-disabled');
    expect(state.stationStatus).toBe('disabled');
    expect(state.reactivationPending).toBe(false);
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(true);
    expect(mockReminders.scheduleDailyNotifications).not.toHaveBeenCalled();
  });

  it('tras un reinicio de datos la UVA llega antes que su RACIMO: no hay reactivación falsa', async () => {
    setUva(true);
    setRacimo(false);
    await service.evaluate(NOW);
    expect(mockStorage.has(UVA_STATUS_STORE_KEY)).toBe(true);

    // DataStore was wiped (the per-UVA memory in storage stays) and the UVA synced first.
    mockRacimos.clear();
    const fresh = new RegistrationLockService();
    let state = await fresh.evaluate(NOW);
    expect(state.racimoStatus).toBe('unknown');
    expect(state.stationStatus).toBe('unknown');
    expect(state.reason).toBeNull();
    expect(state.reactivationPending).toBe(false);

    // The RACIMO arrives, still inactive: locked again, never announced as reactivated.
    setRacimo(false);
    state = await fresh.evaluate(NOW);
    expect(state.reason).toBe('racimo-inactive');
    expect(state.reactivationPending).toBe(false);
  });

  it('un error leyendo el RACIMO mantiene el último estado inactivo y no anuncia reactivación', async () => {
    setUva(true);
    setRacimo(false);
    await service.evaluate(NOW);

    mockGetRACIMODS.mockRejectedValueOnce(new Error('boom'));
    const spy = silenceConsoleError();
    const state = await service.evaluate(NOW);
    spy.mockRestore();
    expect(state.reason).toBe('racimo-inactive');
    expect(state.racimoStatus).toBe('inactive');
    expect(state.racimoName).toBe(RACIMO_NAME);
    expect(state.reactivationPending).toBe(false);
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(true);
    expect(mockReminders.scheduleDailyNotifications).not.toHaveBeenCalled();
  });

  it('un error leyendo el RACIMO en una sesión nueva mantiene el bloqueo recordado y no anuncia una reactivación', async () => {
    setUva(true);
    setRacimo(false);
    await service.evaluate(NOW);

    // Same UVA remembered as disabled; the next app session cannot read the RACIMO.
    const fresh = new RegistrationLockService();
    mockGetRACIMODS.mockRejectedValueOnce(new Error('boom'));
    const spy = silenceConsoleError();
    let state = await fresh.evaluate(NOW);
    spy.mockRestore();
    expect(state.racimoStatus).toBe('inactive');
    expect(state.racimoName).toBe(RACIMO_NAME);
    expect(state.reason).toBe('racimo-inactive');
    expect(state.reactivationPending).toBe(false);
    expect(mockReminders.scheduleDailyNotifications).not.toHaveBeenCalled();

    // The read works again and the RACIMO is still inactive: no notice.
    state = await fresh.evaluate(NOW);
    expect(state.reason).toBe('racimo-inactive');
    expect(state.reactivationPending).toBe(false);
  });

  it('al cerrar sesión olvida el último RACIMO visto', async () => {
    setUva(true);
    setRacimo(false);
    await service.evaluate(NOW);
    await service.clearForSignOut();
    expect(mockStorage.has(UVA_STATUS_STORE_KEY)).toBe(false);

    mockGetRACIMODS.mockRejectedValueOnce(new Error('boom'));
    const spy = silenceConsoleError();
    const state = await service.evaluate(NOW);
    spy.mockRestore();
    expect(state.racimoStatus).toBe('unknown');
    expect(state.racimoName).toBeNull();
  });

  it('un error leyendo la UVA en una sesión nueva usa el estado propio de la UVA, no el de la estación', async () => {
    // Session 1: UVA enabled, RACIMO inactive → the station is remembered as disabled.
    setUva(true);
    setRacimo(false);
    await service.evaluate(NOW);

    // The dashboard reactivates the RACIMO; the next app session cannot read the UVA once.
    setRacimo(true);
    const fresh = new RegistrationLockService();
    mockGetUVA.mockRejectedValueOnce(new Error('boom'));
    const spy = silenceConsoleError();
    const state = await fresh.evaluate(NOW);
    spy.mockRestore();
    expect(state.uvaStatus).toBe('enabled');
    expect(state.racimoStatus).toBe('active');
    expect(state.reason).toBeNull();
  });

  it('un registro de #60 (sin campos del RACIMO) sigue sirviendo para un error de lectura de la UVA', async () => {
    mockStorage.set(
      UVA_STATUS_STORE_KEY,
      JSON.stringify({ [UVA_ID]: { lastStatus: 'disabled' } }),
    );
    setRacimo(true);
    mockGetUVA.mockRejectedValueOnce(new Error('boom'));
    const spy = silenceConsoleError();
    const state = await service.evaluate(NOW);
    spy.mockRestore();
    expect(state.uvaStatus).toBe('disabled');
    expect(state.reason).toBe('uva-disabled');
  });
});

// ─── AppSync errors ──────────────────────────────────────────────────────────

describe('getGraphQLErrorType / handleGraphQLError', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = silenceConsoleError();
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('lee el errorType de la respuesta que Amplify lanza', () => {
    expect(
      getGraphQLErrorType({
        data: { createUVA: null },
        errors: [{ errorType: 'RacimoInactive', message: 'RACIMO sintético' }],
      }),
    ).toBe('RacimoInactive');
  });

  it('lee el primer errorType de una lista de errores', () => {
    expect(
      getGraphQLErrorType([
        { message: 'sin tipo' },
        { errorType: '' },
        { errorType: 'RacimoInactive' },
        { errorType: 'Unauthorized' },
      ]),
    ).toBe('RacimoInactive');
  });

  it('no inventa un tipo para un Error ni para basura', () => {
    expect(getGraphQLErrorType(new Error('boom'))).toBeUndefined();
    for (const garbage of [
      null,
      undefined,
      'RacimoInactive',
      42,
      {},
      { errors: 'RacimoInactive' },
      { errors: [null, 1, 'x', { errorType: 7 }] },
      [],
    ]) {
      expect(getGraphQLErrorType(garbage)).toBeUndefined();
    }
  });

  it('handleGraphQLError conserva el errorType como name', () => {
    expect(
      handleGraphQLError({
        data: null,
        errors: [{ errorType: 'RacimoInactive', message: 'x' }],
      }),
    ).toEqual({
      name: 'RacimoInactive',
      mensage: 'unknown error',
      type: 'unknown',
    });
    expect(handleGraphQLError([{ errorType: 'RacimoInactive' }]).name).toBe(
      'RacimoInactive',
    );
  });

  it('sin errorType se comporta como handleAPIError', () => {
    expect(handleGraphQLError(new Error('boom'))).toEqual({
      name: 'unexpecteError',
      mensage: 'boom',
      type: 'unknown',
    });
    expect(handleGraphQLError('boom')).toEqual({
      name: 'unknownerror',
      mensage: 'unknown error',
      type: 'unknown',
    });
  });
});

// ─── Linking by code and UVA creation ────────────────────────────────────────

describe('SetupRacimoService.getRACIMOByCode con el RACIMO', () => {
  function listResponse(enabled: boolean | null | undefined) {
    return {
      success: true,
      data: {
        listRACIMOS: {
          items: [
            {
              id: RACIMO_ID,
              Name: RACIMO_NAME,
              LinkageCode: 'ABC123',
              enabled,
            },
          ],
        },
      },
    };
  }

  beforeEach(() => {
    mockGetRACIMOAPI.mockResolvedValue({
      success: true,
      data: {
        getRACIMO: {
          id: RACIMO_ID,
          Name: RACIMO_NAME,
          LinkageCode: 'ABC123',
          Configuration: '{}',
        },
      },
    });
  });

  it("RACIMO inactivo: devuelve 'inactive' y no escribe nada en la sesión", async () => {
    mockListRACIMOS.mockResolvedValueOnce(listResponse(false));
    await expect(SetupRacimoService.getRACIMOByCode('ABC123')).resolves.toBe(
      'inactive',
    );
    expect(mockListRACIMOS).toHaveBeenCalledWith({
      filter: { LinkageCode: { eq: 'ABC123' } },
    });
    expect(mockSetInfoField).not.toHaveBeenCalled();
    expect(mockGetRACIMOAPI).not.toHaveBeenCalled();
  });

  it.each([
    ['true', true],
    ['null', null],
    ['sin el campo', undefined],
  ])(
    "enabled %s: devuelve 'found' y guarda el RACIMO en la sesión",
    async (_label, enabled) => {
      mockListRACIMOS.mockResolvedValueOnce(listResponse(enabled));
      await expect(SetupRacimoService.getRACIMOByCode('ABC123')).resolves.toBe(
        'found',
      );
      expect(mockSetInfoField).toHaveBeenCalledWith('racimoID', RACIMO_ID);
      expect(mockSetInfoField).toHaveBeenCalledWith('racimoName', RACIMO_NAME);
      expect(mockSetInfoField).toHaveBeenCalledWith('racimoLinkCode', 'ABC123');
    },
  );

  it("si no se pueden leer los datos del RACIMO devuelve 'not-found'", async () => {
    mockListRACIMOS.mockResolvedValueOnce(listResponse(true));
    mockGetRACIMOAPI.mockResolvedValueOnce({ success: false });
    await expect(SetupRacimoService.getRACIMOByCode('ABC123')).resolves.toBe(
      'not-found',
    );
  });
});

describe('SetupRacimoService.createNewUVA con el RACIMO', () => {
  let getUVAByRACIMO: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = silenceConsoleError();
    getUVAByRACIMO = jest
      .spyOn(uvaAPIService, 'getUVAByRACIMO')
      .mockResolvedValue({
        success: true,
        data: { UVAsByRacimoID: { items: [] } },
      } as never);
    mockGetRACIMOAPI.mockResolvedValue({
      success: true,
      data: { getRACIMO: { LinkageCode: 'ABC123' } },
    });
  });

  afterEach(() => {
    getUVAByRACIMO.mockRestore();
    consoleSpy.mockRestore();
  });

  it("createUVA rechazado con RacimoInactive → 'racimo-inactive' y no guarda la UVA", async () => {
    const createUVA = jest
      .spyOn(uvaAPIService, 'createUVA')
      .mockResolvedValueOnce({
        success: false,
        error: { name: RACIMO_INACTIVE_ERROR_TYPE },
      });
    await expect(SetupRacimoService.createNewUVA()).resolves.toBe(
      'racimo-inactive',
    );
    expect(RACIMO_INACTIVE_ERROR_TYPE).toBe('RacimoInactive');
    expect(createUVA).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'UVA_ABC123_00000',
        racimoID: RACIMO_ID,
        enabled: true,
      }),
    );
    expect(mockSetInfoField).not.toHaveBeenCalledWith(
      'uvaID',
      expect.anything(),
    );
    // Nothing was created: the RACIMO written when its code was accepted is forgotten.
    for (const key of [
      'racimoID',
      'racimoName',
      'racimoLinkCode',
      'racimoConfiguration',
    ]) {
      expect(mockSetInfoField).toHaveBeenCalledWith(key, undefined);
    }
    createUVA.mockRestore();
  });

  it("otro error de createUVA → 'failed'", async () => {
    const createUVA = jest
      .spyOn(uvaAPIService, 'createUVA')
      .mockResolvedValueOnce({
        success: false,
        error: { name: 'Unauthorized' },
      });
    await expect(SetupRacimoService.createNewUVA()).resolves.toBe('failed');
    createUVA.mockRestore();
  });

  it("de punta a punta: AppSync lanza { data, errors: [RacimoInactive] } → 'racimo-inactive'", async () => {
    mockGraphql.mockRejectedValueOnce({
      data: { createUVA: null },
      errors: [
        { errorType: 'RacimoInactive', message: 'RACIMO sintético inactivo' },
      ],
    });
    await expect(SetupRacimoService.createNewUVA()).resolves.toBe(
      'racimo-inactive',
    );
    expect(mockSetInfoField).not.toHaveBeenCalledWith(
      'uvaID',
      expect.anything(),
    );
  });

  it("de punta a punta: AppSync resuelve con errors [RacimoInactive] → 'racimo-inactive'", async () => {
    mockGraphql.mockResolvedValueOnce({
      data: { createUVA: null },
      errors: [{ errorType: 'RacimoInactive', message: 'x' }],
    });
    await expect(SetupRacimoService.createNewUVA()).resolves.toBe(
      'racimo-inactive',
    );
  });

  it("de punta a punta: un error de red sigue siendo 'failed'", async () => {
    mockGraphql.mockRejectedValueOnce(new Error('Network error'));
    await expect(SetupRacimoService.createNewUVA()).resolves.toBe('failed');
  });

  it("de punta a punta: creada → 'created' y guarda la UVA en la sesión", async () => {
    mockGraphql.mockResolvedValueOnce({
      data: { createUVA: { id: 'UVA_ABC123_00000' } },
    });
    await expect(SetupRacimoService.createNewUVA()).resolves.toBe('created');
    expect(mockSetInfoField).toHaveBeenCalledWith('uvaID', 'UVA_ABC123_00000');
  });
});
