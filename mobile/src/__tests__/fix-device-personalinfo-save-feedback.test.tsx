/**
 * Device bug (CRÍTICO, datos) — 2026-09-10, "Información personal"
 *
 * Cuando `UserDSService.updateUser` rechazaba (p. ej. el backend devolvía
 * "Cannot return null for non-nullable type: 'ID' within parent 'UVA'"), la
 * pantalla se limitaba a un `console.error` y volvía a modo lectura, así que el
 * usuario creía que había guardado.
 *
 * El original (personal-info.page.ts:225-250) lanza `void UserDSService.updateUser(...)`
 * sin await ni feedback — sólo tiene un alert para el formulario inválido
 * (showAlert, línea 255). Aquí se conserva ese alert literal y se añade el
 * mínimo indispensable: toast de error + permanecer en modo edición.
 */

/* eslint-disable import/first */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── Theme ────────────────────────────────────────────────────────────────────

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: { 100: '#D1FBFC', 500: '#10BCCA', 600: '#1097AA', 700: '#14788A', 900: '#164551' },
        green: { 500: '#69AB3C' },
        white: '#FFFFFF',
        gray: { 100: '#F5F5F5', 200: '#E5E5E5', 300: '#D4D4D4', 400: '#A3A3A3', 500: '#737373', 700: '#404040', 900: '#171717' },
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

jest.mock('@/assets/svg/icons/profile/trash.svg', () => 'TrashIcon');
jest.mock('@/assets/svg/icons/profile/pencil.svg', () => 'PencilIcon');
jest.mock('@/assets/svg/icons/arrow-right.svg', () => 'ArrowRightIcon');
jest.mock('@/assets/png/user-circle.png', () => 1);

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
  const MockBottomSheetView = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
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

// ─── Toast ────────────────────────────────────────────────────────────────────

const mockShowToast = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  showToast: (...a: unknown[]) => mockShowToast(...a),
  hideToast: jest.fn(),
}));

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();

jest.mock('@/navigation/useNavigationGate', () => ({
  useNavigationGate: () => ({ goToApp: jest.fn(), goToAuth: jest.fn() }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const R = require('react');
    R.useEffect(() => cb(), []);
  },
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, reset: mockReset }),
}));

// ─── DataStore services ───────────────────────────────────────────────────────

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    clear: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue({}),
  },
}));

const mockGetUser = jest.fn();
const mockUpdateUser = jest.fn();
jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: {
    getUser: (...a: unknown[]) => mockGetUser(...a),
    updateUser: (...a: unknown[]) => mockUpdateUser(...a),
    ensureSessionUvaID: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockGetUVAByID = jest.fn();
const mockUpdateUVA = jest.fn();
jest.mock('@/data/datastore/uva-ds', () => ({
  UvaDSService: {
    getUVAByID: (...a: unknown[]) => mockGetUVAByID(...a),
    updateUVA: (...a: unknown[]) => mockUpdateUVA(...a),
  },
}));

jest.mock('@/data/auth/auth', () => ({
  authService: { handleDeleteUser: jest.fn().mockResolvedValue(true) },
}));

import { PersonalInfoScreen } from '@/screens/profile/PersonalInfoScreen';

function makeNavProps(): object {
  return {
    navigation: { navigate: mockNavigate, goBack: mockGoBack, reset: mockReset, dispatch: jest.fn() },
    route: { key: 'test', name: 'Test', params: undefined },
  };
}

async function renderAndSave() {
  const props = makeNavProps() as Parameters<typeof PersonalInfoScreen>[0];
  const utils = await render(<PersonalInfoScreen {...props} />);
  await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

  const toggle = utils.getByTestId('toggle-edit-btn');
  // 1ª pulsación → modo edición; 2ª → guardar
  await act(async () => {
    fireEvent.press(toggle);
  });
  await act(async () => {
    fireEvent.press(toggle);
  });
  return utils;
}

describe('PersonalInfoScreen — feedback al fallar el guardado', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetUser.mockResolvedValue({
      Name: 'María esperanza',
      LastName: 'Gil Calderón',
      PhoneNumber: '+573000000002',
      Email: null,
    });
    mockGetUVAByID.mockResolvedValue({
      latitude: '4.71',
      longitude: '-74.07',
      altitude: '2600',
      fields: JSON.stringify({ farmName: 'Finca A', villageName: 'Vereda B', townName: 'Municipio C' }),
    });
    mockUpdateUser.mockResolvedValue({});
    mockUpdateUVA.mockResolvedValue({});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('REGRESIÓN: si updateUser rechaza → toast de error y NO se sale de modo edición', async () => {
    mockUpdateUser.mockRejectedValue(
      new Error("Cannot return null for non-nullable type: 'ID' within parent 'UVA'"),
    );

    const { getByTestId } = await renderAndSave();

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });

    // El botón sigue diciendo "Guardar cambios" → seguimos en modo edición
    await waitFor(() =>
      expect(getByTestId('toggle-edit-btn')).toHaveTextContent('Guardar cambios'),
    );
  });

  it('si updateUVA rechaza → también avisa (el fallo de ubicación no se traga)', async () => {
    mockUpdateUVA.mockRejectedValue(new Error('network'));

    await renderAndSave();

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      ),
    );
  });

  it('camino feliz: sin toast de error y vuelve a modo lectura ("Editar datos")', async () => {
    const { getByTestId } = await renderAndSave();

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1));
    expect(mockShowToast).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getByTestId('toggle-edit-btn')).toHaveTextContent('Editar datos'),
    );
  });
});
