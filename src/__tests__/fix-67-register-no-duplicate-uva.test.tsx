/**
 * #67 — No second UVA when going back from the end of the registration
 *
 * Finding (audit 2026-10-08): Ionic minimized the app on every sub-route of
 * '/register' and '/otp' (app-minimize.service.ts matched with route.includes),
 * but React Native only on exact names. On RegisterCompleted, pressing back
 * during the 3 s before the redirect returned to RegisterProjectForm, and a
 * second submit created a second UVA (same symptom as #50).
 *
 * Fix (user decision: behave like Ionic):
 *   1. Back minimizes on every register and OTP screen.
 *   2. RegisterProjectForm creates the UVA at most once, even if the form is
 *      submitted twice (double tap, or a second submit after coming back).
 *
 * All data is synthetic.
 */

/* eslint-disable import/first */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMinimizeApp = jest.fn();
jest.mock('@/native/minimize/useAppMinimize', () => ({
  __esModule: true,
  minimizeApp: (...a: unknown[]) => mockMinimizeApp(...a),
  default: (...a: unknown[]) => mockMinimizeApp(...a),
}));

jest.mock('@/data/view/app-usage', () => ({
  trackNavigation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: {
          500: '#10BCCA',
          600: '#1097AA',
          700: '#14788A',
          800: '#1A6270',
        },
        gray: {
          50: '#FAFAFA',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          700: '#404040',
          800: '#262626',
        },
        danger: '#E5245E',
      },
    },
  }),
}));

jest.mock('@/theme/theme', () => ({
  ...jest.requireActual('@/theme/theme'),
  fontFamilyForWeight: (w: string) => `Montserrat-${w}`,
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...p }: { children: React.ReactNode }) => (
      <View {...p}>{children}</View>
    ),
  };
});

jest.mock('@/assets/png/icon-only.png', () => 0, { virtual: true });

const mockGetParametersUser = jest.fn();
jest.mock('@/domain/setup/setup', () => ({
  SetupService: {
    getParametersUser: (...a: unknown[]) => mockGetParametersUser(...a),
  },
}));

const mockGetUVA = jest.fn();
const mockLookupUVA = jest.fn();
const mockCreateNewUVA = jest.fn();
const mockUpdateUVA = jest.fn();
jest.mock('@/domain/setup/setup-racimo', () => ({
  SetupRacimoService: {
    getUVA: (...a: unknown[]) => mockGetUVA(...a),
    lookupUVA: (...a: unknown[]) => mockLookupUVA(...a),
    createNewUVA: (...a: unknown[]) => mockCreateNewUVA(...a),
    updateUVA: (...a: unknown[]) => mockUpdateUVA(...a),
  },
}));

const mockShowToast = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  showToast: (...a: unknown[]) => mockShowToast(...a),
}));

const mockGetConfigurationApp = jest.fn();
jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => ({
    getConfigurationApp: mockGetConfigurationApp,
    loadImage: jest.fn().mockResolvedValue(null),
  }),
}));

// RootNavigator dependencies not needed here.
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
        onAuthResolved?.('login');
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

jest.mock('@/navigation/AppStack', () => ({ AppStack: () => null }));

// AuthStack with the REAL RegisterProjectFormScreen and a stub of
// RegisterCompleted (the real one redirects to the App stack after 3 s).
jest.mock('@/navigation/AuthStack', () => {
  const R = require('react');
  const { View, Text } = require('react-native');
  const {
    createNativeStackNavigator,
  } = require('@react-navigation/native-stack');
  const {
    RegisterProjectFormScreen,
  } = require('@/screens/auth/RegisterProjectFormScreen');
  const S = createNativeStackNavigator();
  const Completed = () =>
    R.createElement(
      View,
      { testID: 'register-completed-stub' },
      R.createElement(Text, null, 'Registro completado'),
    );
  return {
    AuthStack: () =>
      R.createElement(
        S.Navigator,
        {
          screenOptions: { headerShown: false },
          initialRouteName: 'RegisterProjectForm',
        },
        R.createElement(S.Screen, {
          name: 'RegisterProjectForm',
          component: RegisterProjectFormScreen,
          initialParams: { racimoCode: 'ABC123' },
        }),
        R.createElement(S.Screen, {
          name: 'RegisterCompleted',
          component: Completed,
        }),
      ),
  };
});

