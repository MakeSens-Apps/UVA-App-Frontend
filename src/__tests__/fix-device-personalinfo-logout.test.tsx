/**
 * Device bugs B2 / B3 (Redmi Note 10S, Android 13) — 2026-09-07
 *
 * B2 (ALTA) — Guardar "Información personal" fallaba para usuarios sin email.
 *   PersonalInfoScreen enviaba `email: ''` (el form mantiene '' para que el
 *   TextInput siga controlado) y DataStore rechaza con
 *   "Field Email should be of type AWSEmail", perdiéndose también nombre y
 *   apellido. El original manda `user?.Email || undefined`
 *   (src/app/pages/profile/personal-info/personal-info.page.ts:185,232).
 *   Fix: `email: pValues.userEmail || undefined` en onSubmit.
 *
 * B3 (MEDIA) — "TypeError: Cannot read property 'clear' of undefined" al cerrar
 *   sesión: DataStore.clear() se llama dos veces en paralelo — explícitamente en
 *   ProfileScreen.handleLogout y desde el listener Hub 'signedOut' de SyncContext
 *   (patrón heredado: profile.page.ts:237 + sync-monitor-ds.service.ts:72-75).
 *   Fix mínimo: ambas llamadas capturan el error (console.warn); no se cambia el
 *   orden ni se elimina ninguna. El logout debe completarse igualmente.
 */

/* eslint-disable import/first */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── Theme ────────────────────────────────────────────────────────────────────

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: {
          100: '#D1FBFC',
          500: '#10BCCA',
          600: '#1097AA',
          700: '#14788A',
          900: '#164551',
        },
        green: { 500: '#69AB3C' },
        white: '#FFFFFF',
        gray: {
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          700: '#404040',
          900: '#171717',
        },
        orange: { 500: '#E58B24' },
        danger: '#E5245E',
      },
      semanticColors: { primary: '#10BCCA', background: '#F4F4F4' },
    },
  }),
}));

jest.mock('@/theme/theme', () => ({
  fontFamilyForWeight: (w: string) => `Montserrat-${w}`,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  G: 'G',
  Circle: 'Circle',
}));

// ─── Asset mocks ──────────────────────────────────────────────────────────────

jest.mock('@/assets/svg/icons/semilla.svg', () => 'SemillaIcon');
jest.mock('@/assets/svg/icons/brote.svg', () => 'BroteIcon');
jest.mock('@/assets/svg/icons/platula.svg', () => 'PlatulaIcon');
jest.mock('@/assets/svg/icons/flor.svg', () => 'FlorIcon');
jest.mock('@/assets/svg/icons/arrow-right.svg', () => 'ArrowRightIcon');
jest.mock('@/assets/svg/icons/date_incomplete_to_done.svg', () => 'DateIcon');
jest.mock('@/assets/svg/icons/content_copy.svg', () => 'CopyIcon');
jest.mock('@/assets/svg/icons/more_horiz.svg', () => 'MoreIcon');
jest.mock('@/assets/svg/icons/profile/trash.svg', () => 'TrashIcon');
jest.mock('@/assets/svg/icons/profile/pencil.svg', () => 'PencilIcon');
jest.mock('@/assets/svg/icons/profile/arrow-forward.svg', () => 'ArrowFwdIcon');
jest.mock('@/assets/png/social/whatapp.png', () => 1);
jest.mock('@/assets/png/social/notion.png', () => 1);
jest.mock('@/assets/png/social/face.png', () => 1);
jest.mock('@/assets/png/social/logop.jpg', () => 1);
jest.mock('@/assets/png/user-circle.png', () => 1);
jest.mock('@/assets/png/logo_Natura_Isagen.png', () => 1);
jest.mock('@/assets/png/profile/logout.png', () => 1);
jest.mock('@/assets/png/profile/Medal.png', () => 1);
jest.mock('@/assets/png/profile/Open.png', () => 1);
jest.mock('@/assets/png/profile/Options.png', () => 1);
jest.mock('@/assets/png/profile/Share-social.png', () => 1);
jest.mock('@/assets/png/profile/Arrow-forward.png', () => 1);

// ─── BottomSheet ──────────────────────────────────────────────────────────────

