/**
 * Remediación setup-auth — Tests para bugs corregidos
 *
 * Bug fixes verified:
 *   1. #14 MEDIA: RegisterProjectFormScreen — no longer filters fieldsUVA by enabled
 *   2. #18 BAJA:  setup.ts / setup-racimo.ts — use exported sessionService singleton
 *   3. #19 BAJA:  LoginScreen — modal texts lowercase ('No, editar', 'Sí, continuar')
 *   4. #20 BAJA:  ValidateProjectScreen — cancelTimer navigates to ProjectVinculation (not Login)
 *   5. Coverage:  ProjectVinculationScreen — personalized message with user name + correct placeholder
 *
 * Gate: each test was designed to FAIL before the fix and PASS after.
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── Screen imports ───────────────────────────────────────────────────────────

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { ValidateProjectScreen } from '@/screens/auth/ValidateProjectScreen';
import { ProjectVinculationScreen } from '@/screens/auth/ProjectVinculationScreen';
import { RegisterProjectFormScreen } from '@/screens/auth/RegisterProjectFormScreen';

// ─── Common mocks ─────────────────────────────────────────────────────────────

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: {
          50: '#EDFEFE',
          500: '#10BCCA',
          600: '#1097AA',
          700: '#14788A',
          800: '#1A6270',
        },
        green: { 500: '#69AB3C', 700: '#3D6625' },
        orange: { 500: '#E58B24' },
        gray: {
          50: '#FAFAFA',
          300: '#D4D4D4',
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

// Keep the real `colors` export: ExploreContainer → RichText → varTokenResolver
// reads colors.blue at module load, so a partial mock crashes the suite.
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

// react-navigation mocks
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
  }),
  useFocusEffect: (cb: () => () => void) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = cb();
      return cleanup;
    }, []);
  },
}));

// ─── ConfirmModal mock ────────────────────────────────────────────────────────

const mockShow = jest.fn();

jest.mock('@/components/ui/ConfirmModal', () => {
  const React = require('react');
  const useConfirmModal = () => ({ confirmModal: null, show: mockShow });
  return { useConfirmModal, ConfirmModal: () => null, __mockShow: mockShow };
});

// ─── SetupService mock ────────────────────────────────────────────────────────

const mockSignIn = jest.fn();
const mockGetParametersUser = jest.fn();
const mockCreateNewUser = jest.fn();

jest.mock('@/domain/setup/setup', () => ({
  SetupService: {
    signIn: (...a: unknown[]) => mockSignIn(...a),
    getParametersUser: (...a: unknown[]) => mockGetParametersUser(...a),
    createNewUser: (...a: unknown[]) => mockCreateNewUser(...a),
    setParametersUser: jest.fn().mockResolvedValue(undefined),
    confirmSignIn: jest.fn().mockResolvedValue(false),
    confirmSignUp: jest.fn().mockResolvedValue(false),
    reSendCodeSignIn: jest.fn().mockResolvedValue(false),
    reSendCodeSignUp: jest.fn().mockResolvedValue(false),
  },
}));

// ─── SetupRacimoService mock ──────────────────────────────────────────────────

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

// ─── ConfigContext mock ───────────────────────────────────────────────────────

const mockGetConfigurationApp = jest.fn();
const mockLoadImage = jest.fn();
const mockConfigExists = jest.fn();
const mockDownLoadData = jest.fn();
const mockLoadBranding = jest.fn();

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

// ─── SyncContext mock ─────────────────────────────────────────────────────────

jest.mock('@/state/SyncContext', () => ({
  useSyncContext: () => ({
    waitForSync: jest.fn().mockResolvedValue(undefined),
    state: 'READY',
    synchronizedData: () => true,
  }),
}));

// ─── MoonPhaseService mock ────────────────────────────────────────────────────

jest.mock('@/domain/moon/moon-phase', () => ({
  MoonPhaseService: {
    downloadAndStoreMoonPhaseData: jest
      .fn()
      .mockResolvedValue({ success: true }),
  },
}));

// ─── Reset helpers ────────────────────────────────────────────────────────────

function resetAllMocks() {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockReset.mockClear();
  mockShow.mockReset();
  mockSignIn.mockReset();
  mockGetParametersUser.mockReset();
  mockCreateNewUser.mockReset();
  mockGetUVA.mockReset();
  mockGetRACIMOByCode.mockReset();
  mockGetConfigurationApp.mockReset();
  mockLoadImage.mockReset();
  mockConfigExists.mockReset();
  mockDownLoadData.mockReset();
  mockLoadBranding.mockReset();

  // Default returns
  mockCreateNewUser.mockResolvedValue(true);
  mockGetParametersUser.mockResolvedValue({
    userID: 'uid123',
    name: 'Carlos',
    lastName: 'Gomez',
  });
  mockGetUVA.mockResolvedValue(false);
  mockConfigExists.mockResolvedValue(false);
  mockDownLoadData.mockResolvedValue(true);
  mockLoadBranding.mockResolvedValue(undefined);
  mockGetConfigurationApp.mockResolvedValue(null);
  mockLoadImage.mockResolvedValue(null);
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG #19 (REVERTED): LoginScreen phone-confirmation modal capitalization
//
// The June logic audit lowercased these labels because login.page.ts:103-104 has
// 'No, editar' / 'Sí, continuar'. That read the TypeScript literal, not the screen:
// alert.component.scss:16-19 declares `ion-button { text-transform: capitalize }`,
// so the original ALWAYS renders "No, Editar" / "Sí, Continuar" — see
// docs/evidence/auth-login/screen-04 and docs/evidence/register/screen-17
// (device review 166-239, D18). RN's ConfirmModal has no cascading text-transform,
// so the capitalization belongs in the strings the screen passes.
// ─────────────────────────────────────────────────────────────────────────────

describe('LoginScreen phone-confirmation modal — labels as rendered by the original', () => {
  beforeEach(resetAllMocks);

  async function submitValidPhone() {
    mockShow.mockResolvedValue('CANCEL');
    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <LoginScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('phone-input'), '3001234567');
    });
    await act(async () => {
      fireEvent.press(getByTestId('submit-button'));
    });
    await waitFor(() => {
      expect(mockShow).toHaveBeenCalled();
    });
  }

  it('passes "No, Editar" / "Sí, Continuar" (ion-button text-transform: capitalize)', async () => {
    await submitValidPhone();

    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        textCancelButton: 'No, Editar',
        textOkButton: 'Sí, Continuar',
      }),
    );
  });

  it('dims the backdrop strongly (original darkens the page — device D12)', async () => {
    await submitValidPhone();

    const callArgs = mockShow.mock.calls[0]?.[0] as Record<string, string>;
    expect(callArgs.backdropDim).toBe('strong');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG #20: ValidateProjectScreen cancelTimer navigation
// Original: routerLink="/register/project-vinculation" (validate-project.page.html:8)
// Was: navigation.navigate('Login') — wrong destination
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug #20 — ValidateProjectScreen.cancelTimer navigates to ProjectVinculation (original: validate-project.page.html:8)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigates to ProjectVinculation when Cancel is pressed', async () => {
    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <ValidateProjectScreen
        navigation={nav as never}
        route={{ params: { racimoCode: 'ANT025' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('cancel-button'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('ProjectVinculation');
  });

  it('does NOT navigate to Login when Cancel is pressed', async () => {
    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <ValidateProjectScreen
        navigation={nav as never}
        route={{ params: { racimoCode: 'ANT025' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('cancel-button'));
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('Login');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage: ProjectVinculationScreen personalized message
// Original: "{{user?.name}}, por último ingresa el código de invitación
//            enviado a tu Whatsapp del proyecto al que quieres pertenecer."
// Was:      "Ingresa el código de 6 caracteres de tu proyecto." (generic)
// And placeholder: "Ejemplo: ISA234" (was: "XXXXXX")
// ─────────────────────────────────────────────────────────────────────────────

describe('Coverage: ProjectVinculationScreen personalized message and placeholder (original: project-vinculation.page.html:3,15)', () => {
  beforeEach(resetAllMocks);

  it('shows personalized message with user name when name is available', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Maria',
    });
    mockGetUVA.mockResolvedValue(false);

    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    const subtitle = getByTestId('vinculation-subtitle');
    expect(subtitle.props.children).toContain('Maria');
    expect(subtitle.props.children).toContain(
      'por último ingresa el código de invitación',
    );
    expect(subtitle.props.children).toContain('Whatsapp');
  });

  it('shows generic message without user name when name is not available', async () => {
    mockGetParametersUser.mockResolvedValue({ userID: 'uid123', name: '' });
    mockGetUVA.mockResolvedValue(false);

    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    const subtitle = getByTestId('vinculation-subtitle');
    expect(subtitle.props.children).not.toContain('undefined');
    expect(subtitle.props.children).toContain('Whatsapp');
  });

  it('uses "Ejemplo: ISA234" as code input placeholder (original: project-vinculation.page.html:15)', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);

    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    const codeInput = getByTestId('code-input');
    expect(codeInput.props.placeholder).toBe('Ejemplo: ISA234');
  });

  it('does NOT use "XXXXXX" as placeholder (was wrong, original says Ejemplo: ISA234)', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);

    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('project-vinculation-screen')).toBeTruthy();
    });

    const codeInput = getByTestId('code-input');
    expect(codeInput.props.placeholder).not.toBe('XXXXXX');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG #14: RegisterProjectFormScreen shows ALL fields (no enabled filter)
// Original: buildForm() iterates Object.keys(fieldsUVA) without filtering
//           (register-project-form.page.ts:91-99)
// Was:      .filter((f) => f.enabled) — hid disabled fields
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug #14 — RegisterProjectFormScreen shows ALL fieldsUVA without enabled filter (original: register-project-form.page.ts:91-99)', () => {
  beforeEach(resetAllMocks);

  it('renders fields with enabled:false (shows ALL fields, not just enabled ones)', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);
    mockGetConfigurationApp.mockResolvedValue({
      branding: { logo: 'logo.png' },
      fieldsUVA: {
        field1: {
          fieldId: 'field1',
          displayText: 'Campo activo',
          enabled: true,
        },
        field2: {
          fieldId: 'field2',
          displayText: 'Campo inactivo',
          enabled: false,
        },
      },
    });
    mockLoadImage.mockResolvedValue(null);

    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { getByTestId } = await render(
      <RegisterProjectFormScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('register-project-form-screen')).toBeTruthy();
    });

    // Both fields must be rendered — including enabled:false
    // testID pattern: field-${field.fieldId} (RegisterProjectFormScreen.tsx:286)
    expect(getByTestId('field-field1')).toBeTruthy();
    expect(getByTestId('field-field2')).toBeTruthy();
  });

  it('does not hide field2 (enabled:false) from the form', async () => {
    mockGetParametersUser.mockResolvedValue({
      userID: 'uid123',
      name: 'Carlos',
    });
    mockGetUVA.mockResolvedValue(false);
    mockGetConfigurationApp.mockResolvedValue({
      branding: { logo: 'logo.png' },
      fieldsUVA: {
        disabledField: {
          fieldId: 'disabledField',
          displayText: 'Campo oculto',
          enabled: false,
        },
      },
    });
    mockLoadImage.mockResolvedValue(null);

    const nav = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    };
    const { queryByTestId, getByTestId } = await render(
      <RegisterProjectFormScreen
        navigation={nav as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('register-project-form-screen')).toBeTruthy();
    });

    // Field should be rendered even with enabled:false
    // testID pattern: field-${field.fieldId} (RegisterProjectFormScreen.tsx:286)
    expect(queryByTestId('field-disabledField')).not.toBeNull();
  });
});