import { RootNavigator } from '@/navigation/RootNavigator';
import { RegisterProjectFormScreen } from '@/screens/auth/RegisterProjectFormScreen';
import { handleHardwareBackPress } from '@/native/back/useBackHandler';

// ─── BackHandler harness (RN dispatches LIFO; first `true` wins) ─────────────

type BackListener = () => boolean | null | undefined;
const backListeners: BackListener[] = [];

function installBackHandlerHarness(): void {
  backListeners.length = 0;
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation(
      (eventName: 'hardwareBackPress', handler: BackListener) => {
        if (eventName === 'hardwareBackPress') backListeners.push(handler);
        return {
          remove: () => {
            const i = backListeners.indexOf(handler);
            if (i >= 0) backListeners.splice(i, 1);
          },
        } as ReturnType<typeof BackHandler.addEventListener>;
      },
    );
}

function pressHardwareBack(): boolean {
  for (const listener of [...backListeners].reverse()) {
    if (listener()) return true;
  }
  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYNTHETIC_USER = {
  userID: '00000000-0000-4000-8000-000000000001',
  name: 'Persona',
};

function setupForm(): void {
  mockGetParametersUser.mockResolvedValue(SYNTHETIC_USER);
  mockGetConfigurationApp.mockResolvedValue({
    branding: { logo: 'logo.png' },
    fieldsUVA: {
      vereda: { fieldId: 'vereda', displayText: 'Vereda', enabled: true },
    },
  });
  mockGetUVA.mockResolvedValue(false);
  mockLookupUVA.mockResolvedValue('none');
  mockCreateNewUVA.mockResolvedValue(true);
  mockUpdateUVA.mockResolvedValue(true);
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve: (v: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

type FiberLike = {
  memoizedProps?: { onPress?: () => void; testID?: string };
  return: FiberLike | null;
};

/**
 * Finds the onPress of the composite that owns a host element, as RNTL's
 * fireEvent does (unstable_fiber is RNTL/React internals). The handler must
 * belong to the element with the expected testID, so a change in those
 * internals fails loudly instead of silently testing another handler.
 */
function getPressHandler(instance: unknown, testID: string): () => void {
  let fiber = (instance as { unstable_fiber: FiberLike | null }).unstable_fiber;
  while (fiber && !fiber.memoizedProps?.onPress) {
    fiber = fiber.return;
  }
  if (!fiber?.memoizedProps?.onPress) {
    throw new Error('onPress handler not found');
  }
  if (fiber.memoizedProps.testID !== testID) {
    throw new Error(
      `onPress found on ${fiber.memoizedProps.testID}, not on ${testID}`,
    );
  }
  return fiber.memoizedProps.onPress;
}

async function renderForm(navigate = jest.fn()) {
  const utils = await render(
    <RegisterProjectFormScreen
      navigation={{ navigate } as never}
      route={{ params: { racimoCode: 'ABC123' } } as never}
    />,
  );
  await waitFor(() => {
    expect(utils.getByTestId('register-project-form-screen')).toBeTruthy();
  });
  await fireEvent.changeText(
    utils.getByTestId('field-vereda'),
    'Vereda sintética',
  );
  return { ...utils, navigate };
}

beforeEach(() => {
  jest.clearAllMocks();
  installBackHandlerHarness();
  setupForm();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── 1. Back minimizes on every register and OTP screen ─────────────────────

describe('#67 — back on register and OTP screens minimizes, as in Ionic', () => {
  const REGISTER_AND_OTP_ROUTES = [
    'PreRegister',
    'Register',
    'SetPhoneRegister',
    'ProjectVinculation',
    'ValidateProject',
    'ProjectVinculationDone',
    'RegisterProjectForm',
    'RegisterCompleted',
    'RegisterSuccess',
    'Otp',
    'ValidateCode',
  ];

  it.each(REGISTER_AND_OTP_ROUTES)(
    '%s: back minimizes and does not navigate',
    (route) => {
      expect(handleHardwareBackPress(route)).toBe(true);
      expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
    },
  );

  it('RegisterCompleted in the real navigator: back minimizes and stays on the screen (no way back to the form)', async () => {
    const screen = await render(<RootNavigator />);
    await waitFor(() => {
      expect(screen.getByTestId('register-project-form-screen')).toBeTruthy();
    });
    await fireEvent.changeText(
      screen.getByTestId('field-vereda'),
      'Vereda sintética',
    );
    await fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByTestId('register-completed-stub')).toBeTruthy();
    });
    expect(mockCreateNewUVA).toHaveBeenCalledTimes(1);

    const consumed = await act(async () => pressHardwareBack());

    expect(consumed).toBe(true);
    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('register-completed-stub')).toBeTruthy();
    expect(mockCreateNewUVA).toHaveBeenCalledTimes(1);
  });
});

// ─── 2. The form creates the UVA at most once ────────────────────────────────

describe('#67 — RegisterProjectForm never creates a second UVA', () => {
  it('first submit without a UVA: creates it once, saves the fields and goes to RegisterCompleted', async () => {
    const { getByTestId, navigate } = await renderForm();

    await fireEvent.press(getByTestId('submit-button'));

    expect(mockCreateNewUVA).toHaveBeenCalledTimes(1);
    expect(mockUpdateUVA).toHaveBeenCalledWith(
      JSON.stringify({ vereda: 'Vereda sintética' }),
    );
    expect(navigate).toHaveBeenCalledWith('RegisterCompleted');
  });

  it('double tap while the first submit is in flight: createNewUVA runs once', async () => {
    const pending = deferred<boolean>();
    mockCreateNewUVA.mockReturnValueOnce(pending.promise);
    const { getByTestId, navigate } = await renderForm();

    // Two taps delivered before React commits `loading` (as on a device): call
    // the TouchableOpacity onPress twice in the same act, so the disabled prop
    // cannot drop the second one and only the synchronous guard is tested.
    const onPress = getPressHandler(
      getByTestId('submit-button'),
      'submit-button',
    );
    await act(async () => {
      onPress();
      onPress();
    });
    await act(async () => {
      pending.resolve(true);
    });

    expect(mockCreateNewUVA).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('RegisterCompleted');
  });

  it('second submit after coming back to the form: does not create another UVA, only updates the fields', async () => {
    const { getByTestId, navigate } = await renderForm();

    await fireEvent.press(getByTestId('submit-button'));
    // The backend index may not return the new UVA yet (eventual consistency).
    mockLookupUVA.mockResolvedValue('none');
    await fireEvent.changeText(getByTestId('field-vereda'), 'Otra vereda');
    await fireEvent.press(getByTestId('submit-button'));

    expect(mockCreateNewUVA).toHaveBeenCalledTimes(1);
    expect(mockUpdateUVA).toHaveBeenCalledTimes(2);
    expect(mockUpdateUVA).toHaveBeenLastCalledWith(
      JSON.stringify({ vereda: 'Otra vereda' }),
    );
    expect(navigate).toHaveBeenLastCalledWith('RegisterCompleted');
  });

  it('the backend already has a UVA for the user when submitting: does not create another', async () => {
    const { getByTestId, navigate } = await renderForm();
    mockLookupUVA.mockResolvedValue('found');

    await fireEvent.press(getByTestId('submit-button'));

    expect(mockLookupUVA).toHaveBeenLastCalledWith(SYNTHETIC_USER.userID);
    expect(mockCreateNewUVA).not.toHaveBeenCalled();
    expect(mockUpdateUVA).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('RegisterCompleted');
  });

  it('creation fails: does not update the fields nor go to RegisterCompleted, and a retry may create it', async () => {
    mockCreateNewUVA.mockResolvedValueOnce(false);
    const { getByTestId, navigate } = await renderForm();

    await fireEvent.press(getByTestId('submit-button'));

    expect(mockUpdateUVA).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith('RegisterCompleted');

    await fireEvent.press(getByTestId('submit-button'));

    expect(mockCreateNewUVA).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenLastCalledWith('RegisterCompleted');
  });

  it('the check fails (network or API error): creates nothing, stays on the form and asks to retry', async () => {
    mockLookupUVA.mockResolvedValueOnce('error');
    const { getByTestId, navigate } = await renderForm();

    await fireEvent.press(getByTestId('submit-button'));

    expect(mockCreateNewUVA).not.toHaveBeenCalled();
    expect(mockUpdateUVA).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );

    // The retry, once the check answers, proceeds normally.
    await fireEvent.press(getByTestId('submit-button'));

    expect(mockCreateNewUVA).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenLastCalledWith('RegisterCompleted');
  });
});
