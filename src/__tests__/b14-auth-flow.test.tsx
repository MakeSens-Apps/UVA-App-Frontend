/**
 * B14 — Auth flow tests
 *
 * Gate requirements (plan.md B14):
 *   1. OtpScreen — timer behavior (countdown, resend button at 0)
 *   2. OtpScreen — bypass test user path (type=login, already authed)
 *   3. OtpScreen — validateForm branches: login/register, showError on wrong code
 *   4. PreRegisterScreen — checkbox gates button
 *   5. RegisterScreen — name/lastName validation (minLength:3)
 *   6. SetPhoneRegisterScreen — phone validation (minLength:10, maxLength:10)
 *   7. ProjectVinculationScreen — code validation (length:6), showError on invalid code
 *   8. ProjectVinculationScreen — init: UVA+no config → ValidateProject
 *   9. ValidateCodeScreen — 2s redirect (login→ProjectVinculation, register→RegisterSuccess)
 *  10. RegisterSuccessScreen — Iniciar Sesión navigates with reset
 *  11. OtpScreen — resend resets timer
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── Import screens ───────────────────────────────────────────────────────────

import { OtpScreen } from '@/screens/auth/OtpScreen';
import { PreRegisterScreen } from '@/screens/auth/PreRegisterScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { ProjectVinculationScreen } from '@/screens/auth/ProjectVinculationScreen';
import { ValidateCodeScreen } from '@/screens/auth/ValidateCodeScreen';
import { RegisterSuccessScreen } from '@/screens/auth/RegisterSuccessScreen';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Theme mock
jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: {
          50: '#EDFEFE',
          200: '#A9F5F8',
          500: '#10BCCA',
          600: '#1097AA',
          700: '#14788A',
          800: '#1A6270',
        },
        green: { 500: '#69AB3C', 700: '#3D6625' },
        orange: { 500: '#E58B24' },
        gray: {
          50: '#FAFAFA',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
        },
        danger: '#E5245E',
        white: '#FFFFFF',
      },
      semanticColors: {
        primary: '#10BCCA',
        text: '#171717',
        background: '#F4F4F4',
      },
    },
  }),
}));

jest.mock('@/theme/theme', () => ({
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

// RichText mock
jest.mock('@/components/rich-text/RichText', () => ({
  RichText: ({ html }: { html: string }) => {
    const { Text } = require('react-native');
    return <Text testID="rich-text">{html}</Text>;
  },
}));

// ConfirmModal mock (wraps real hook but mocks presentation)
jest.mock('@/components/ui/ConfirmModal', () => {
  const React = require('react');
  const mockShow = jest.fn();

  const useConfirmModal = () => {
    return {
      confirmModal: null,
      show: mockShow,
    };
  };

  return { useConfirmModal, ConfirmModal: () => null, __mockShow: mockShow };
});

// SetupService mock
const mockSignIn = jest.fn();
const mockCreateNewUser = jest.fn();
const mockConfirmSignIn = jest.fn();
const mockConfirmSignUp = jest.fn();
const mockReSendCodeSignIn = jest.fn();
const mockReSendCodeSignUp = jest.fn();
const mockCurrentAuthenticatedUser = jest.fn();
const mockGetParametersUser = jest.fn();
const mockSetParametersUser = jest.fn();
const mockSignUp = jest.fn();

jest.mock('@/domain/setup/setup', () => ({
  SetupService: {
    signIn: (...a: unknown[]) => mockSignIn(...a),
    createNewUser: (...a: unknown[]) => mockCreateNewUser(...a),
    confirmSignIn: (...a: unknown[]) => mockConfirmSignIn(...a),
    confirmSignUp: (...a: unknown[]) => mockConfirmSignUp(...a),
    reSendCodeSignIn: (...a: unknown[]) => mockReSendCodeSignIn(...a),
    reSendCodeSignUp: (...a: unknown[]) => mockReSendCodeSignUp(...a),
    currentAuthenticatedUser: (...a: unknown[]) =>
      mockCurrentAuthenticatedUser(...a),
    getParametersUser: (...a: unknown[]) => mockGetParametersUser(...a),
    setParametersUser: (...a: unknown[]) => mockSetParametersUser(...a),
    signUp: (...a: unknown[]) => mockSignUp(...a),
  },
}));

// SetupRacimoService mock
const mockGetUVA = jest.fn();
const mockGetRACIMOByCode = jest.fn();

jest.mock('@/domain/setup/setup-racimo', () => ({
  SetupRacimoService: {
    getUVA: (...a: unknown[]) => mockGetUVA(...a),
    getRACIMOByCode: (...a: unknown[]) => mockGetRACIMOByCode(...a),
    createNewUVA: jest.fn().mockResolvedValue(true),
    updateUVA: jest.fn().mockResolvedValue(true),
  },
}));

// ConfigContext mock
const mockConfigExists = jest.fn();
const mockDownLoadData = jest.fn();
const mockLoadBranding = jest.fn();
const mockGetConfigurationApp = jest.fn();
const mockLoadImage = jest.fn();

jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => ({
    configExists: mockConfigExists,
    downLoadData: mockDownLoadData,
    loadBranding: mockLoadBranding,
    getConfigurationApp: mockGetConfigurationApp,
    loadImage: mockLoadImage,
    configApp: null,
    configMeasurement: null,
    configColors: null,
  }),
}));

// SyncContext mock
const mockWaitForSync = jest.fn();

jest.mock('@/state/SyncContext', () => ({
  useSyncContext: () => ({
    waitForSync: mockWaitForSync,
    state: 'READY',
    networkStatus: false,
    synchronizedData: () => true,
  }),
}));

// MoonPhaseService mock
const mockDownloadAndStoreMoonPhaseData = jest.fn();
jest.mock('@/domain/moon/moon-phase', () => ({
  MoonPhaseService: {
    downloadAndStoreMoonPhaseData: (...a: unknown[]) =>
      mockDownloadAndStoreMoonPhaseData(...a),
  },
}));

// react-navigation mock
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockUseNavigation = jest.fn().mockReturnValue({
  navigate: mockNavigate,
  goBack: mockGoBack,
  reset: mockReset,
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockUseNavigation(),
  useFocusEffect: (cb: () => () => void) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = cb();
      return cleanup;
    }, []);
  },
}));

// GIF / PNG assets
jest.mock('@/assets/gifs/loader.gif', () => 0, { virtual: true });
jest.mock('@/assets/gifs/confety.gif', () => 0, { virtual: true });
jest.mock('@/assets/gifs/done_register.gif', () => 0, { virtual: true });
jest.mock('@/assets/png/icon-only.png', () => 0, { virtual: true });

// ─── Navigation mock helpers ──────────────────────────────────────────────────

function makeNav(overrides: Record<string, jest.Mock> = {}) {
  return {
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    ...overrides,
  };
}

function resetAllMocks() {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockReset.mockClear();
  mockSignIn.mockReset();
  mockCreateNewUser.mockReset();
  mockConfirmSignIn.mockReset();
  mockConfirmSignUp.mockReset();
  mockReSendCodeSignIn.mockReset();
  mockReSendCodeSignUp.mockReset();
  mockCurrentAuthenticatedUser.mockReset();
  mockGetParametersUser.mockReset();
  mockSetParametersUser.mockReset();
  mockSignUp.mockReset();
  mockGetUVA.mockReset();
  mockGetRACIMOByCode.mockReset();
  mockConfigExists.mockReset();
  mockDownLoadData.mockReset();
  mockLoadBranding.mockReset();
  mockGetConfigurationApp.mockReset();
  mockLoadImage.mockReset();
  mockWaitForSync.mockReset();
  mockDownloadAndStoreMoonPhaseData.mockReset();

  // Default returns
  mockCreateNewUser.mockResolvedValue(true);
  mockCurrentAuthenticatedUser.mockResolvedValue(false);
  mockGetParametersUser.mockResolvedValue({
    userID: 'uid123',
    name: 'Carlos',
    lastName: 'Gomez',
  });
  mockGetUVA.mockResolvedValue(false);
  mockConfigExists.mockResolvedValue(false);
  mockWaitForSync.mockResolvedValue(undefined);
  mockDownLoadData.mockResolvedValue(true);
  mockLoadBranding.mockResolvedValue(undefined);
  mockGetConfigurationApp.mockResolvedValue(null);
  mockLoadImage.mockResolvedValue(null);
  mockDownloadAndStoreMoonPhaseData.mockResolvedValue({
    success: true,
    data: true,
  });
}

// ─── OtpScreen tests ──────────────────────────────────────────────────────────

describe('OtpScreen — timer and inputs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders 6 otp inputs', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3000000002' } } as never}
      />,
    );
    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`otp-input-${i}`)).toBeTruthy();
    }
  });

  it('shows timer text initially (timer > 0)', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3000000002' } } as never}
      />,
    );
    expect(getByTestId('otp-timer')).toBeTruthy();
  });

  it('shows Reenviar button when timer reaches 0', async () => {
    const nav = makeNav();
    const { getByTestId, queryByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'register', phone: '3001234567' } } as never}
      />,
    );

    // Advance 60 seconds
    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    // Timer text should be gone; resend button should appear
    expect(queryByTestId('otp-timer')).toBeNull();
    expect(getByTestId('resend-button')).toBeTruthy();
  });

  it('calls reSendCodeSignIn and resets timer on resend (type=login)', async () => {
    mockReSendCodeSignIn.mockResolvedValue(true);

    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3000000002' } } as never}
      />,
    );

    // Advance past 60s
    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    const resendBtn = getByTestId('resend-button');
    await act(async () => {
      fireEvent.press(resendBtn);
    });

    await waitFor(() => {
      expect(mockReSendCodeSignIn).toHaveBeenCalledTimes(1);
    });

    // Timer should have restarted (timer > 0)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(getByTestId('otp-timer')).toBeTruthy();
  });

  it('calls reSendCodeSignUp for type=register', async () => {
    mockReSendCodeSignUp.mockResolvedValue(true);

    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'register', phone: '3001234567' } } as never}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    await act(async () => {
      fireEvent.press(getByTestId('resend-button'));
    });

    await waitFor(() => {
      expect(mockReSendCodeSignUp).toHaveBeenCalledTimes(1);
    });
  });
});

describe('OtpScreen — validateForm (login branch)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows error when confirmSignIn returns false', async () => {
    mockCurrentAuthenticatedUser.mockResolvedValue(false);
    mockConfirmSignIn.mockResolvedValue(false);

    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3111111111' } } as never}
      />,
    );

    // Enter 6 digits to trigger validateForm
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i + 1}`);
      });
    }

    await waitFor(() => {
      expect(getByTestId('otp-error')).toBeTruthy();
    });
  });

  it('navigates to ValidateCode when login confirmSignIn succeeds', async () => {
    mockCurrentAuthenticatedUser.mockResolvedValue(false);
    mockConfirmSignIn.mockResolvedValue(true);
    mockCreateNewUser.mockResolvedValue(true);

    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3000000002' } } as never}
      />,
    );

    for (let i = 0; i < 6; i++) {
      await act(async () => {
        fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i}`);
      });
    }

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ValidateCode', {
        type: 'login',
        phone: '3000000002',
      });
    });
  });

  it('navigates to ValidateCode when register confirmSignUp succeeds', async () => {
    mockConfirmSignUp.mockResolvedValue(true);

    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'register', phone: '3001234567' } } as never}
      />,
    );

    for (let i = 0; i < 6; i++) {
      await act(async () => {
        fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i}`);
      });
    }

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ValidateCode', {
        type: 'register',
        phone: '3001234567',
      });
    });
  });

  it('shows error when register confirmSignUp returns false', async () => {
    mockConfirmSignUp.mockResolvedValue(false);

    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'register', phone: '3001234567' } } as never}
      />,
    );

    for (let i = 0; i < 6; i++) {
      await act(async () => {
        fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i + 1}`);
      });
    }

    await waitFor(() => {
      expect(getByTestId('otp-error')).toBeTruthy();
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'ValidateCode',
      expect.anything(),
    );
  });

  it('skips confirmSignIn when already authenticated (test user bypass)', async () => {
    // isAuthenticated = true → skips confirmSignIn, calls createNewUser directly
    mockCurrentAuthenticatedUser.mockResolvedValue(true);
    mockCreateNewUser.mockResolvedValue(true);

    const nav = makeNav();
    const { getByTestId } = await render(
      <OtpScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3000000002' } } as never}
      />,
    );

    for (let i = 0; i < 6; i++) {
      await act(async () => {
        fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i}`);
      });
    }

    await waitFor(() => {
      expect(mockConfirmSignIn).not.toHaveBeenCalled();
      expect(mockCreateNewUser).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('ValidateCode', {
        type: 'login',
        phone: '3000000002',
      });
    });
  });
});

// ─── PreRegisterScreen tests ──────────────────────────────────────────────────

describe('PreRegisterScreen — checkbox gates button', () => {
  beforeEach(resetAllMocks);

  it('renders Continuar button disabled initially', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <PreRegisterScreen navigation={nav as never} route={{} as never} />,
    );
    const btn = getByTestId('continuar-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables Continuar button after checkbox is checked', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <PreRegisterScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('terms-checkbox'));
    });

    const btn = getByTestId('continuar-button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('navigates to Register when button pressed after accepting', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <PreRegisterScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('terms-checkbox'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('continuar-button'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });
});

// ─── RegisterScreen tests ─────────────────────────────────────────────────────

describe('RegisterScreen — name/lastName validation', () => {
  beforeEach(resetAllMocks);

  it('renders both inputs and disabled button initially', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <RegisterScreen navigation={nav as never} route={{} as never} />,
    );
    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('lastName-input')).toBeTruthy();
    const btn = getByTestId('submit-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('button remains disabled when name < 3 chars', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <RegisterScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input'), 'Ab');
      fireEvent.changeText(getByTestId('lastName-input'), 'Gomez');
    });

    const btn = getByTestId('submit-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('button is enabled when both name and lastName >= 3 chars', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <RegisterScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input'), 'Carlos');
      fireEvent.changeText(getByTestId('lastName-input'), 'Gomez');
    });

    const btn = getByTestId('submit-button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('calls SetupService.setParametersUser and navigates to SetPhoneRegister', async () => {
    mockSetParametersUser.mockResolvedValue(undefined);

    const nav = makeNav();
    const { getByTestId } = await render(
      <RegisterScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input'), 'Carlos');
      fireEvent.changeText(getByTestId('lastName-input'), 'Gomez');
    });

    await act(async () => {
      fireEvent.press(getByTestId('submit-button'));
    });

    await waitFor(() => {
      expect(mockSetParametersUser).toHaveBeenCalledWith('Carlos', 'Gomez');
      expect(mockNavigate).toHaveBeenCalledWith('SetPhoneRegister');
    });
  });
});

// ─── ProjectVinculationScreen tests ──────────────────────────────────────────

describe('ProjectVinculationScreen — code validation', () => {
  beforeEach(resetAllMocks);

  it('button is disabled when code < 6 chars', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);

    const nav = makeNav();
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    // Wait for initializing to finish
    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('code-input'), 'ABC');
    });

    const btn = getByTestId('submit-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('button is enabled when code is exactly 6 chars', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);

    const nav = makeNav();
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('code-input'), 'ANT025');
    });

    const btn = getByTestId('submit-button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('shows error card when getRACIMOByCode returns false', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);
    mockGetRACIMOByCode.mockResolvedValue(false);

    const nav = makeNav();
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('code-input'), 'FAKEX1');
    });

    await act(async () => {
      fireEvent.press(getByTestId('submit-button'));
    });

    await waitFor(() => {
      expect(getByTestId('vinculation-error')).toBeTruthy();
    });
  });

  it('navigates to ValidateProject when code is valid', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);
    mockGetRACIMOByCode.mockResolvedValue(true);

    const nav = makeNav();
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('code-input'), 'ANT025');
    });

    await act(async () => {
      fireEvent.press(getByTestId('submit-button'));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ValidateProject', {
        racimoCode: 'ANT025',
      });
    });
  });

  it('init: UVA found + no config → navigates to ValidateProject', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      racimoLinkCode: 'ANT025',
    });
    mockGetUVA.mockResolvedValue(true);
    mockConfigExists.mockResolvedValue(false);
    mockWaitForSync.mockResolvedValue(undefined);

    const nav = makeNav();
    await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ValidateProject', {
        racimoCode: 'ANT025',
      });
    });
  });
});

// ─── ValidateCodeScreen tests ─────────────────────────────────────────────────

describe('ValidateCodeScreen — 2s redirect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigates to ProjectVinculation after 2s for type=login', async () => {
    const nav = makeNav();
    await render(
      <ValidateCodeScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3000000002' } } as never}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(mockNavigate).toHaveBeenCalledWith('ProjectVinculation');
  });

  it('navigates to RegisterSuccess after 2s for type=register', async () => {
    const nav = makeNav();
    await render(
      <ValidateCodeScreen
        navigation={nav as never}
        route={{ params: { type: 'register', phone: '3001234567' } } as never}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(mockNavigate).toHaveBeenCalledWith('RegisterSuccess');
  });

  it('does NOT navigate before 2s', async () => {
    const nav = makeNav();
    await render(
      <ValidateCodeScreen
        navigation={nav as never}
        route={{ params: { type: 'login', phone: '3000000002' } } as never}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('ProjectVinculation');
  });
});

// ─── RegisterSuccessScreen tests ──────────────────────────────────────────────

describe('RegisterSuccessScreen', () => {
  beforeEach(resetAllMocks);

  it('renders success title and button', async () => {
    const nav = makeNav();
    const { getByText, getByTestId } = await render(
      <RegisterSuccessScreen navigation={nav as never} route={{} as never} />,
    );

    expect(getByText('Registro completado satisfactoriamente.')).toBeTruthy();
    expect(getByTestId('go-to-login-button')).toBeTruthy();
  });

  it('calls navigation.reset when Iniciar Sesión is pressed', async () => {
    const nav = makeNav();
    const { getByTestId } = await render(
      <RegisterSuccessScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('go-to-login-button'));
    });

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  });
});
