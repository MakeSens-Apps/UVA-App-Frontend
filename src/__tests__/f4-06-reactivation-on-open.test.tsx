/**
 * F4-06 (#61) — The "Tu estación fue reactivada" notice when the reactivation is detected at
 * app open (the RACIMO or the UVA was re-enabled while the app was closed).
 *
 * Cause (the develop test account has two UVAs): the login stores the first UVA of the API.
 * At the next start the provider records the reactivation for that UVA during the sync, but
 * the auth gate then replaced it with the first UVA of DataStore, and the evaluation on
 * 'ready' read that other UVA, with no memory, so Home never saw the pending notice. The auth
 * gate now keeps the session's UVA.
 *
 * Real RegistrationLockService, provider, notice hook, auth gate and UvaDSService over
 * in-memory storage and a DataStore mock. All data is synthetic.
 */

import React from 'react';
import { Text } from 'react-native';
import {
  act,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react-native';

jest.unmock('@/state/RegistrationLockContext');

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
jest.mock('@/data/session/session', () => {
  class MockSessionService {
    getInfo(): Promise<typeof mockSession> {
      return Promise.resolve({ ...mockSession });
    }
  }
  return {
    __esModule: true,
    default: MockSessionService,
    sessionService: new MockSessionService(),
  };
});

// DataStore: the UVAs of the account in the order DataStore lists them.
type UvaRow = {
  id: string;
  userID: string;
  racimoID?: string;
  enabled?: boolean | null;
};
let mockUvas: UvaRow[] = [];
type MockUserPredicate = (c: {
  userID: { eq: (value: string) => string };
}) => string;
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    query: jest.fn((_model: unknown, arg: unknown) => {
      if (typeof arg === 'string') {
        return Promise.resolve(mockUvas.find((uva) => uva.id === arg));
      }
      const userID = (arg as MockUserPredicate)({
        userID: { eq: (value) => value },
      });
      return Promise.resolve(mockUvas.filter((uva) => uva.userID === userID));
    }),
    observe: jest.fn(() => ({
      subscribe: () => ({ unsubscribe: jest.fn() }),
    })),
  },
}));
jest.mock('@/data/models', () => ({
  UVA: function UVA() {},
  RACIMO: function RACIMO() {},
}));

type RacimoRow = { id: string; Name?: string | null; enabled?: boolean | null };
const mockRacimos = new Map<string, RacimoRow>();
jest.mock('@/data/datastore/racimo-ds', () => ({
  RacimoDSService: {
    getRACIMO: (id: string) => Promise.resolve(mockRacimos.get(id)),
    getRacimoCode: () => Promise.resolve('CODIGO-SINTETICO'),
  },
}));

jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: {
    ensureSessionUvaID: jest.fn(() => Promise.resolve(mockSession.uvaID)),
    getUser: jest.fn(() => Promise.resolve({ id: mockSession.userID })),
  },
}));

jest.mock('@/data/auth/auth', () => ({
  authService: {
    CurrentAuthenticatedUser: jest.fn(() =>
      Promise.resolve({ success: true, data: { userId: mockSession.userID } }),
    ),
  },
}));

jest.mock('@/state/SyncContext', () => ({
  useSyncContext: () => ({
    waitForSync: () => Promise.resolve(),
    networkStatus: true,
  }),
}));

const mockSetSessionField = jest.fn(
  (field: keyof typeof mockSession, value: string) => {
    mockSession[field] = value;
    return Promise.resolve();
  },
);
jest.mock('@/state/SessionContext', () => ({
  useSessionContext: () => ({
    session: {},
    setSessionField: mockSetSessionField,
    reloadSession: () => Promise.resolve(),
  }),
}));

