/**
 * Device review 2026-09-10 — Historial: cambiar de mes con las flechas
 * (Mayo → Abril) en modo gráfica seguía mostrando, durante un momento, la
 * gráfica y las tarjetas Tem/Hum/Acu de Mayo hasta que llegaban los datos de
 * Abril (initializeVariables/updateChartData son asíncronos y no había
 * ninguna señal de carga para ese tramo).
 *
 * Fix en `HistoricalScreen.tsx`:
 *   - Nuevo estado `monthLoading`, activado (con un pequeño retraso —
 *     CONTENT_LOADER_DELAY_MS — para no parpadear en la carga típica, casi
 *     instantánea, de DataStore local) mientras el month-load effect
 *     recarga registros/variables/gráfica tras un cambio de mes (flechas,
 *     segmento Mes/Año, o tap desde Año).
 *   - Mientras `monthLoading` es true: el área de calendario/gráfica muestra
 *     el mismo loader (ActivityIndicator) que ya se usaba para la carga de
 *     página completa, y las tarjetas Tem/Hum/Acu muestran un placeholder
 *     ('–') en vez de los valores (potencialmente obsoletos) del mes
 *     anterior.
 *   - Header y segmento Mes/Año NO se desmontan; `typeView` y la variable
 *     seleccionada NO se resetean — sólo cambia qué se renderiza mientras
 *     los datos nuevos llegan.
 *
 * Este test usa un mock controlable (una promesa que se resuelve a mano)
 * para `MeasurementDSService.getMeasurementsByMont` de forma que se pueda
 * observar el estado "cargando" antes de resolverlo.
 */

// ─── Suppress noisy console output ───────────────────────────────────────────
// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { HistoricalScreen } from '@/screens/historical/HistoricalScreen';

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: {
          50: '#EFF9FB',
          200: '#a5f3fc',
          500: '#10BCCA',
          600: '#0da8b6',
          700: '#14788A',
          900: '#164551',
        },
        green: { 500: '#6dbb63', 700: '#4a9c40' },
        white: '#FFFFFF',
        gray: {
          50: '#FAFAFA',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
        },
        orange: { 50: '#FFF7ED', 500: '#f97316', 700: '#C2410C' },
        danger: '#E5245E',
        background: '#f9fafb',
      },
      semanticColors: {
        primary: '#10BCCA',
        background: '#f9fafb',
        text: '#1a1a1a',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
      },
      typography: { sizes: { base: 16, sm: 14, lg: 18, xl: 22, xs: 12 } },
      spacing: { xs: 4, sm: 8, md: 16 },
      brandingOverrides: {},
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

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

jest.mock('@/state/SessionContext', () => ({
  useSessionContext: () => ({
    session: { phone: '+573000000002', userID: 'user-1', uvaID: 'uva-1' },
    isLoaded: true,
    setSession: jest.fn(),
    clearSession: jest.fn(),
    refreshSession: jest.fn(),
  }),
}));

// ConfigContext mock — a single historical variable (Temperatura) is enough
// to prove the loader/placeholder behavior.
const mockMeasurementConfig = {
  tasks: {},
  flows: {},
  guides: {},
  measurements: {
    temperatura: {
      name: 'Temperatura',
      sortName: '<b>Temp</b>',
      icon: {
        enable: false,
        name: '',
        colorName: '',
        colorHex: '',
        imagePath: null,
      },
      fields: 1,
      unit: '°C',
      range: { min: 10, max: 45, optionalMessage: '' },
      style: {
        backgroundColor: { colorName: 'blue', colorHex: '#EFF9FB' },
        borderColor: { colorName: 'blue', colorHex: '#10BCCA' },
      },
    },
  },
  bonus: {},
  historical: [
    {
      name: 'Temperatura',
      symbol: '🌡',
      unit: '°C',
      measurementIds: ['temperatura'],
      aggregationFunction: 'mean',
      style: {
        backgroundColor: { colorName: 'blue', colorHex: '#EFF9FB' },
        borderColor: { colorName: 'blue', colorHex: '#10BCCA' },
      },
      graph: {
        type: 'line',
        measurementIds: ['temperatura'],
        aggregationFunction: 'mean',
        style: {
          backgroundColor: { colorName: 'blue', colorHex: '#EFF9FB' },
          borderColor: { colorName: 'blue', colorHex: '#10BCCA' },
        },
      },
    },
  ],
};

const mockConfigContextValue = {
  configMeasurement: mockMeasurementConfig,
  countTasks: () => 1,
  loadImage: jest.fn().mockResolvedValue(null),
  getConfigurationMeasurement: jest
    .fn()
    .mockResolvedValue(mockMeasurementConfig),
  configApp: null,
  configColors: null,
  getConfigurationApp: jest.fn(),
  getConfigurationColors: jest.fn(),
  downLoadData: jest.fn(),
  configExists: jest.fn(),
  clearCache: jest.fn(),
  loadBranding: jest.fn(),
};

jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => mockConfigContextValue,
}));

// Calendar mock
jest.mock('@/components/calendar/Calendar', () => ({
  Calendar: () => {
    const { View } = require('react-native');
    return <View testID="calendar-mock" />;
  },
}));

// TimeFrame mock (segment not exercised in this test, kept minimal)
jest.mock('@/components/time-frame/TimeFrame', () => ({
  TimeFrame: () => {
    const { View } = require('react-native');
    return <View testID="time-frame-mock" />;
  },
}));

// Areachart mock — exposes chartData length so the test can tell whether the
// chart reflects the OLD or the NEW month's data.
jest.mock('@/components/areachart/Areachart', () => ({
  Areachart: ({ chartData }: { chartData?: number[] }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="areachart-mock">
        <Text testID="areachart-count">{String(chartData?.length ?? 0)}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/ui/Toast', () => ({
  showToast: jest.fn(),
  hideToast: jest.fn(),
  ToastComponent: () => null,
}));

// MeasurementDSService mock — getMeasurementsByMont is the one this test
// controls to simulate a slow month load.
const mockGetMeasurementsByMont = jest.fn();
const mockGetMeasurementsByDateRange = jest.fn();
jest.mock('@/data/datastore/measurement-ds', () => ({
  MeasurementDSService: {
    getMeasurementsByDay: jest.fn().mockResolvedValue([]),
    getMeasurementsByMont: (...a: unknown[]) => mockGetMeasurementsByMont(...a),
    getMeasurementsByDateRange: (...a: unknown[]) =>
      mockGetMeasurementsByDateRange(...a),
  },
}));

const mockGetLastUserProgressPure = jest.fn();
const mockGetCompletedTasksByMonthYear = jest.fn();
const mockGetCountTasksByMonthYear = jest.fn();
jest.mock('@/data/datastore/user-progress-ds', () => ({
  UserProgressDSService: {
    getLastUserProgressPure: (...a: unknown[]) =>
      mockGetLastUserProgressPure(...a),
    getCompletedTasksByMonthYear: (...a: unknown[]) =>
      mockGetCompletedTasksByMonthYear(...a),
    getCountTasksByMonthYear: (...a: unknown[]) =>
      mockGetCountTasksByMonthYear(...a),
    recalculateDailyProgress: jest.fn().mockResolvedValue(undefined),
    getCompleteTaskWeek: jest
      .fn()
      .mockResolvedValue({
        daysComplete: [],
        daysIncomplete: [],
        daysSaveStreak: [],
      }),
  },
}));

jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: {
    getUser: jest.fn().mockResolvedValue(null),
    updateUser: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/data/datastore/uva-ds', () => ({
  UvaDSService: {
    getUVAByID: jest.fn().mockResolvedValue(undefined),
    getUVAByuserID: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/domain/report/environmental-report', () => ({
  EnvironmentalReportService: {
    generateReportData: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn().mockResolvedValue('file:///tmp/report.png'),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    push: jest.fn(),
  }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
  useRoute: () => ({ params: {} }),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const REAL_NOW = new Date();
const CURRENT_YEAR = REAL_NOW.getFullYear();
const CURRENT_MONTH = REAL_NOW.getMonth(); // 0-based
const PREV_MONTH = CURRENT_MONTH - 1 < 0 ? 11 : CURRENT_MONTH - 1;
const PREV_MONTH_YEAR = CURRENT_MONTH - 1 < 0 ? CURRENT_YEAR - 1 : CURRENT_YEAR;

// Month A (current month, shown on mount): daily avgs 20 and 30 → avg 25, max 30, min 20.
const MONTH_A_MEASUREMENTS = [
  {
    data: { temperatura: 20 },
    ts: new Date(CURRENT_YEAR, CURRENT_MONTH, 5, 10).toISOString(),
  },
  {
    data: { temperatura: 30 },
    ts: new Date(CURRENT_YEAR, CURRENT_MONTH, 6, 10).toISOString(),
  },
];

// Month B (previous month, target of the "←" arrow): daily avgs 10 and 14 → avg 12, max 14, min 10.
const MONTH_B_MEASUREMENTS = [
  {
    data: { temperatura: 10 },
    ts: new Date(PREV_MONTH_YEAR, PREV_MONTH, 5, 10).toISOString(),
  },
  {
    data: { temperatura: 14 },
    ts: new Date(PREV_MONTH_YEAR, PREV_MONTH, 6, 10).toISOString(),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLastUserProgressPure.mockResolvedValue({
    Seed: 10,
    Streak: 3,
    ts: new Date().toISOString(),
  });
  mockGetCountTasksByMonthYear.mockResolvedValue(5);
  mockGetCompletedTasksByMonthYear.mockResolvedValue({
    daysComplete: [],
    daysIncomplete: [],
    daysSaveStreak: [],
  });
  mockGetMeasurementsByDateRange.mockResolvedValue([]);
});

describe('Historial — loader de contenido al cambiar de mes (device review 2026-09-10)', () => {
  it('flecha ← con carga lenta: muestra el loader (no el valor anterior) y luego el nuevo valor', async () => {
    // Fast resolution for the initial mount (current month, chart mode).
    mockGetMeasurementsByMont.mockResolvedValue(MONTH_A_MEASUREMENTS);

    const { getByTestId, queryByTestId } = await render(<HistoricalScreen />);

    await waitFor(() => {
      expect(queryByTestId('calendar-mock')).not.toBeNull();
    });

    // Switch to chart mode → selects Temperatura (the only variable).
    fireEvent.press(getByTestId('toggle-view-btn'));
    await waitFor(() => {
      expect(getByTestId('variable-avg-Temperatura').props.children).toBe(
        '25°C',
      );
    });
    expect(getByTestId('variable-max-Temperatura').props.children).toBe('30°C');
    expect(getByTestId('variable-min-Temperatura').props.children).toBe('20°C');
    expect(queryByTestId('areachart-mock')).not.toBeNull();

    // Now make the NEXT month's fetch hang until we resolve it by hand —
    // this is what lets the test observe the "loading" state in between.
    let resolvePending: (value: typeof MONTH_B_MEASUREMENTS) => void = () => {};
    const pending = new Promise<typeof MONTH_B_MEASUREMENTS>((resolve) => {
      resolvePending = resolve;
    });
    mockGetMeasurementsByMont.mockImplementation(() => pending);

    // Navigate to the previous month via the arrow.
    fireEvent.press(getByTestId('month-nav-prev'));

    // While the fetch is pending: content loader visible, chart/cards hidden
    // or placeholder'd — crucially, NOT still showing May's (25°C) value.
    await waitFor(
      () => {
        expect(queryByTestId('historical-month-loading')).not.toBeNull();
      },
      { timeout: 2000 },
    );
    expect(queryByTestId('areachart-mock')).toBeNull();
    expect(queryByTestId('calendar-mock')).toBeNull();
    expect(getByTestId('variable-avg-Temperatura').props.children).toBe('–');
    expect(getByTestId('variable-avg-Temperatura').props.children).not.toBe(
      '25°C',
    );

    // Header and Mes/Año segment stay mounted throughout.
    expect(queryByTestId('time-frame-mock')).not.toBeNull();

    // Resolve the pending fetch — the new month's data lands.
    resolvePending(MONTH_B_MEASUREMENTS);

    await waitFor(() => {
      expect(queryByTestId('historical-month-loading')).toBeNull();
    });
    await waitFor(() => {
      expect(getByTestId('variable-avg-Temperatura').props.children).toBe(
        '12°C',
      );
    });
    expect(getByTestId('variable-max-Temperatura').props.children).toBe('14°C');
    expect(getByTestId('variable-min-Temperatura').props.children).toBe('10°C');
    // Still in chart mode (typeView/measureSelected were not reset).
    expect(queryByTestId('areachart-mock')).not.toBeNull();
    expect(queryByTestId('calendar-mock')).toBeNull();
  });

  it('flecha ← con carga rápida: no muestra el loader (evita parpadeo bajo el umbral)', async () => {
    mockGetMeasurementsByMont.mockResolvedValue(MONTH_A_MEASUREMENTS);

    const { getByTestId, queryByTestId } = await render(<HistoricalScreen />);
    await waitFor(() => {
      expect(queryByTestId('calendar-mock')).not.toBeNull();
    });

    fireEvent.press(getByTestId('toggle-view-btn'));
    await waitFor(() => {
      expect(getByTestId('variable-avg-Temperatura').props.children).toBe(
        '25°C',
      );
    });

    // Next month resolves immediately (well under CONTENT_LOADER_DELAY_MS).
    mockGetMeasurementsByMont.mockResolvedValue(MONTH_B_MEASUREMENTS);
    fireEvent.press(getByTestId('month-nav-prev'));

    await waitFor(() => {
      expect(getByTestId('variable-avg-Temperatura').props.children).toBe(
        '12°C',
      );
    });
    // The loader never had a reason to appear for a near-instant resolution.
    expect(queryByTestId('historical-month-loading')).toBeNull();
  });
});