jest.mock('@gorhom/bottom-sheet', () => {
  const R = require('react');
  const { View } = require('react-native');
  const MockBottomSheet = R.forwardRef(
    (
      { children }: { children: React.ReactNode },
      ref: React.Ref<{ snapToIndex: (i: number) => void; close: () => void }>,
    ) => {
      const [open, setOpen] = R.useState(false);
      R.useImperativeHandle(ref, () => ({
        snapToIndex: () => setOpen(true),
        close: () => setOpen(false),
      }));
      if (!open) return null;
      return <View testID="bottom-sheet">{children}</View>;
    },
  );
  MockBottomSheet.displayName = 'MockBottomSheet';
  const MockBottomSheetView = ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );
  // UvaBottomSheet renders its content in a BottomSheetScrollView (the scrollable is what
  // reports the content height to the dynamic-sizing detent — `--height: auto`).
  const MockBottomSheetScrollView = ({
    children,
    contentContainerStyle,
    testID,
  }: {
    children: React.ReactNode;
    contentContainerStyle?: unknown;
    testID?: string;
  }) => (
    <View style={contentContainerStyle as never} testID={testID}>
      {children}
    </View>
  );
  const MockBottomSheetBackdrop = () => null;
  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetView: MockBottomSheetView,
    BottomSheetScrollView: MockBottomSheetScrollView,
    BottomSheetBackdrop: MockBottomSheetBackdrop,
  };
});

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/components/ui/Toast', () => ({
  showToast: jest.fn(),
  hideToast: jest.fn(),
}));

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockGoToApp = jest.fn();
const mockGoToAuth = jest.fn();

jest.mock('@/navigation/useNavigationGate', () => ({
  useNavigationGate: () => ({ goToApp: mockGoToApp, goToAuth: mockGoToAuth }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const R = require('react');
    R.useEffect(() => cb(), []);
  },
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
  }),
}));

// ─── DataStore ────────────────────────────────────────────────────────────────

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    clear: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue({}),
    start: jest.fn().mockResolvedValue(undefined),
    configure: jest.fn(),
  },
}));

// ─── Contexts / services ──────────────────────────────────────────────────────

jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => ({
    getConfigurationApp: jest.fn().mockResolvedValue({
      branding: { logo: '', colors: '' },
      gamification: { totalTasks: 3 },
      tasks: {},
    }),
    loadImage: jest.fn().mockResolvedValue(null),
    loadBranding: jest.fn().mockResolvedValue(undefined),
    downLoadData: jest.fn().mockResolvedValue(true),
    configApp: null,
    configMeasurement: null,
    configColors: null,
    countTasks: jest.fn().mockReturnValue(3),
    getConfigurationMeasurement: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('@/data/auth/auth', () => ({
  authService: {
    SignOut: jest.fn().mockResolvedValue({ success: true }),
    SignIn: jest.fn().mockResolvedValue({ success: true, data: {} }),
    handleDeleteUser: jest.fn().mockResolvedValue(true),
  },
}));

const mockGetUser = jest.fn();
const mockUpdateUser = jest.fn().mockResolvedValue({});
jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: {
    getUser: (...a: unknown[]) => mockGetUser(...a),
    updateUser: (...a: unknown[]) => mockUpdateUser(...a),
  },
}));

const mockGetUVAByID = jest.fn();
const mockUpdateUVA = jest.fn().mockResolvedValue({});
jest.mock('@/data/datastore/uva-ds', () => ({
  UvaDSService: {
    getUVAByID: (...a: unknown[]) => mockGetUVAByID(...a),
    updateUVA: (...a: unknown[]) => mockUpdateUVA(...a),
  },
}));