jest.mock('@/native/notifications/LocalRemindersService', () => ({
  localRemindersService: {
    setRemindersPaused: jest.fn(),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    getEnableNotifications: jest.fn(() => Promise.resolve(false)),
    scheduleDailyNotifications: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/native/device/appVersion', () => ({
  getInstalledAppVersion: () => '2.3.1',
}));

jest.mock('@/data/storage/s3', () => ({
  s3Service: { getFile: jest.fn(() => Promise.reject(new Error('offline'))) },
}));

const mockHubListeners: Record<string, (data: unknown) => void> = {};
jest.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: jest.fn((channel: string, cb: (data: unknown) => void) => {
      mockHubListeners[channel] = cb;
      return () => {
        delete mockHubListeners[channel];
      };
    }),
  },
}));

jest.mock('@react-navigation/native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect } = require('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});

// eslint-disable-next-line import/first
import {
  RegistrationLockProvider,
  useRegistrationLockNotice,
} from '@/state/RegistrationLockContext';
// eslint-disable-next-line import/first
import { UVA_STATUS_STORE_KEY } from '@/data/registration-lock/uva-status-store';
// eslint-disable-next-line import/first
import { useAuthGate } from '@/navigation/useAuthGate';
// eslint-disable-next-line import/first
import { UvaDSService } from '@/data/datastore/uva-ds';

const USER_ID = 'user-test-1';
const UVA_ID = 'UVA_ABC123_00001';
const OTHER_UVA_ID = 'UVA_ABC123_00002';
const RACIMO_ID = 'racimo-test-1';

function NoticeProbe(): React.JSX.Element {
  const { reason, showReactivated } = useRegistrationLockNotice();
  return (
    <Text testID="probe">{`${reason ?? 'none'}|${showReactivated ? 'reactivated' : 'quiet'}`}</Text>
  );
}

/** Home is not mounted while the splash checks the session and waits for the sync. */
function App({ splash }: { splash: boolean }): React.JSX.Element {
  return (
    <RegistrationLockProvider>
      {splash ? <Text testID="splash">splash</Text> : <NoticeProbe />}
    </RegistrationLockProvider>
  );
}

function storedRecord(uvaId: string = UVA_ID): Record<string, unknown> {
  const raw = mockStorage.get(UVA_STATUS_STORE_KEY);
  return raw ? (JSON.parse(raw)[uvaId] ?? {}) : {};
}

/** What the previous app session left on the phone: the station seen disabled. */
function rememberDisabledStation(byRacimo: boolean): void {
  mockStorage.set(
    UVA_STATUS_STORE_KEY,
    JSON.stringify({
      [UVA_ID]: {
        lastStatus: 'disabled',
        reactivationPending: false,
        lastUvaStatus: byRacimo ? 'enabled' : 'disabled',
        racimoId: RACIMO_ID,
        racimoStatus: byRacimo ? 'inactive' : 'active',
        racimoName: 'Prueba sintética',
      },
    }),
  );
}

function uva(id: string, enabled: boolean): UvaRow {
  return { id, userID: USER_ID, racimoID: RACIMO_ID, enabled };
}

