/**
 * App smoke test — verifies that App renders without crashing.
 *
 * Updated for B12: App now uses RootNavigator + SplashScreen.
 * The SplashScreen runs useAuthGate() which checks authentication.
 * In tests, auth always returns 'login' (mocked), so we expect the Auth stack.
 *
 * Note: RNTL 14 + React 19 uses async render.
 *
 * jest.mock calls are babel-hoisted before any imports at runtime,
 * so the eslint/import-order warning is a false positive here.
 *
 * B03 additions: mock Amplify modules so the test doesn't require real credentials.
 * B06 additions: mock auth + app-usage singletons to prevent AsyncStorage load error.
 * B08 additions: mock expo-font (useFonts) and Montserrat TTF requires.
 * B12 additions: mock navigation, reanimated, expo-splash-screen, SplashScreen,
 *                useAuthGate, GestureHandlerRootView, SafeAreaProvider.
 * Native module mocks (get-random-values, netinfo, async-storage) are in jest.setup.js.
 * amplifyconfiguration.json is mocked via moduleNameMapper → __mocks__/
 */
/* eslint-disable import/first */
import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Amplify mocks ────────────────────────────────────────────────────────────

jest.mock('aws-amplify', () => ({
  Amplify: { configure: jest.fn() },
}));
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    configure: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    query: jest.fn(() => Promise.resolve(null)),
    delete: jest.fn(() => Promise.resolve()),
  },
  syncExpression: jest.fn((_model: unknown, fn: unknown) => ({ model: _model, fn })),
  initSchema: jest.fn(() => ({
    RACIMO: jest.fn(),
    Measurement: jest.fn(),
    UserProgress: jest.fn(),
    GamificationEvent: class GamificationEvent {},
    AppUsageEvent: class AppUsageEvent {},
    User: jest.fn(),
    UVA: jest.fn(),
  })),
}));
jest.mock('aws-amplify/utils', () => ({
  Hub: { listen: jest.fn(() => () => {}) },
}));
jest.mock('../data/models', () => ({
  RACIMO: jest.fn(),
  Measurement: jest.fn(),
  UserProgress: jest.fn(),
  GamificationEvent: class GamificationEvent {},
  AppUsageEvent: class AppUsageEvent {},
  User: jest.fn(),
  UVA: jest.fn(),
}));

// ─── Service mocks ────────────────────────────────────────────────────────────

jest.mock('../data/auth/auth', () => ({
  authService: {
    CurrentAuthenticatedUser: jest.fn(() =>
      Promise.resolve({ success: false }),
    ),
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    confirmSignUp: jest.fn(),
  },
}));
jest.mock('../data/view/app-usage', () => ({
  initAppUsage: jest.fn(),
  cleanupSyncedRecord: jest.fn(() => Promise.resolve()),
  appUsageSyncExpression: { model: jest.fn(), fn: jest.fn() },
  trackNavigation: jest.fn(() => Promise.resolve()),
  trackAction: jest.fn(() => Promise.resolve()),
}));
jest.mock('../data/session/session', () => ({
  sessionService: {
    getInfo: jest.fn(() => Promise.resolve({})),
    setInfo: jest.fn(() => Promise.resolve()),
    setInfoField: jest.fn(() => Promise.resolve()),
    clearInfo: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('../data/storage/file-system', () => ({
  fileSystemService: {
    readFile: jest.fn(() => Promise.resolve({ success: false })),
    writeFile: jest.fn(() => Promise.resolve({ success: true })),
    getFileUri: jest.fn(() => Promise.resolve({ success: false })),
  },
  Directory: { Data: 'Data', Cache: 'Cache' },
}));
jest.mock('../data/storage/s3', () => ({
  s3Service: {
    listFiles: jest.fn(() => Promise.resolve({ success: false })),
    getFile: jest.fn(() => Promise.resolve({ success: false })),
  },
}));

// ─── DataStore service mocks (for useAuthGate) ────────────────────────────────

jest.mock('../data/datastore/user-ds', () => ({
  UserDSService: { getUser: jest.fn(() => Promise.resolve(null)) },
}));
jest.mock('../data/datastore/uva-ds', () => ({
  UvaDSService: { getUVAByuserID: jest.fn(() => Promise.resolve(null)) },
}));
jest.mock('../data/datastore/racimo-ds', () => ({
  RacimoDSService: { getRacimoCode: jest.fn(() => Promise.resolve(null)) },
}));

// ─── Font mock ────────────────────────────────────────────────────────────────

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

// ─── RootNavigator mock (prevents full navigation tree in smoke test) ─────────
// Mocking RootNavigator directly avoids the NavigationContainer + reanimated chain.

jest.mock('../navigation/RootNavigator', () => {
  const mockReact = require('react');
  const { View, Text } = require('react-native');
  return {
    RootNavigator: () =>
      mockReact.createElement(View, null, mockReact.createElement(Text, null, 'App Ready')),
  };
});

// ─── expo-splash-screen mock ──────────────────────────────────────────────────

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// ─── Gesture handler + safe area mocks ───────────────────────────────────────

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    Gesture: { Tap: jest.fn() },
    GestureDetector: ({ children }: { children: unknown }) => children,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const mockReact2 = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: unknown }) =>
      mockReact2.createElement(View, null, children),
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// ─── Toast mock ───────────────────────────────────────────────────────────────

jest.mock('react-native-toast-message', () => {
  const mockReact3 = require('react');
  const { View } = require('react-native');
  const Toast = () => mockReact3.createElement(View, null);
  Toast.show = jest.fn();
  Toast.hide = jest.fn();
  return { __esModule: true, default: Toast };
});

// ─── SplashScreen mock (prevents reanimated native worklets in Jest) ──────────
// The SplashScreen uses react-native-reanimated which requires native init.
// We mock the SplashScreen component to render a simple placeholder in tests.

jest.mock('../screens/splash/SplashScreen', () => {
  const mockReact4 = require('react');
  const { View, Text } = require('react-native');
  return {
    SplashScreen: ({ onAuthResolved }: { onAuthResolved?: (dest: string) => void }) => {
      // Immediately trigger auth resolved to 'login' so RootNavigator renders
      if (onAuthResolved) {
        onAuthResolved('login');
      }
      return mockReact4.createElement(View, null, mockReact4.createElement(Text, null, 'Splash'));
    },
  };
});

// ─── useAuthGate mock (prevents actual DataStore/auth calls in smoke test) ────

jest.mock('../navigation/useAuthGate', () => ({
  useAuthGate: () => ({
    destination: 'login',
    isChecking: false,
    startAuthCheck: jest.fn(() => Promise.resolve()),
  }),
}));

// ─── App import (after all mocks) ────────────────────────────────────────────

import App from '../../App';
/* eslint-enable import/first */

describe('App (B01/B03/B06/B12 smoke)', () => {
  it('renders without crashing', async () => {
    // Should not throw
    await expect(render(<App />)).resolves.toBeDefined();
  });

  it('mounts the full provider tree without errors', async () => {
    const { toJSON } = await render(<App />);
    expect(toJSON()).toBeTruthy();
  });
});