jest.mock('@/data/datastore/user-progress-ds', () => ({
  UserProgressDSService: {
    getLastUserProgressPure: jest
      .fn()
      .mockResolvedValue({ Seed: 5, Streak: 2 }),
    getMilestones: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/domain/gamification/gamification', () => ({
  GamificationService: {
    getNotifications: jest.fn().mockResolvedValue([]),
    markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
    deleteAllNotifications: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockSignOut = jest.fn().mockResolvedValue(true);
jest.mock('@/domain/setup/setup', () => ({
  SetupService: { signOut: (...a: unknown[]) => mockSignOut(...a) },
}));

const mockClearSession = jest.fn().mockResolvedValue(undefined);
jest.mock('@/state/SessionContext', () => ({
  useSessionContext: () => ({
    clearSession: mockClearSession,
    session: {},
    isLoaded: true,
    setSession: jest.fn(),
    setSessionField: jest.fn(),
    reloadSession: jest.fn(),
  }),
}));

import { NotificationProvider } from '@/state/notification/NotificationContext';
import { PersonalInfoScreen } from '@/screens/profile/PersonalInfoScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { DataStore } from '@aws-amplify/datastore';

function Wrapper({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <NotificationProvider>{children}</NotificationProvider>;
}

function makeNavProps(): object {
  return {
    navigation: {
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
      dispatch: jest.fn(),
    },
    route: { key: 'test', name: 'Test', params: undefined },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// B2 — PersonalInfoScreen: email vacío se envía como undefined
// ─────────────────────────────────────────────────────────────────────────────

describe('B2 — Guardar información personal para un usuario SIN email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUVAByID.mockResolvedValue({
      latitude: '4.71',
      longitude: '-74.07',
      altitude: '2600',
      fields: JSON.stringify({
        farmName: 'Finca A',
        villageName: 'Vereda B',
        townName: 'Municipio C',
      }),
    });
    mockUpdateUser.mockResolvedValue({});
    mockUpdateUVA.mockResolvedValue({});
  });

  async function saveForm() {
    const props = makeNavProps() as Parameters<typeof PersonalInfoScreen>[0];
    const { getByTestId } = await render(
      <Wrapper>
        <PersonalInfoScreen {...props} />
      </Wrapper>,
    );
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    const toggle = getByTestId('toggle-edit-btn');
    // 1ª pulsación entra en modo edición, 2ª dispara onSubmit
    await act(async () => {
      fireEvent.press(toggle);
    });
    await act(async () => {
      fireEvent.press(toggle);
    });
    return getByTestId;
  }

  it('REGRESIÓN: usuario con Email undefined → updateUser recibe email: undefined (no "")', async () => {
    mockGetUser.mockResolvedValue({
      Name: 'María esperanza',
      LastName: 'Gil',
      PhoneNumber: '+573000000002',
      Email: undefined,
    });

    await saveForm();

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1));
    const payload = mockUpdateUser.mock.calls[0][0] as {
      name: string;
      lastName: string;
      email?: string;
    };
    expect(payload.email).toBeUndefined();
    // '' es lo que rompía DataStore ("Field Email should be of type AWSEmail")
    expect(payload.email).not.toBe('');
    // Nombre y apellido se guardan igualmente (antes se perdían con el rechazo)
    expect(payload.name).toBe('María esperanza');
    expect(payload.lastName).toBe('Gil');
    // La ubicación también se guarda
    expect(mockUpdateUVA).toHaveBeenCalledTimes(1);
  });

  it('usuario con Email = "" (valor real que llega de DataStore) → también se normaliza a undefined', async () => {
    mockGetUser.mockResolvedValue({
      Name: 'María esperanza',
      LastName: 'Gil',
      PhoneNumber: '+573000000002',
      Email: '',
    });

    await saveForm();

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1));
    expect(
      (mockUpdateUser.mock.calls[0][0] as { email?: string }).email,
    ).toBeUndefined();
  });

  it('usuario CON email → se envía el email tal cual', async () => {
    mockGetUser.mockResolvedValue({
      Name: 'María esperanza',
      LastName: 'Gil',
      PhoneNumber: '+573000000002',
      Email: 'maria@example.com',
    });

    await saveForm();

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1));
    expect((mockUpdateUser.mock.calls[0][0] as { email?: string }).email).toBe(
      'maria@example.com',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B3 — Logout: un rechazo de DataStore.clear no propaga ni corta el logout
// ─────────────────────────────────────────────────────────────────────────────

describe('B3 — DataStore.clear concurrente al cerrar sesión', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(true);
    mockClearSession.mockResolvedValue(undefined);
    (DataStore.clear as jest.Mock).mockResolvedValue(undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('REGRESIÓN: si DataStore.clear rechaza, el logout se completa igual (goToAuth) y no propaga', async () => {
    // Reproduce el rechazo real de la segunda llamada concurrente.
    (DataStore.clear as jest.Mock).mockRejectedValue(
      new TypeError("Cannot read property 'clear' of undefined"),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const props = makeNavProps() as Parameters<typeof ProfileScreen>[0];
    const { getByTestId } = await render(
      <Wrapper>
        <ProfileScreen {...props} />
      </Wrapper>,
    );

    await act(async () => {
      fireEvent.press(getByTestId('logout-btn'));
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockClearSession).toHaveBeenCalled();
      expect(DataStore.clear).toHaveBeenCalled();
      // El fix: el rechazo se traga → el flip a Auth SÍ ocurre.
      expect(mockGoToAuth).toHaveBeenCalledTimes(1);
    });

    expect(warnSpy).toHaveBeenCalled();
    // No cae en el catch general de handleLogout
    expect(errorSpy).not.toHaveBeenCalledWith(
      'Logout error:',
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it('camino feliz: se mantiene la llamada explícita a DataStore.clear (paridad con el original)', async () => {
    const props = makeNavProps() as Parameters<typeof ProfileScreen>[0];
    const { getByTestId } = await render(
      <Wrapper>
        <ProfileScreen {...props} />
      </Wrapper>,
    );

    await act(async () => {
      fireEvent.press(getByTestId('logout-btn'));
    });

    await waitFor(() => {
      expect(DataStore.clear).toHaveBeenCalledTimes(1);
      expect(mockGoToAuth).toHaveBeenCalledTimes(1);
    });
  });
});
