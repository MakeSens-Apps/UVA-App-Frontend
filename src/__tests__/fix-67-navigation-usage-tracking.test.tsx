/**
 * #67 — Navigation records AppUsageEvent
 *
 * Finding (audit 2026-10-08): RootNavigator.handleStateChange was a TODO, so the
 * React Native app never recorded an AppUsageEvent on navigation. The Ionic app
 * (app.component.ts → initializeNavigationTracking) called
 * appUsageService.trackNavigation(<last URL segment>) on every NavigationEnd,
 * including the first one. The RACIMO dashboard reads those events to show the
 * activity of the users and groups them by the Ionic slug.
 *
 * Decision (#67): only AppUsageEvent is recorded (no Pinpoint autoTrack), with
 * the Ionic slugs; routes without an Ionic URL go in kebab-case and DevGate is
 * never recorded. All data is synthetic.
 */

/* eslint-disable import/first */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── trackNavigation boundary: DataStore + session + auth ────────────────────

const mockSave = jest.fn();
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    save: (...a: unknown[]) => mockSave(...a),
    query: jest.fn(),
    delete: jest.fn(),
  },
  syncExpression: jest.fn(),
}));

jest.mock('@/data/models', () => ({
  AppUsageEvent: class AppUsageEvent {
    constructor(init: Record<string, unknown>) {
      Object.assign(this, init);
    }
  },
}));

const mockGetInfo = jest.fn();
jest.mock('@/data/session/session', () => ({
  sessionService: { getInfo: (...a: unknown[]) => mockGetInfo(...a) },
}));

const mockCurrentAuthenticatedUser = jest.fn();
jest.mock('@/data/auth/auth', () => ({
  authService: {
    CurrentAuthenticatedUser: (...a: unknown[]) =>
      mockCurrentAuthenticatedUser(...a),
  },
}));

jest.mock('@/native/minimize/useAppMinimize', () => ({
  __esModule: true,
  minimizeApp: jest.fn(),
  default: jest.fn(),
}));

// ─── RootNavigator dependencies ──────────────────────────────────────────────

jest.mock('@/screens/splash/SplashScreen', () => {
  const R = require('react');
  const { View } = require('react-native');
  return {
    SplashScreen: ({
      onAuthResolved,
    }: {
      onAuthResolved?: (d: string) => void;
    }) => {
      R.useEffect(() => {
        onAuthResolved?.(
          (globalThis as { __TEST_DESTINATION__?: string })
            .__TEST_DESTINATION__ ?? 'app',
        );
      }, [onAuthResolved]);
      return R.createElement(View, { testID: 'splash' });
    },
  };
});

jest.mock('@/navigation/useAuthGate', () => ({
  useAuthGate: () => ({
    destination: null,
    isChecking: false,
    startAuthCheck: jest.fn(),
  }),
}));

// App stack with the real nesting depth: Root('App') → AppStack('AppTabs') →
// Tabs('HomeStack') → HomeStack('Home'), plus pages pushed outside the tabs.
jest.mock('@/navigation/AppStack', () => {
  const R = require('react');
  const { View, Text, Pressable } = require('react-native');
  const {
    createNativeStackNavigator,
  } = require('@react-navigation/native-stack');
  const { useNavigation } = require('@react-navigation/native');

  const Outer = createNativeStackNavigator();
  const Tabs = createNativeStackNavigator();
  const Home = createNativeStackNavigator();

  const Screen = ({ label, links }: { label: string; links: string[] }) => {
    const navigation = useNavigation();
    return R.createElement(
      View,
      null,
      R.createElement(Text, null, label),
      ...links.map((to: string) =>
        R.createElement(
          Pressable,
          {
            key: to,
            testID: `go-${to}`,
            onPress: () => navigation.navigate(to),
          },
          R.createElement(Text, null, `go ${to}`),
        ),
      ),
      R.createElement(
        Pressable,
        { testID: 'go-back', onPress: () => navigation.goBack() },
        R.createElement(Text, null, 'back'),
      ),
    );
  };

  const HomeStackNavigator = () =>
    R.createElement(
      Home.Navigator,
      { screenOptions: { headerShown: false }, initialRouteName: 'Home' },
      R.createElement(Home.Screen, {
        name: 'Home',
        children: () =>
          R.createElement(Screen, {
            label: 'Home screen',
            links: [
              'MoonPhase',
              'DevGate',
              'Historical',
              'Profile',
              'GuideMeasurement',
            ],
          }),
      }),
      R.createElement(Home.Screen, {
        name: 'MoonPhase',
        children: () =>
          R.createElement(Screen, { label: 'MoonPhase screen', links: [] }),
      }),
      R.createElement(Home.Screen, {
        name: 'DevGate',
        children: () =>
          R.createElement(Screen, { label: 'DevGate screen', links: [] }),
      }),
    );

  const AppTabsNavigator = () =>
    R.createElement(
      Tabs.Navigator,
      { screenOptions: { headerShown: false } },
      R.createElement(Tabs.Screen, {
        name: 'HomeStack',
        component: HomeStackNavigator,
      }),
      R.createElement(Tabs.Screen, {
        name: 'Historical',
        children: () =>
          R.createElement(Screen, { label: 'Historical screen', links: [] }),
      }),
    );

  return {
    AppStack: () =>
      R.createElement(
        Outer.Navigator,
        { screenOptions: { headerShown: false } },
        R.createElement(Outer.Screen, {
          name: 'AppTabs',
          component: AppTabsNavigator,
        }),
        R.createElement(Outer.Screen, {
          name: 'Profile',
          children: () =>
            R.createElement(Screen, { label: 'Profile screen', links: [] }),
        }),
        R.createElement(Outer.Screen, {
          name: 'GuideMeasurement',
          children: () =>
            R.createElement(Screen, { label: 'Guide screen', links: [] }),
        }),
      ),
  };
});