/** Runs the auth gate of the splash, as on every app start. */
async function runAuthGate(): Promise<void> {
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => {
    await result.current.startAuthCheck();
  });
  expect(result.current.destination).toBe('app');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  mockUvas = [];
  mockRacimos.clear();
  mockSession.uvaID = UVA_ID;
  mockSession.userID = USER_ID;
  mockSession.racimoID = RACIMO_ID;
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each([
  ['RACIMO', true],
  ['UVA', false],
])('reactivación (%s) detectada al abrir la app', (_label, byRacimo) => {
  it('ya sincronizada durante el splash: Inicio muestra el aviso verde una vez', async () => {
    rememberDisabledStation(byRacimo);
    mockUvas = [uva(UVA_ID, true)];
    mockRacimos.set(RACIMO_ID, { id: RACIMO_ID, enabled: true });

    const view = await render(<App splash />);
    await waitFor(() => expect(storedRecord().lastStatus).toBe('enabled'));
    expect(storedRecord().reactivationPending).toBe(true);

    await view.rerender(<App splash={false} />);
    await waitFor(() =>
      expect(view.getByTestId('probe').props.children).toBe('none|reactivated'),
    );
    expect(storedRecord().reactivationPending).toBe(false);
  });

  it('sincronizada después de abrir Inicio: el aviso verde aparece', async () => {
    rememberDisabledStation(byRacimo);
    // Stale local data: the phone still has the station disabled.
    mockUvas = [uva(UVA_ID, byRacimo)];
    mockRacimos.set(RACIMO_ID, { id: RACIMO_ID, enabled: !byRacimo });

    const view = await render(<App splash />);
    await view.rerender(<App splash={false} />);
    await waitFor(() =>
      expect(view.getByTestId('probe').props.children).toBe(
        byRacimo ? 'racimo-inactive|quiet' : 'uva-disabled|quiet',
      ),
    );

    mockUvas = [uva(UVA_ID, true)];
    mockRacimos.set(RACIMO_ID, { id: RACIMO_ID, enabled: true });
    await act(async () => {
      mockHubListeners.datastore?.({
        payload: {
          event: 'modelSynced',
          data: { model: { name: byRacimo ? 'RACIMO' : 'UVA' } },
        },
      });
    });
    await waitFor(() =>
      expect(view.getByTestId('probe').props.children).toBe('none|reactivated'),
    );
  });

  it('cuenta con dos UVAs: el arranque conserva la UVA de la sesión y el aviso aparece', async () => {
    // The previous session used UVA_ID (the login picked it) and saw it disabled. DataStore
    // lists the other UVA of the account first.
    rememberDisabledStation(byRacimo);
    mockUvas = [uva(OTHER_UVA_ID, true), uva(UVA_ID, true)];
    mockRacimos.set(RACIMO_ID, { id: RACIMO_ID, enabled: true });

    // As in the app: during the sync (before 'ready') the provider evaluates the session's
    // UVA and records the reactivation; then the auth gate runs, and the 'ready' event
    // re-evaluates with whatever UVA the gate left in the session, before Home is mounted.
    const view = await render(<App splash />);
    await waitFor(() => expect(storedRecord().reactivationPending).toBe(true));
    await runAuthGate();
    await act(async () => {
      mockHubListeners.datastore?.({ payload: { event: 'ready' } });
    });

    await view.rerender(<App splash={false} />);
    await waitFor(() =>
      expect(view.getByTestId('probe').props.children).toBe('none|reactivated'),
    );
    expect(mockSession.uvaID).toBe(UVA_ID);
    expect(storedRecord(OTHER_UVA_ID)).toEqual({});
  });
});

describe('UvaDSService.getUVAByuserID con varias UVAs', () => {
  beforeEach(() => {
    mockUvas = [uva(OTHER_UVA_ID, true), uva(UVA_ID, true)];
  });

  it('devuelve la preferida si está entre las de la persona', async () => {
    expect((await UvaDSService.getUVAByuserID(USER_ID, UVA_ID))?.id).toBe(
      UVA_ID,
    );
  });

  it('sin preferida, o si no está en el teléfono (por ejemplo, borrada), devuelve la primera', async () => {
    expect((await UvaDSService.getUVAByuserID(USER_ID))?.id).toBe(OTHER_UVA_ID);
    expect(
      (await UvaDSService.getUVAByuserID(USER_ID, 'UVA_ABC123_09999'))?.id,
    ).toBe(OTHER_UVA_ID);
  });

  it('el arranque cambia a la primera si la UVA de la sesión no está en el teléfono', async () => {
    mockSession.uvaID = 'UVA_ABC123_09999';
    mockRacimos.set(RACIMO_ID, { id: RACIMO_ID, enabled: true });
    await runAuthGate();
    expect(mockSession.uvaID).toBe(OTHER_UVA_ID);
  });
});
