/**
 * Device bug B1 (Redmi Note 10S, Android 13) — 2026-09-07
 *
 * B1 (CRÍTICA) El botón atrás del sistema en Inicio navegaba a una pantalla del
 *   flujo de registro (auth) en vez de minimizar la app.
 *
 *   Causa raíz: useBackHandler() era CÓDIGO MUERTO — ningún componente lo montaba
 *   (grep de `useBackHandler` sólo devolvía su propia definición), así que el back
 *   caía al comportamiento por defecto de Android (la Activity se cierra; al
 *   relanzar, el auth gate puede dejar al usuario en el stack Auth/registro).
 *   El original registra el handler UNA vez, global, en app.component.ts
 *   (appMinimizeService.initializeBackButtonHandler()).
 *
 *   Fix: RootNavigator monta useBackHandler(getCurrentRouteName, destination),
 *   resolviendo la ruta HOJA con NavigationContainer.getCurrentRoute().
 *
 * B2 y B3 viven en fix-device-personalinfo-logout.test.tsx y
 * fix-device-sync-clear.test.tsx (mocks de módulo incompatibles con este archivo).
 */

/* eslint-disable import/first */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockMinimizeApp = jest.fn();
jest.mock('@/native/minimize/useAppMinimize', () => ({
  __esModule: true,
  minimizeApp: (...a: unknown[]) => mockMinimizeApp(...a),
  default: (...a: unknown[]) => mockMinimizeApp(...a),
}));

// ─────────────────────────────────────────────────────────────────────────────
// BackHandler harness — reproduces RN's LIFO dispatch:
// the LAST registered listener runs FIRST; the first one returning true wins.
// ─────────────────────────────────────────────────────────────────────────────

type BackListener = () => boolean | null | undefined;
const backListeners: BackListener[] = [];

function installBackHandlerHarness(): void {
  backListeners.length = 0;
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation(
      (eventName: 'hardwareBackPress', handler: BackListener) => {
        if (eventName === 'hardwareBackPress') {
          backListeners.push(handler);
        }
        return {
          remove: () => {
            const i = backListeners.indexOf(handler);
            if (i >= 0) backListeners.splice(i, 1);
          },
        } as ReturnType<typeof BackHandler.addEventListener>;
      },
    );
}

/** Returns true when some listener consumed the event (Android default suppressed). */
function pressHardwareBack(): boolean {
  for (const listener of [...backListeners].reverse()) {
    if (listener()) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// B1 — RootNavigator monta el back handler global
// ─────────────────────────────────────────────────────────────────────────────

// SplashScreen mock: resuelve la sesión autenticada → destination 'app'.
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

// useAuthGate pulls in DataStore/auth services — not needed here.
jest.mock('@/navigation/useAuthGate', () => ({
  useAuthGate: () => ({
    destination: null,
    isChecking: false,
    startAuthCheck: jest.fn(),
  }),
}));

// AppStack mock reproducing the REAL nesting depth of the app so that
// NavigationContainer.getCurrentRoute() has to resolve the leaf route:
//   Root('App') → AppStack('AppTabs') → Tabs('HomeStack') → HomeStack('Home')
jest.mock('@/navigation/AppStack', () => {
  const R = require('react');
  const { View, Text } = require('react-native');
  const {
    createNativeStackNavigator,
  } = require('@react-navigation/native-stack');

  const Outer = createNativeStackNavigator();
  const Tabs = createNativeStackNavigator();
  const Home = createNativeStackNavigator();

  const Blank = ({ label }: { label: string }) =>
    R.createElement(View, null, R.createElement(Text, null, label));

  // Probe: publishes the ROOT navigation state so the test can assert that after
  // the Auth→App flip the root holds ONLY the App navigator.
  const { useNavigation } = require('@react-navigation/native');
  const HomeWithProbe = () => {
    const navigation = useNavigation();
    R.useEffect(() => {
      let current = navigation;
      while (current.getParent?.()) current = current.getParent();
      (globalThis as { __ROOT_STATE__?: unknown }).__ROOT_STATE__ =
        current.getState();
    });
    return R.createElement(Blank, { label: 'Home' });
  };

  const HomeStackNavigator = () =>
    R.createElement(
      Home.Navigator,
      { screenOptions: { headerShown: false }, initialRouteName: 'Home' },
      R.createElement(Home.Screen, {
        name: 'Home',
        children: () => R.createElement(HomeWithProbe, null),
      }),
      R.createElement(Home.Screen, {
        name: 'MoonPhase',
        children: () => R.createElement(Blank, { label: 'MoonPhase' }),
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
        children: () => R.createElement(Blank, { label: 'Historical' }),
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
          name: 'PersonalInfo',
          children: () => R.createElement(Blank, { label: 'PersonalInfo' }),
        }),
      ),
  };
});

// AuthStack mock (12 real auth screens are irrelevant here).
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
            R.createElement(View, null, R.createElement(Text, null, 'Login')),
        }),
      ),
  };
});

import { RootNavigator } from '@/navigation/RootNavigator';
import {
  requestNavigateToApp,
  registerGateSetter,
} from '@/navigation/navigationGate';
import {
  resolveLeafRouteName,
  handleHardwareBackPress,
} from '@/native/back/useBackHandler';
import { ROUTES_TO_MINIMIZE } from '@/native/minimize/routesToMinimize';

