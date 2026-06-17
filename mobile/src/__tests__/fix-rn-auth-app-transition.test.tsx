/**
 * fix(rn) — Auth↔App transition (register / login / vinculación)
 *
 * Regression tests for the "frozen RegisterCompleted" navigation bug.
 *
 * ROOT CAUSE:
 *   RootNavigator mounts the Auth stack OR the App stack conditionally (never both).
 *   Terminal auth screens did `navigation.reset({ routes: [{ name: 'App' }] })`, but
 *   the 'App' route is not mounted while inside the Auth stack → silent no-op → freeze.
 *   The symmetric logout path (`reset({ routes: [{ name: 'Auth' }] })` from App) had
 *   the same bug.
 *
 * FIX:
 *   Screens flip the gate state via the navigation-gate module (the only mechanism
 *   that re-mounts the correct stack), surfaced as useNavigationGate().goToApp/goToAuth.
 *
 * These tests assert:
 *   1. The gate module flips destination via the registered setter (unit).
 *   2. RegisterCompletedScreen flips to 'app' after its 3s timer (NOT reset).
 *   3. ProjectVinculationScreen (UVA + config) flips to 'app' on init (NOT reset).
 *   4. ProfileScreen logout flips to 'login' (NOT reset to unmounted 'Auth').
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';

// ─── 1. Gate module unit test ──────────────────────────────────────────────────

import {
  registerGateSetter,
  requestNavigateToApp,
  requestNavigateToAuth,
  requestNavigateTo,
} from '@/navigation/navigationGate';

describe('navigationGate (unit) — gate flip mechanism', () => {
  afterEach(() => registerGateSetter(null));

  it('requestNavigateToApp flips destination to "app" via registered setter', () => {
    const setter = jest.fn();
    registerGateSetter(setter);
    const ok = requestNavigateToApp();
    expect(ok).toBe(true);
    expect(setter).toHaveBeenCalledWith('app');
  });

  it('requestNavigateToAuth flips destination to "login"', () => {
    const setter = jest.fn();
    registerGateSetter(setter);
    expect(requestNavigateToAuth()).toBe(true);
    expect(setter).toHaveBeenCalledWith('login');
  });

  it('requestNavigateTo returns false when no setter is registered (RootNavigator unmounted)', () => {
    registerGateSetter(null);
    expect(requestNavigateTo('app')).toBe(false);
  });

  it('devBypass alias delegates to the same setter', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { devBypassToApp } = require('@/navigation/devBypass');
    const setter = jest.fn();
    registerGateSetter(setter);
    devBypassToApp();
    expect(setter).toHaveBeenCalledWith('app');
  });
});

// ─── Shared mocks for screen tests ──────────────────────────────────────────────

// useNavigationGate spy — capture goToApp/goToAuth calls
const mockGoToApp = jest.fn();
const mockGoToAuth = jest.fn();
jest.mock('@/navigation/useNavigationGate', () => ({
  useNavigationGate: () => ({ goToApp: mockGoToApp, goToAuth: mockGoToAuth }),
}));

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: { 50: '#EDFEFE', 200: '#A9F5F8', 500: '#10BCCA', 600: '#1097AA', 700: '#14788A', 800: '#1A6270' },
        gray: { 50: '#FAFAFA', 300: '#D4D4D4', 400: '#A3A3A3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626' },
        danger: '#E5245E',
        white: '#FFFFFF',
      },
      semanticColors: { primary: '#10BCCA', text: '#171717', background: '#F4F4F4' },
    },
  }),
}));

jest.mock('@/theme/theme', () => ({
  fontFamilyForWeight: (w: string) => `Montserrat-${w}`,
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...p }: { children: React.ReactNode }) => <View {...p}>{children}</View> };
});

// ConfigContext mock
const mockConfigExists = jest.fn();
const mockGetConfigurationApp = jest.fn();
const mockLoadImage = jest.fn();
jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => ({
    configExists: mockConfigExists,
    getConfigurationApp: mockGetConfigurationApp,
    loadImage: mockLoadImage,
    downLoadData: jest.fn(),
    loadBranding: jest.fn(),
  }),
}));

// SyncContext mock
const mockWaitForSync = jest.fn();
jest.mock('@/state/SyncContext', () => ({
  useSyncContext: () => ({ waitForSync: mockWaitForSync, state: 'READY', networkStatus: false }),
}));

// Setup services
const mockGetParametersUser = jest.fn();
jest.mock('@/domain/setup/setup', () => ({
  SetupService: {
    getParametersUser: (...a: unknown[]) => mockGetParametersUser(...a),
    signOut: jest.fn().mockResolvedValue(true),
  },
}));
const mockGetUVA = jest.fn();
jest.mock('@/domain/setup/setup-racimo', () => ({
  SetupRacimoService: { getUVA: (...a: unknown[]) => mockGetUVA(...a), getRACIMOByCode: jest.fn() },
}));

// react-navigation: useNavigation (RegisterCompleted no longer uses it, but ProjectVinculation does)
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, reset: mockReset, goBack: mockGoBack }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(() => cb(), []);
  },
}));

// Assets
jest.mock('@/assets/gifs/confety.gif', () => 0, { virtual: true });
jest.mock('@/assets/png/icon-only.png', () => 0, { virtual: true });

// ─── Imports under test ─────────────────────────────────────────────────────────

import { RegisterCompletedScreen } from '@/screens/auth/RegisterCompletedScreen';
import { ProjectVinculationScreen } from '@/screens/auth/ProjectVinculationScreen';

function makeNav() {
  return { navigate: mockNavigate, reset: mockReset, goBack: mockGoBack };
}

function clearScreenMocks() {
  mockGoToApp.mockClear();
  mockGoToAuth.mockClear();
  mockNavigate.mockClear();
  mockReset.mockClear();
  mockGoBack.mockClear();
  mockConfigExists.mockReset().mockResolvedValue(false);
  mockGetConfigurationApp.mockReset().mockResolvedValue(null);
  mockLoadImage.mockReset().mockResolvedValue(null);
  mockWaitForSync.mockReset().mockResolvedValue(undefined);
  mockGetParametersUser.mockReset().mockResolvedValue({ userID: 'uid123', name: 'Carlos' });
  mockGetUVA.mockReset().mockResolvedValue(false);
}

// ─── 2. ProjectVinculationScreen init (UVA + config → home) ─────────────────────
//
// NOTE: This (real-timers, waitFor) block runs BEFORE the RegisterCompleted block
// (which uses fake timers). Keeping the fake-timer block last avoids fake-timer
// state leaking into waitFor()'s real-timer polling.

describe('ProjectVinculationScreen — init UVA+config flips gate to App', () => {
  beforeEach(() => {
    jest.useRealTimers();
    clearScreenMocks();
  });

  it('flips the gate to App when user has UVA and config already exists', async () => {
    mockGetParametersUser.mockResolvedValue({ userID: 'uid123', name: 'Carlos', racimoLinkCode: 'ANT025' });
    mockGetUVA.mockResolvedValue(true);
    mockConfigExists.mockResolvedValue(true);

    await render(<ProjectVinculationScreen navigation={makeNav() as never} route={{} as never} />);

    await waitFor(() => {
      expect(mockGoToApp).toHaveBeenCalledTimes(1);
    });
    expect(mockReset).not.toHaveBeenCalledWith(
      expect.objectContaining({ routes: [{ name: 'App' }] }),
    );
  });

  it('navigates to ValidateProject (NOT gate flip) when UVA exists but no config', async () => {
    mockGetParametersUser.mockResolvedValue({ userID: 'uid123', name: 'Carlos', racimoLinkCode: 'ANT025' });
    mockGetUVA.mockResolvedValue(true);
    mockConfigExists.mockResolvedValue(false);

    await render(<ProjectVinculationScreen navigation={makeNav() as never} route={{} as never} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ValidateProject', { racimoCode: 'ANT025' });
    });
    expect(mockGoToApp).not.toHaveBeenCalled();
  });
});

// ─── 3. RegisterCompletedScreen (fake timers — kept LAST) ───────────────────────

describe('RegisterCompletedScreen — Auth→App transition (regression)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearScreenMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('flips the gate to App after the 3s timer (does NOT reset to unmounted route)', async () => {
    render(<RegisterCompletedScreen />);

    // Let the async init run (loads branding, schedules timer)
    await act(async () => { await Promise.resolve(); });

    expect(mockGoToApp).not.toHaveBeenCalled();

    await act(async () => { jest.advanceTimersByTime(3100); });

    expect(mockGoToApp).toHaveBeenCalledTimes(1);
    // The broken cross-stack reset must NOT be used
    expect(mockReset).not.toHaveBeenCalledWith(
      expect.objectContaining({ routes: [{ name: 'App' }] }),
    );
  });

  it('does NOT flip the gate before the 3s timer (no premature transition)', async () => {
    render(<RegisterCompletedScreen />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockGoToApp).not.toHaveBeenCalled();
  });
});

// ─── 4. ProfileScreen / PersonalInfoScreen logout (App→Auth transition) ─────────
//
// These App→Auth transitions are exercised end-to-end (render + press logout) in
// b16-profile.test.tsx, which already has the full ProfileScreen mock surface
// (BottomSheet/reanimated/DataStore/etc.). That suite asserts logout calls
// goToAuth() and NOT a reset to the unmounted 'Auth' route — the symmetric half of
// this fix. We do not duplicate that heavyweight render here to keep this suite
// focused on the gate mechanism and the Auth-stack screens.