jest.mock('@/navigation/AuthStack', () => {
  const R = require('react');
  const { View, Text } = require('react-native');
  const {
    createNativeStackNavigator,
  } = require('@react-navigation/native-stack');
  const S = createNativeStackNavigator();
  return {
    AuthStack: () =>
      R.createElement(
        S.Navigator,
        { screenOptions: { headerShown: false }, initialRouteName: 'Login' },
        R.createElement(S.Screen, {
          name: 'Login',
          children: () =>
            R.createElement(
              View,
              null,
              R.createElement(Text, null, 'Login screen'),
            ),
        }),
      ),
  };
});

import { RootNavigator } from '@/navigation/RootNavigator';
import {
  requestNavigateToApp,
  registerGateSetter,
} from '@/navigation/navigationGate';
import { initAppUsage, trackNavigation } from '@/data/view/app-usage';
import {
  IONIC_SCREEN_SLUGS,
  toKebabCase,
  toUsageScreenName,
} from '@/data/view/screen-names';

// ─── Synthetic session ───────────────────────────────────────────────────────

const SESSION = {
  userID: '00000000-0000-4000-8000-000000000001',
  racimoID: '00000000-0000-4000-8000-000000000002',
};

type SavedEvent = Record<string, unknown>;

function savedEvents(): SavedEvent[] {
  return mockSave.mock.calls.map((c) => c[0] as SavedEvent);
}

function savedScreenNames(): string[] {
  return savedEvents().map((e) => e.screenName as string);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
  mockGetInfo.mockResolvedValue(SESSION);
  mockCurrentAuthenticatedUser.mockResolvedValue({ success: true });
  initAppUsage();
  (globalThis as { __TEST_DESTINATION__?: string }).__TEST_DESTINATION__ =
    'app';
});

afterEach(() => {
  registerGateSetter(null);
  delete (globalThis as { __TEST_DESTINATION__?: string }).__TEST_DESTINATION__;
});

// ─── 1. Screen names: Ionic slugs ────────────────────────────────────────────