describe('B1 — back del sistema en una ruta raíz minimiza (no navega)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installBackHandlerHarness();
    (globalThis as { __TEST_DESTINATION__?: string }).__TEST_DESTINATION__ =
      'app';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    registerGateSetter(null);
    delete (globalThis as { __TEST_DESTINATION__?: string })
      .__TEST_DESTINATION__;
  });

  it('REGRESIÓN: RootNavigator monta el handler y queda con prioridad sobre el de React Navigation', async () => {
    const { getByText } = await render(<RootNavigator />);
    await waitFor(() => {
      expect(getByText('Home')).toBeTruthy();
    });

    // BackHandler de RN es LIFO: el ÚLTIMO registrado es el primero en ejecutarse.
    // Antes del fix useBackHandler era código muerto y el último listener era el de
    // NavigationContainer, que en Home devuelve false (nadie minimiza).
    const topmost = backListeners[backListeners.length - 1];
    expect(topmost()).toBe(true);
    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
  });

  it('sesión autenticada + foco en Home: hardwareBackPress llama a app-minimize y NO navega', async () => {
    const { getByText } = await render(<RootNavigator />);

    await waitFor(() => {
      expect(getByText('Home')).toBeTruthy();
    });

    const consumed = await act(async () => pressHardwareBack());

    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
    // El evento se consume: React Navigation no llega a hacer goBack.
    expect(consumed).toBe(true);
    // Seguimos en Home — no se navegó a ninguna pantalla del flujo de registro.
    expect(getByText('Home')).toBeTruthy();
  });

  it('tras el login el estado del root contiene SOLO el navigator App', async () => {
    // Arranca en Auth (usuario de prueba 3000000002 entra por LoginScreen)…
    (globalThis as { __TEST_DESTINATION__?: string }).__TEST_DESTINATION__ =
      'login';
    const { getByText, queryByText } = await render(<RootNavigator />);

    await waitFor(() => {
      expect(getByText('Login')).toBeTruthy();
    });

    // …y el gate (navigationGate / devBypass) hace el flip Auth→App.
    await act(async () => {
      expect(requestNavigateToApp()).toBe(true);
    });

    await waitFor(() => {
      expect(getByText('Home')).toBeTruthy();
    });

    // El AuthStack quedó desmontado: nada del flujo de registro sigue vivo detrás.
    expect(queryByText('Login')).toBeNull();

    // El estado del root contiene SOLO el navigator App.
    const rootState = (
      globalThis as {
        __ROOT_STATE__?: { routes: { name: string }[]; routeNames?: string[] };
      }
    ).__ROOT_STATE__;
    expect(rootState).toBeDefined();
    expect(rootState?.routes.map((r) => r.name)).toEqual(['App']);
    expect(rootState?.routeNames).toEqual(['App']);

    // Y el back en Home minimiza en lugar de volver al Auth stack.
    mockMinimizeApp.mockClear();
    const consumed = await act(async () => pressHardwareBack());
    expect(consumed).toBe(true);
    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
    expect(queryByText('Login')).toBeNull();

    // El flip remonta NavigationContainer (key={destination}), que registra SU
    // propio listener. Nuestro handler debe re-registrarse DESPUÉS (resubscribeKey
    // = destination) para conservar la prioridad LIFO; si no, React Navigation
    // decidiría primero (p. ej. cambiando de pestaña en vez de minimizar).
    mockMinimizeApp.mockClear();
    const topmost = backListeners[backListeners.length - 1];
    expect(topmost()).toBe(true);
    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
  });

  it('pantalla interna (PersonalInfo): el handler NO minimiza y cede a React Navigation', () => {
    expect(handleHardwareBackPress('PersonalInfo')).toBe(false);
    expect(mockMinimizeApp).not.toHaveBeenCalled();
  });

  /*
   * Desviación del original a petición del usuario (2026-09-10): el flujo de
   * registro de una medición minimiza igual que Inicio. Antes el atrás caía en la
   * pila y devolvía al formulario de un flujo ya guardado (máximos duplicados).
   */
  it('registro de medición (RegisterMeasurement / GuideMeasurement): el back minimiza', () => {
    expect(handleHardwareBackPress('RegisterMeasurement')).toBe(true);
    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);

    mockMinimizeApp.mockClear();
    expect(handleHardwareBackPress('GuideMeasurement')).toBe(true);
    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
  });

  it('resolveLeafRouteName resuelve la ruta hoja de un estado anidado (Root→App→AppTabs→HomeStack→Home)', () => {
    const nested = {
      index: 0,
      routes: [
        {
          name: 'App',
          state: {
            index: 0,
            routes: [
              {
                name: 'AppTabs',
                state: {
                  index: 0,
                  routes: [
                    {
                      name: 'HomeStack',
                      state: { index: 0, routes: [{ name: 'Home' }] },
                    },
                    { name: 'Measurement' },
                  ],
                },
              },
            ],
          },
        },
      ],
    };

    // El bug (b) descartado: 'HomeStack' NO está en ROUTES_TO_MINIMIZE, 'Home' sí.
    expect(resolveLeafRouteName(nested as never)).toBe('Home');
    expect(ROUTES_TO_MINIMIZE.has('Home')).toBe(true);
    expect(ROUTES_TO_MINIMIZE.has('HomeStack')).toBe(false);
  });
});
