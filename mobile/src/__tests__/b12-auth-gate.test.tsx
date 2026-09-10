/**
 * B12 — useAuthGate tests
 *
 * Gate requirement (plan.md B12):
 *  - sin auth → Auth stack (destination === 'login')
 *  - auth + UVA + racimoCode → App tabs (destination === 'app')
 *  - auth sin UVA → validate-project (destination === 'validate-project')
 *
 * Tests run entirely in Jest without emulator (verified per plan gate spec).
 * NOTE: RNTL v14 — renderHook() is async, must be awaited.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Auth service
const mockCurrentAuthenticatedUser = jest.fn();
jest.mock('@/data/auth/auth', () => ({
  authService: {
    CurrentAuthenticatedUser: (...args: unknown[]) =>
      mockCurrentAuthenticatedUser(...args),
  },
}));

// DataStore services
const mockGetUser = jest.fn();
// ensureSessionUvaID: rehidratación de `session.uvaID` desde el User local
// (fix device 2026-09-10 — la sesión RN vive en dos stores distintos).
const mockEnsureSessionUvaID = jest.fn();
jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: {
    getUser: (...args: unknown[]) => mockGetUser(...args),
    ensureSessionUvaID: (...args: unknown[]) => mockEnsureSessionUvaID(...args),
  },
}));

const mockGetUVAByuserID = jest.fn();
jest.mock('@/data/datastore/uva-ds', () => ({
  UvaDSService: {
    getUVAByuserID: (...args: unknown[]) => mockGetUVAByuserID(...args),
  },
}));

const mockGetRacimoCode = jest.fn();
jest.mock('@/data/datastore/racimo-ds', () => ({
  RacimoDSService: {
    getRacimoCode: (...args: unknown[]) => mockGetRacimoCode(...args),
  },
}));

// Session service (for direct import inside hook)
const mockSessionServiceGetInfo = jest.fn();
jest.mock('@/data/session/session', () => ({
  sessionService: {
    getInfo: (...args: unknown[]) => mockSessionServiceGetInfo(...args),
  },
}));

// Context hooks — mocked with factories to allow dynamic value changes
const mockWaitForSync = jest.fn();
const mockSetSessionField = jest.fn();
const mockReloadSession = jest.fn();

// Use closures so tests can mutate these values before calling startAuthCheck
// NOTE: variables used in jest.mock factories MUST start with "mock" (case-insensitive)
// to bypass the jest hoisting guard.
let mockNetworkStatusValue = true;
let mockSessionUserIDValue: string | undefined = undefined;

jest.mock('@/state/SyncContext', () => ({
  useSyncContext: () => ({
    waitForSync: mockWaitForSync,
    get networkStatus() { return mockNetworkStatusValue; },
    state: 'READY',
    synchronizedData: () => true,
  }),
}));

jest.mock('@/state/SessionContext', () => ({
  useSessionContext: () => ({
    session: { get userID() { return mockSessionUserIDValue; } },
    isLoaded: true,
    setSession: jest.fn(),
    setSessionField: mockSetSessionField,
    clearSession: jest.fn(),
    reloadSession: mockReloadSession,
  }),
}));

// ─── Import hook after mocks ──────────────────────────────────────────────────

// eslint-disable-next-line import/first
import { useAuthGate } from '@/navigation/useAuthGate';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks(): void {
  mockCurrentAuthenticatedUser.mockReset();
  mockGetUser.mockReset();
  mockEnsureSessionUvaID.mockReset();
  mockEnsureSessionUvaID.mockResolvedValue(undefined);
  mockGetUVAByuserID.mockReset();
  mockGetRacimoCode.mockReset();
  mockSessionServiceGetInfo.mockReset();
  mockWaitForSync.mockReset();
  mockSetSessionField.mockReset();
  mockReloadSession.mockReset();
  mockNetworkStatusValue = true;
  mockSessionUserIDValue = undefined;

  // Default: async operations resolve immediately
  mockWaitForSync.mockResolvedValue(undefined);
  mockSetSessionField.mockResolvedValue(undefined);
  mockReloadSession.mockResolvedValue(undefined);
  mockSessionServiceGetInfo.mockResolvedValue({});
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuthGate', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns null destination before startAuthCheck is called', async () => {
    const { result } = await renderHook(() => useAuthGate());
    expect(result.current.destination).toBeNull();
    expect(result.current.isChecking).toBe(false);
  });

  describe('sin auth → destination === login', () => {
    it('redirects to login when no local user and auth fails', async () => {
      mockGetUser.mockResolvedValue(null);
      mockCurrentAuthenticatedUser.mockResolvedValue({ success: false });

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('login');
    });

    it('redirects to login when local user exists but online auth fails', async () => {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockNetworkStatusValue = true;
      mockCurrentAuthenticatedUser.mockResolvedValue({ success: false });

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('login');
    });

    it('redirects to login when offline with no userID in session', async () => {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockNetworkStatusValue = false;
      mockSessionUserIDValue = undefined;
      mockSessionServiceGetInfo.mockResolvedValue({});

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('login');
    });
  });

  describe('auth + UVA + racimoCode → destination === app', () => {
    it('navigates to app tabs when all validations pass (online)', async () => {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockNetworkStatusValue = true;
      mockCurrentAuthenticatedUser.mockResolvedValue({
        success: true,
        data: { userId: 'cognito-user-1' },
      });
      mockGetUVAByuserID.mockResolvedValue({ id: 'uva-1', racimoID: 'racimo-1' });
      mockGetRacimoCode.mockResolvedValue('RACIMO01');

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('app');
      expect(mockSetSessionField).toHaveBeenCalledWith('uvaID', 'uva-1');
      expect(mockSetSessionField).toHaveBeenCalledWith('racimoID', 'racimo-1');
      expect(mockSetSessionField).toHaveBeenCalledWith('racimoLinkCode', 'RACIMO01');
    });

    it('navigates to app tabs when offline with valid session userID', async () => {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockNetworkStatusValue = false;
      mockSessionUserIDValue = 'offline-user-1';
      mockSessionServiceGetInfo.mockResolvedValue({ userID: 'offline-user-1' });
      mockGetUVAByuserID.mockResolvedValue({ id: 'uva-1', racimoID: 'racimo-1' });
      mockGetRacimoCode.mockResolvedValue('RACIMO01');

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('app');
    });

    it('navigates to app when no local user but fresh auth succeeds', async () => {
      // First call (checkUserAuthentication initial check): null
      // Second call (continueWithAuthenticatedFlow redundant check): user exists
      mockGetUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'fresh-user-1' });
      mockCurrentAuthenticatedUser.mockResolvedValue({
        success: true,
        data: { userId: 'fresh-user-1' },
      });
      mockGetUVAByuserID.mockResolvedValue({ id: 'uva-2', racimoID: 'racimo-2' });
      mockGetRacimoCode.mockResolvedValue('RACIMO02');

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('app');
    });
  });

  describe('auth sin UVA → destination === validate-project', () => {
    it('redirects to validate-project when UVA is not found', async () => {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockNetworkStatusValue = true;
      mockCurrentAuthenticatedUser.mockResolvedValue({
        success: true,
        data: { userId: 'cognito-user-1' },
      });
      mockGetUVAByuserID.mockResolvedValue(null);

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('validate-project');
    });

    it('redirects to validate-project when UVA has no racimoID', async () => {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockNetworkStatusValue = true;
      mockCurrentAuthenticatedUser.mockResolvedValue({
        success: true,
        data: { userId: 'cognito-user-1' },
      });
      mockGetUVAByuserID.mockResolvedValue({ id: 'uva-1', racimoID: '' });

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('validate-project');
    });

    it('redirects to validate-project when racimoCode is null/empty', async () => {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockNetworkStatusValue = true;
      mockCurrentAuthenticatedUser.mockResolvedValue({
        success: true,
        data: { userId: 'cognito-user-1' },
      });
      mockGetUVAByuserID.mockResolvedValue({ id: 'uva-1', racimoID: 'racimo-1' });
      mockGetRacimoCode.mockResolvedValue(null);

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('validate-project');
    });
  });

  describe('error handling → destination === login', () => {
    it('redirects to login on unexpected error from DataStore', async () => {
      mockGetUser.mockRejectedValue(new Error('DataStore error'));

      const { result } = await renderHook(() => useAuthGate());

      await act(async () => {
        await result.current.startAuthCheck();
      });

      expect(result.current.destination).toBe('login');
    });
  });

  describe('idempotency', () => {
    it('does not call getUser twice if startAuthCheck called concurrently', async () => {
      mockGetUser.mockResolvedValue(null);
      mockCurrentAuthenticatedUser.mockResolvedValue({ success: false });

      const { result } = await renderHook(() => useAuthGate());

      // First call starts, second should be ignored while first runs
      const firstCall = result.current.startAuthCheck();
      const secondCall = result.current.startAuthCheck();

      await act(async () => {
        await Promise.all([firstCall, secondCall]);
      });

      // getUser should be called only once (second call ignored via checkingRef)
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });
  });
});