describe('#67 — toUsageScreenName keeps the Ionic slugs', () => {
  it.each([
    ['Home', 'home'],
    ['MoonPhase', 'moon-phase'],
    ['Measurement', 'register'],
    ['Historical', 'history'],
    ['Profile', 'profile'],
    ['PersonalInfo', 'personal-info'],
    ['MeasurementDetail', 'measurement-detail'],
    ['RegisterMeasurement', 'register-measurement'],
    ['RegisterSuccess', 'register-success'],
    ['Login', 'login'],
    ['RegisterCompleted', 'register-completed'],
  ])('%s → %s', (route, slug) => {
    expect(toUsageScreenName(route)).toBe(slug);
  });

  it('never records the phone number: Otp and ValidateCode use fixed slugs', () => {
    expect(toUsageScreenName('Otp')).toBe('otp');
    expect(toUsageScreenName('ValidateCode')).toBe('validate-code');
  });

  it('routes without an Ionic URL go in kebab-case', () => {
    expect(toUsageScreenName('GuideMeasurement')).toBe('guide-measurement');
    expect(toUsageScreenName('ModalAlert')).toBe('modal-alert');
    expect(toKebabCase('ABTestScreen')).toBe('ab-test-screen');
  });

  it('DevGate, navigator routes and empty names are not recorded', () => {
    for (const route of [
      'DevGate',
      'App',
      'Auth',
      'AppTabs',
      'HomeStack',
      '',
      undefined,
    ]) {
      expect(toUsageScreenName(route)).toBeNull();
    }
  });

  it('every slug is lowercase kebab-case', () => {
    for (const slug of Object.values(IONIC_SCREEN_SLUGS)) {
      expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});

// ─── 2. trackNavigation saves the AppUsageEvent ──────────────────────────────

describe('#67 — trackNavigation saves an AppUsageEvent', () => {
  it('saves action navigate with userID, racimoID, sessionID, screenName and ts', async () => {
    await trackNavigation('history');

    expect(mockSave).toHaveBeenCalledTimes(1);
    const event = savedEvents()[0];
    expect(event).toMatchObject({
      userID: SESSION.userID,
      racimoID: SESSION.racimoID,
      screenName: 'history',
      action: 'navigate',
    });
    expect(event.sessionID).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(new Date(event.ts as string).toISOString()).toBe(event.ts);
  });

  it('records nothing without an authenticated user or a RACIMO in session (as in Ionic)', async () => {
    mockCurrentAuthenticatedUser.mockResolvedValueOnce({ success: false });
    await trackNavigation('login');
    mockGetInfo.mockResolvedValueOnce({ userID: SESSION.userID });
    await trackNavigation('register');

    expect(mockSave).not.toHaveBeenCalled();
  });
});

// ─── 3. RootNavigator records each screen change ─────────────────────────────

describe('#67 — RootNavigator records AppUsageEvent on every screen change', () => {
  it('records the initial screen on ready and each new focused screen', async () => {
    const screen = await render(<RootNavigator />);
    await waitFor(() => {
      expect(screen.getByText('Home screen')).toBeTruthy();
    });
    await waitFor(() => {
      expect(savedScreenNames()).toEqual(['home']);
    });

    await fireEvent.press(screen.getByTestId('go-MoonPhase'));
    await waitFor(() => {
      expect(screen.getByText('MoonPhase screen')).toBeTruthy();
    });
    await fireEvent.press(screen.getAllByTestId('go-back').at(-1)!);
    await fireEvent.press(screen.getByTestId('go-Historical'));
    await fireEvent.press(screen.getAllByTestId('go-back').at(-1)!);
    await fireEvent.press(screen.getByTestId('go-Profile'));

    await waitFor(() => {
      expect(savedScreenNames()).toEqual([
        'home',
        'moon-phase',
        'home',
        'history',
        'home',
        'profile',
      ]);
    });
    for (const event of savedEvents()) {
      expect(event).toMatchObject({
        action: 'navigate',
        userID: SESSION.userID,
        racimoID: SESSION.racimoID,
      });
    }
  });

  it('modal-like routes use kebab-case and DevGate is not recorded', async () => {
    const screen = await render(<RootNavigator />);
    await waitFor(() => {
      expect(savedScreenNames()).toEqual(['home']);
    });

    await fireEvent.press(screen.getByTestId('go-DevGate'));
    await waitFor(() => {
      expect(screen.getByText('DevGate screen')).toBeTruthy();
    });
    await fireEvent.press(screen.getAllByTestId('go-back').at(-1)!);
    await fireEvent.press(screen.getByTestId('go-GuideMeasurement'));

    await waitFor(() => {
      expect(savedScreenNames()).toEqual(['home', 'home', 'guide-measurement']);
    });
  });

  it('after the Auth → App gate flip, the first App screen is recorded', async () => {
    (globalThis as { __TEST_DESTINATION__?: string }).__TEST_DESTINATION__ =
      'login';
    // Before login there is no authenticated user: nothing is saved.
    mockCurrentAuthenticatedUser.mockResolvedValue({ success: false });
    const screen = await render(<RootNavigator />);
    await waitFor(() => {
      expect(screen.getByText('Login screen')).toBeTruthy();
    });

    mockCurrentAuthenticatedUser.mockResolvedValue({ success: true });
    await act(async () => {
      expect(requestNavigateToApp()).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getByText('Home screen')).toBeTruthy();
    });

    await waitFor(() => {
      expect(savedScreenNames()).toEqual(['home']);
    });
  });
});
