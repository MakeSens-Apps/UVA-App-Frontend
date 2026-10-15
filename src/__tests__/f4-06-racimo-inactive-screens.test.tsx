/**
 * F4-06 (#61) — RACIMO desactivado en las pantallas: vinculación por código, formulario de
 * registro, aviso de bloqueo y re-evaluación del contexto cuando cambia el RACIMO.
 * Home y Measurement con el aviso del RACIMO están en b13a/b13b (usan el mock global).
 * Las reglas del servicio están en f4-06-racimo-inactive.test.ts. Datos sintéticos.
 */

/* eslint-disable import/first */
/* eslint-disable @typescript-eslint/no-require-imports */

import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/theme/ThemeProvider', () => {
  const { baseTheme } = require('@/theme/theme');
  return {
    useTheme: () => ({ theme: baseTheme }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...p }: { children: React.ReactNode }) => (
      <View {...p}>{children}</View>
    ),
  };
});

jest.mock('@/components/rich-text/RichText', () => ({
  RichText: ({ html }: { html: string }) => {
    const { Text: RNText } = require('react-native');
    return <RNText testID="rich-text">{html}</RNText>;
  },
}));

jest.mock('@/assets/gifs/loader.gif', () => 0, { virtual: true });
jest.mock('@/assets/png/icon-only.png', () => 0, { virtual: true });

const mockOpenAppStoreListing = jest.fn(() => Promise.resolve());
jest.mock('@/native/device/appVersion', () => ({
  openAppStoreListing: () => mockOpenAppStoreListing(),
  getInstalledAppVersion: () => '2.3.1',
}));

const mockGetParametersUser = jest.fn();
jest.mock('@/domain/setup/setup', () => ({
  SetupService: {
    getParametersUser: (...a: unknown[]) => mockGetParametersUser(...a),
  },
}));

