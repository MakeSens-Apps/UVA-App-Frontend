/**
 * B10 — UI Primitives unit tests
 *
 * Gate requirements (plan.md §B10):
 *   1. ConfirmModal resolves Promise<'OK'|'CANCEL'>
 *   2. ProgressBar snapshot + text "Progreso: x de y"
 *   3. Day snapshot — states: complete (icon), saveStreak, today, empty cell
 *   4. Toast / LoadingOverlay render without crash
 *   5. Suite completa verde; lint verde
 *
 * Risks: R-17, R-08, R-06, R-42, R-24
 */

// ─── Mocks (must come before imports per jest hoisting) ───────────────────────

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('../data/storage/s3', () => ({
  s3Service: {
    listFiles: jest.fn(() => Promise.resolve({ success: false })),
    getFile: jest.fn(() => Promise.resolve({ success: false })),
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

jest.mock('../data/session/session', () => ({
  sessionService: {
    getInfo: jest.fn(() => Promise.resolve({})),
    setInfo: jest.fn(() => Promise.resolve()),
    clearInfo: jest.fn(() => Promise.resolve()),
  },
}));

// react-native-toast-message mock
jest.mock('react-native-toast-message', () => {
  const MockToast = (): null => null;
  MockToast.show = jest.fn();
  MockToast.hide = jest.fn();
  return MockToast;
});

// @gorhom/bottom-sheet mock — inline factory avoids require() in module body
jest.mock('@gorhom/bottom-sheet', () => {
  // jest.mock factory runs in the hoisted zone — React/RN available via jest globals
  const MockBottomSheet = jest
    .fn()
    .mockImplementation(({ children }: { children: React.ReactNode }) => children);
  const MockBottomSheetView = ({ children }: { children: React.ReactNode }) => children;
  const MockBottomSheetBackdrop = (): null => null;
  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetView: MockBottomSheetView,
    BottomSheetBackdrop: MockBottomSheetBackdrop,
  };
});

// ─── Imports ──────────────────────────────────────────────────────────────────

/* eslint-disable import/first */
import React from 'react';
import { View, Pressable, Text, Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import { ConfigContext } from '../state/ConfigContext';
import type { ConfigContextValue } from '../state/ConfigContext';
import { ThemeProvider } from '../theme/ThemeProvider';

import {
  ConfirmModal,
  useConfirmModal,
  ProgressBar,
  Day,
  LoadingOverlay,
  useLoadingOverlay,
} from '../components/ui';
import { showToast, hideToast } from '../components/ui/Toast';
import Toast from 'react-native-toast-message';
/* eslint-enable import/first */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildConfigMock(overrides: Partial<ConfigContextValue> = {}): ConfigContextValue {
  return {
    configApp: null,
    configMeasurement: null,
    configColors: null,
    downLoadData: jest.fn(),
    configExists: jest.fn(),
    getConfigurationApp: jest.fn(),
    getConfigurationMeasurement: jest.fn(),
    getConfigurationColors: jest.fn(),
    loadBranding: jest.fn(),
    loadImage: jest.fn(),
    countTasks: jest.fn(),
    clearCache: jest.fn(),
    ...overrides,
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfigContext.Provider value={buildConfigMock()}>
      <ThemeProvider>{children}</ThemeProvider>
    </ConfigContext.Provider>
  );
}

// ─── ConfirmModal tests ────────────────────────────────────────────────────────

describe('ConfirmModal — resolves OK/CANCEL', () => {
  it('renders when visible=true', async () => {
    const onResult = jest.fn();
    const { getByText } = await render(
      <Wrapper>
        <ConfirmModal
          visible
          content="<p>¿Confirmar acción?</p>"
          textOkButton="Confirmar"
          textCancelButton="Cancelar"
          onResult={onResult}
        />
      </Wrapper>,
    );
    expect(getByText('Confirmar')).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();
  });

  it('does not render when visible=false', async () => {
    const onResult = jest.fn();
    const { queryByText } = await render(
      <Wrapper>
        <ConfirmModal
          visible={false}
          content="<p>Test</p>"
          textOkButton="OK"
          textCancelButton="Cancel"
          onResult={onResult}
        />
      </Wrapper>,
    );
    expect(queryByText('OK')).toBeNull();
  });

  it('calls onResult("OK") when OK button is pressed', async () => {
    const onResult = jest.fn();
    const { getByText } = await render(
      <Wrapper>
        <ConfirmModal
          visible
          content="<p>¿Confirmar?</p>"
          textOkButton="Sí, confirmar"
          textCancelButton="Cancelar"
          onResult={onResult}
        />
      </Wrapper>,
    );
    fireEvent.press(getByText('Sí, confirmar'));
    expect(onResult).toHaveBeenCalledWith('OK');
  });

  it('calls onResult("CANCEL") when CANCEL button is pressed', async () => {
    const onResult = jest.fn();
    const { getByText } = await render(
      <Wrapper>
        <ConfirmModal
          visible
          content="<p>¿Confirmar?</p>"
          textOkButton="OK"
          textCancelButton="No"
          onResult={onResult}
        />
      </Wrapper>,
    );
    fireEvent.press(getByText('No'));
    expect(onResult).toHaveBeenCalledWith('CANCEL');
  });

  it('hides CANCEL button when showCancelButton=false', async () => {
    const onResult = jest.fn();
    const { queryByText } = await render(
      <Wrapper>
        <ConfirmModal
          visible
          content="<p>Info</p>"
          textOkButton="OK"
          showCancelButton={false}
          onResult={onResult}
        />
      </Wrapper>,
    );
    expect(queryByText('Cancelar')).toBeNull();
    expect(queryByText('OK')).toBeTruthy();
  });

  it('renders with HTML content via RichText', async () => {
    const onResult = jest.fn();
    const { toJSON } = await render(
      <Wrapper>
        <ConfirmModal
          visible
          content="<p>¿Estás seguro de <strong>eliminar</strong> este registro?</p>"
          textOkButton="Eliminar"
          textCancelButton="Cancelar"
          onResult={onResult}
        />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('matches snapshot', async () => {
    const onResult = jest.fn();
    const { toJSON } = await render(
      <Wrapper>
        <ConfirmModal
          visible
          content="<p>Contenido del modal</p>"
          textOkButton="Aceptar"
          textCancelButton="Cancelar"
          onResult={onResult}
        />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('useConfirmModal — promise API', () => {
  /**
   * Strategy: render a self-contained component that triggers `show()` in a
   * useEffect on mount, then responds to the result via a state flag.
   * This avoids any need to capture the show function from outside the component.
   */
  it('resolves "OK" when OK button pressed', async () => {
    function TestHarness({ onResolved }: { onResolved: (r: string) => void }) {
      const { confirmModal, show } = useConfirmModal();
      React.useEffect(() => {
        show({
          content: '<p>Test OK</p>',
          textOkButton: 'Confirmar',
          textCancelButton: 'Cancelar',
        }).then(onResolved);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <>{confirmModal}</>;
    }

    const onResolved = jest.fn();
    const { getByText } = await render(
      <Wrapper>
        <TestHarness onResolved={onResolved} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByText('Confirmar')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Confirmar'));
    });

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith('OK');
    });
  });

  it('resolves "CANCEL" when CANCEL button pressed', async () => {
    function TestHarness({ onResolved }: { onResolved: (r: string) => void }) {
      const { confirmModal, show } = useConfirmModal();
      React.useEffect(() => {
        show({
          content: '<p>Test Cancel</p>',
          textOkButton: 'OK',
          textCancelButton: 'No',
        }).then(onResolved);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <>{confirmModal}</>;
    }

    const onResolved = jest.fn();
    const { getByText } = await render(
      <Wrapper>
        <TestHarness onResolved={onResolved} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByText('No')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('No'));
    });

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith('CANCEL');
    });
  });
});

// ─── ProgressBar tests ─────────────────────────────────────────────────────────

describe('ProgressBar', () => {
  it('renders progress text correctly', async () => {
    const { getByText } = await render(
      <Wrapper>
        <ProgressBar currentProgress={3} totalProgress={7} />
      </Wrapper>,
    );
    expect(getByText('Progreso: 3 de 7')).toBeTruthy();
  });

  it('renders with default values (0/1)', async () => {
    const { getByText } = await render(
      <Wrapper>
        <ProgressBar />
      </Wrapper>,
    );
    expect(getByText('Progreso: 0 de 1')).toBeTruthy();
  });

  it('renders "Progreso: 0 de 0" with zero total (guard)', async () => {
    const { getByText } = await render(
      <Wrapper>
        <ProgressBar currentProgress={0} totalProgress={0} />
      </Wrapper>,
    );
    expect(getByText('Progreso: 0 de 0')).toBeTruthy();
  });

  it('renders the fill bar container', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <ProgressBar currentProgress={5} totalProgress={10} />
      </Wrapper>,
    );
    expect(getByTestId('progress-bar-fill')).toBeTruthy();
  });

  it('matches snapshot', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <ProgressBar currentProgress={2} totalProgress={5} />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── Day tests ─────────────────────────────────────────────────────────────────

describe('Day', () => {
  it('renders empty cell when day=0', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={0} />
      </Wrapper>,
    );
    expect(getByTestId('day-empty')).toBeTruthy();
  });

  it('renders zero-padded day (day=5 → "05")', async () => {
    const { getByText } = await render(
      <Wrapper>
        <Day day={5} state="normal" />
      </Wrapper>,
    );
    expect(getByText('05')).toBeTruthy();
  });

  it('renders non-padded day (day=15 → "15")', async () => {
    const { getByText } = await render(
      <Wrapper>
        <Day day={15} state="normal" />
      </Wrapper>,
    );
    expect(getByText('15')).toBeTruthy();
  });

  it('renders complete state without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={10} state="complete" />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-10')).toBeTruthy();
  });

  it('renders saveStreak state without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={20} state="saveStreak" />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-20')).toBeTruthy();
  });

  it('renders today state without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={7} state="today" />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-7')).toBeTruthy();
  });

  it('renders incomplete state without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={3} state="incomplete" />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-3')).toBeTruthy();
  });

  it('renders future state without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={25} state="future" />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-25')).toBeTruthy();
  });

  it('renders none state without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={1} state="none" />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-1')).toBeTruthy();
  });

  it('renders mini calendar variant', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={12} state="complete" isMiniCalendar />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-12')).toBeTruthy();
  });

  it('renders moon calendar variant', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Day day={18} state="normal" isMoonCalendar />
      </Wrapper>,
    );
    expect(getByTestId('day-cell-18')).toBeTruthy();
  });

  it('snapshot — complete state with icon', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <Day day={14} state="complete" />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('snapshot — saveStreak state', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <Day day={21} state="saveStreak" />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('snapshot — today state', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <Day day={6} state="today" />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('snapshot — empty cell', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <Day day={0} />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── LoadingOverlay tests ──────────────────────────────────────────────────────

describe('LoadingOverlay', () => {
  it('renders when visible=true', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <LoadingOverlay visible message="Cargando..." />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders without message', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <LoadingOverlay visible />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('does not render when visible=false', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <LoadingOverlay visible={false} message="Should not show" />
      </Wrapper>,
    );
    expect(toJSON()).toBeNull();
  });
});

describe('useLoadingOverlay', () => {
  it('shows loading overlay on showLoading call', async () => {
    function TestHarness() {
      const { loadingOverlay, showLoading, isLoading } = useLoadingOverlay();
      return (
        <View>
          {loadingOverlay}
          <Pressable testID="show-btn" onPress={() => showLoading('Cargando...')}>
            <Text>Show</Text>
          </Pressable>
          {isLoading && <Text testID="loading-flag">loading</Text>}
        </View>
      );
    }

    const { getByTestId, queryByTestId } = await render(
      <Wrapper>
        <TestHarness />
      </Wrapper>,
    );

    // Initially not loading
    expect(queryByTestId('loading-flag')).toBeNull();

    // After pressing Show, isLoading becomes true
    await act(async () => {
      fireEvent.press(getByTestId('show-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('loading-flag')).toBeTruthy();
    });
  });
});

// ─── Toast tests ───────────────────────────────────────────────────────────────

describe('Toast utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('showToast calls Toast.show with correct type', () => {
    showToast({ message: 'Datos guardados', type: 'success' });
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text1: 'Datos guardados' }),
    );
  });

  it('showToast defaults to "info" type', () => {
    showToast({ message: 'Información' });
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info' }),
    );
  });

  it('showToast uses default duration 3000ms', () => {
    showToast({ message: 'Test' });
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ visibilityTime: 3000 }),
    );
  });

  it('showToast respects custom duration', () => {
    showToast({ message: 'Error', type: 'error', duration: 5000 });
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ visibilityTime: 5000 }),
    );
  });

  it('hideToast calls Toast.hide', () => {
    hideToast();
    expect(Toast.hide).toHaveBeenCalled();
  });

  it('showToast with position bottom', () => {
    showToast({ message: 'Bottom toast', position: 'bottom' });
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'bottom' }),
    );
  });
});

// ─── Alert.alert (AlertController equivalent) test ────────────────────────────

describe('Alert.alert (AlertController equivalent)', () => {
  it('Alert.alert is callable (replaces AlertController.create)', () => {
    // Alert.alert is the RN equivalent of AlertController
    // This test verifies the API contract is understood
    const alertSpy = jest.spyOn(Alert, 'alert');
    Alert.alert('Título', 'Mensaje', [{ text: 'OK' }]);
    expect(alertSpy).toHaveBeenCalledWith(
      'Título',
      'Mensaje',
      expect.arrayContaining([{ text: 'OK' }]),
    );
    alertSpy.mockRestore();
  });
});