const mockGetUVA = jest.fn();
const mockGetRACIMOByCode = jest.fn();
const mockLookupUVA = jest.fn();
const mockCreateNewUVA = jest.fn();
const mockUpdateUVA = jest.fn();
jest.mock('@/domain/setup/setup-racimo', () => ({
  SetupRacimoService: {
    getUVA: (...a: unknown[]) => mockGetUVA(...a),
    getRACIMOByCode: (...a: unknown[]) => mockGetRACIMOByCode(...a),
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
    configExists: jest.fn().mockResolvedValue(false),
    getConfigurationApp: mockGetConfigurationApp,
    loadImage: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('@/state/SyncContext', () => ({
  useSyncContext: () => ({
    waitForSync: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

// RegistrationLockContext (real module, loaded with requireActual below).
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

const mockObserveNext: Record<string, ((msg: unknown) => void) | undefined> =
  {};
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    observe: jest.fn((model: { name: string }) => ({
      subscribe: (observer: { next: (msg: unknown) => void }) => {
        mockObserveNext[model.name] = observer.next;
        return { unsubscribe: jest.fn() };
      },
    })),
  },
}));
jest.mock('@/data/models', () => ({
  UVA: function UVA() {},
  RACIMO: function RACIMO() {},
}));

const UNLOCKED = {
  uvaId: null,
  uvaStatus: 'unknown',
  racimoId: null,
  racimoStatus: 'unknown',
  racimoName: null,
  stationStatus: 'unknown',
  reason: null,
  reactivationPending: false,
};
const mockEvaluate = jest.fn();
jest.mock('@/data/registration-lock/registration-lock-service', () => ({
  UNLOCKED_STATE: {
    uvaId: null,
    uvaStatus: 'unknown',
    racimoId: null,
    racimoStatus: 'unknown',
    racimoName: null,
    stationStatus: 'unknown',
    reason: null,
    reactivationPending: false,
  },
  registrationLockService: {
    evaluate: (...a: unknown[]) => mockEvaluate(...a),
    refreshVersionPolicy: jest.fn(() => Promise.resolve()),
    consumeReactivationNotice: jest.fn(() => Promise.resolve()),
    clearForSignOut: jest.fn(() => Promise.resolve()),
  },
}));

import {
  INVALID_CODE_MESSAGE,
  ProjectVinculationScreen,
  RACIMO_INACTIVE_LINK_MESSAGE,
} from '@/screens/auth/ProjectVinculationScreen';
import { RegisterProjectFormScreen } from '@/screens/auth/RegisterProjectFormScreen';
import {
  LOCK_TOAST_MESSAGES,
  lockMessage,
  racimoInactiveMessage,
  RegistrationLockNotice,
  UPDATE_REQUIRED_MESSAGE,
  UVA_DISABLED_MESSAGE,
} from '@/components/registration-lock/RegistrationLockNotice';

const ActualLockContext = jest.requireActual(
  '@/state/RegistrationLockContext',
) as typeof import('@/state/RegistrationLockContext');

const SYNTHETIC_USER = {
  userID: '00000000-0000-4000-8000-000000000001',
  name: 'Persona',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetParametersUser.mockResolvedValue(SYNTHETIC_USER);
  mockGetUVA.mockResolvedValue(false);
  mockLookupUVA.mockResolvedValue('none');
  mockCreateNewUVA.mockResolvedValue('created');
  mockUpdateUVA.mockResolvedValue(true);
  mockGetConfigurationApp.mockResolvedValue({
    branding: { logo: 'logo.png' },
    fieldsUVA: {
      vereda: { fieldId: 'vereda', displayText: 'Vereda', enabled: true },
    },
  });
  mockEvaluate.mockResolvedValue(UNLOCKED);
});

// ─── ProjectVinculationScreen ────────────────────────────────────────────────

describe('ProjectVinculationScreen — RACIMO inactivo', () => {
  function makeNav() {
    return { navigate: jest.fn(), setParams: jest.fn() };
  }

  async function renderScreen(
    nav = makeNav(),
    params?: { racimoInactive?: boolean },
  ) {
    const utils = await render(
      <ProjectVinculationScreen
        navigation={nav as never}
        route={{ params } as never}
      />,
    );
    await waitFor(() => {
      expect(utils.getByTestId('project-vinculation-screen')).toBeTruthy();
    });
    return { ...utils, nav };
  }

  async function submitCode(
    utils: Awaited<ReturnType<typeof renderScreen>>,
    code = 'ABC123',
  ) {
    await act(async () => {
      fireEvent.changeText(utils.getByTestId('code-input'), code);
    });
    await act(async () => {
      fireEvent.press(utils.getByTestId('submit-button'));
    });
  }

  it('código de un RACIMO inactivo: muestra el mensaje y no avanza', async () => {
    mockGetRACIMOByCode.mockResolvedValue('inactive');
    const utils = await renderScreen();
    await submitCode(utils);

    await waitFor(() => {
      expect(utils.getByTestId('vinculation-error')).toBeTruthy();
    });
    expect(mockGetRACIMOByCode).toHaveBeenCalledWith('ABC123');
    expect(
      utils.getByText(
        'Este RACIMO no está activo y no admite nuevos participantes',
      ),
    ).toBeTruthy();
    expect(RACIMO_INACTIVE_LINK_MESSAGE).toBe(
      'Este RACIMO no está activo y no admite nuevos participantes',
    );
    expect(utils.queryByText('El código ingresado es incorrecto.')).toBeNull();
    expect(utils.nav.navigate).not.toHaveBeenCalledWith(
      'ValidateProject',
      expect.anything(),
    );
  });

  it("código inexistente: sigue mostrando 'El código ingresado es incorrecto.'", async () => {
    mockGetRACIMOByCode.mockResolvedValue('not-found');
    const utils = await renderScreen();
    await submitCode(utils);

    await waitFor(() => {
      expect(
        utils.getByText('El código ingresado es incorrecto.'),
      ).toBeTruthy();
    });
    expect(INVALID_CODE_MESSAGE).toBe('El código ingresado es incorrecto.');
    expect(utils.queryByText(RACIMO_INACTIVE_LINK_MESSAGE)).toBeNull();
    expect(utils.nav.navigate).not.toHaveBeenCalled();
  });

  it('código válido de un RACIMO activo: avanza a ValidateProject sin error', async () => {
    mockGetRACIMOByCode.mockResolvedValue('found');
    const utils = await renderScreen();
    await submitCode(utils);

    await waitFor(() => {
      expect(utils.nav.navigate).toHaveBeenCalledWith('ValidateProject', {
        racimoCode: 'ABC123',
      });
    });
    expect(utils.queryByTestId('vinculation-error')).toBeNull();
  });

  it('al editar el código desaparece el mensaje del RACIMO inactivo', async () => {
    mockGetRACIMOByCode.mockResolvedValue('inactive');
    const utils = await renderScreen();
    await submitCode(utils);
    await waitFor(() => {
      expect(utils.getByTestId('vinculation-error')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('code-input'), 'ABC12');
    });
    expect(utils.queryByTestId('vinculation-error')).toBeNull();
  });

  it('con el parámetro racimoInactive muestra el mensaje y limpia el parámetro', async () => {
    const utils = await renderScreen(makeNav(), { racimoInactive: true });

    expect(utils.getByTestId('vinculation-error')).toBeTruthy();
    expect(utils.getByText(RACIMO_INACTIVE_LINK_MESSAGE)).toBeTruthy();
    expect(utils.nav.setParams).toHaveBeenCalledWith({
      racimoInactive: undefined,
    });
    expect(mockGetRACIMOByCode).not.toHaveBeenCalled();
  });

  it('sin parámetros no muestra ningún error', async () => {
    const utils = await renderScreen();
    expect(utils.queryByTestId('vinculation-error')).toBeNull();
    expect(utils.nav.setParams).not.toHaveBeenCalled();
  });
});

// ─── RegisterProjectFormScreen ───────────────────────────────────────────────

describe('RegisterProjectFormScreen — RACIMO desactivado antes de crear la UVA', () => {
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

  it("createNewUVA → 'racimo-inactive': vuelve al código con racimoInactive y no guarda los campos", async () => {
    mockCreateNewUVA.mockResolvedValueOnce('racimo-inactive');
    const { getByTestId, navigate } = await renderForm();

    await fireEvent.press(getByTestId('submit-button'));

    expect(mockCreateNewUVA).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('ProjectVinculation', {
      racimoInactive: true,
    });
    expect(mockUpdateUVA).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith('RegisterCompleted');
  });

  it("createNewUVA → 'failed' sigue en el formulario como antes (control)", async () => {
    mockCreateNewUVA.mockResolvedValueOnce('failed');
    const { getByTestId, navigate } = await renderForm();

    await fireEvent.press(getByTestId('submit-button'));

    expect(mockUpdateUVA).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(
      'ProjectVinculation',
      expect.anything(),
    );
    expect(navigate).not.toHaveBeenCalledWith('RegisterCompleted');
  });
});

// ─── RegistrationLockNotice ──────────────────────────────────────────────────

describe('RegistrationLockNotice — RACIMO inactivo', () => {
  it('muestra el nombre actual del RACIMO', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(
      <RegistrationLockNotice
        reason="racimo-inactive"
        racimoName="Prueba sintética"
        showReactivated={false}
        testID="notice"
      />,
    );
    expect(getByTestId('notice-racimo-inactive')).toBeTruthy();
    expect(
      getByText(
        'Tu RACIMO Prueba sintética no está activo. Puedes ver tu histórico',
      ),
    ).toBeTruthy();
    // Only the update notice has a button.
    expect(queryByTestId('notice-update-button')).toBeNull();
  });

  it.each([null, undefined, '', '   '])(
    'sin nombre (%p) usa el texto genérico',
    async (racimoName) => {
      const { getByText } = await render(
        <RegistrationLockNotice
          reason="racimo-inactive"
          racimoName={racimoName}
          showReactivated={false}
        />,
      );
      expect(
        getByText('Tu RACIMO no está activo. Puedes ver tu histórico'),
      ).toBeTruthy();
    },
  );

  it('el aviso del RACIMO tapa el de reactivación', async () => {
    const { queryByTestId } = await render(
      <RegistrationLockNotice
        reason="racimo-inactive"
        racimoName="Prueba sintética"
        showReactivated
        testID="notice"
      />,
    );
    expect(queryByTestId('notice-racimo-inactive')).toBeTruthy();
    expect(queryByTestId('notice-reactivated')).toBeNull();
  });

  it('textos por motivo y toast corto del RACIMO', () => {
    expect(racimoInactiveMessage('  Prueba sintética ')).toBe(
      'Tu RACIMO Prueba sintética no está activo. Puedes ver tu histórico',
    );
    expect(lockMessage('racimo-inactive', 'Prueba sintética')).toBe(
      'Tu RACIMO Prueba sintética no está activo. Puedes ver tu histórico',
    );
    expect(lockMessage('racimo-inactive')).toBe(
      'Tu RACIMO no está activo. Puedes ver tu histórico',
    );
    expect(lockMessage('uva-disabled', 'Prueba sintética')).toBe(
      UVA_DISABLED_MESSAGE,
    );
    expect(lockMessage('update-required')).toBe(UPDATE_REQUIRED_MESSAGE);
    expect(LOCK_TOAST_MESSAGES['racimo-inactive']).toBe(
      'Tu RACIMO no está activo, no puedes registrar',
    );
  });
});

// ─── RegistrationLockContext ─────────────────────────────────────────────────

describe('RegistrationLockContext — cambios del RACIMO', () => {
  const {
    RegistrationLockProvider,
    useRegistrationLock,
    useRegistrationLockNotice,
  } = ActualLockContext;

  const RACIMO_INACTIVE = {
    ...UNLOCKED,
    uvaId: 'uva-test-1',
    uvaStatus: 'enabled',
    racimoId: 'racimo-test-1',
    racimoStatus: 'inactive',
    racimoName: 'Prueba sintética',
    stationStatus: 'disabled',
    reason: 'racimo-inactive',
  };

  function StateProbe(): React.JSX.Element {
    const { state } = useRegistrationLock();
    return (
      <Text testID="state">{`${state.racimoId ?? 'none'}|${state.reason ?? 'none'}|${state.stationStatus}`}</Text>
    );
  }

  function NoticeProbe(): React.JSX.Element {
    const { reason, racimoName } = useRegistrationLockNotice();
    return (
      <Text testID="notice">{`${reason ?? 'none'}|${racimoName ?? 'none'}`}</Text>
    );
  }

  async function renderProvider(child: React.ReactElement) {
    const utils = await render(
      <RegistrationLockProvider>{child}</RegistrationLockProvider>,
    );
    await waitFor(() => expect(mockEvaluate).toHaveBeenCalled());
    return utils;
  }

  it("re-evalúa con 'modelSynced' del RACIMO", async () => {
    const { getByTestId } = await renderProvider(<StateProbe />);
    mockEvaluate.mockClear();
    mockEvaluate.mockResolvedValue(RACIMO_INACTIVE);

    await act(async () => {
      mockHubListeners.datastore({
        payload: { event: 'modelSynced', data: { model: { name: 'RACIMO' } } },
      });
    });
    await waitFor(() =>
      expect(getByTestId('state').props.children).toBe(
        'racimo-test-1|racimo-inactive|disabled',
      ),
    );
    expect(mockEvaluate).toHaveBeenCalledTimes(1);

    // Another model is ignored.
    await act(async () => {
      mockHubListeners.datastore({
        payload: { event: 'modelSynced', data: { model: { name: 'User' } } },
      });
    });
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('re-evalúa cuando cambia su RACIMO en DataStore e ignora otros RACIMOS', async () => {
    mockEvaluate.mockResolvedValue(RACIMO_INACTIVE);
    const { getByTestId } = await renderProvider(<StateProbe />);
    await waitFor(() =>
      expect(getByTestId('state').props.children).toBe(
        'racimo-test-1|racimo-inactive|disabled',
      ),
    );
    mockEvaluate.mockClear();

    // The dashboard reactivates it.
    mockEvaluate.mockResolvedValue({
      ...RACIMO_INACTIVE,
      racimoStatus: 'active',
      stationStatus: 'enabled',
      reason: null,
    });
    await act(async () => {
      mockObserveNext.RACIMO?.({ element: { id: 'racimo-test-1' } });
    });
    await waitFor(() =>
      expect(getByTestId('state').props.children).toBe(
        'racimo-test-1|none|enabled',
      ),
    );
    expect(mockEvaluate).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockObserveNext.RACIMO?.({ element: { id: 'racimo-test-2' } });
    });
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('sin RACIMO conocido todavía, cualquier cambio de RACIMO re-evalúa', async () => {
    await renderProvider(<StateProbe />);
    mockEvaluate.mockClear();

    await act(async () => {
      mockObserveNext.RACIMO?.({ element: { id: 'racimo-test-2' } });
    });
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('useRegistrationLockNotice entrega el nombre del RACIMO', async () => {
    mockEvaluate.mockResolvedValue(RACIMO_INACTIVE);
    const { getByTestId } = await renderProvider(<NoticeProbe />);
    await waitFor(() =>
      expect(getByTestId('notice').props.children).toBe(
        'racimo-inactive|Prueba sintética',
      ),
    );
  });
});
