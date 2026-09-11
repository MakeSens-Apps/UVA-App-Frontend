/**
 * Desviación del original a petición del usuario (2026-09-10).
 *
 * Historial: si el usuario está en modo gráfica con una variable seleccionada
 * (p.ej. Hum) y pasa a la vista Año, al tocar un mes la vista de mes debe
 * abrirse EN MODO GRÁFICA con la MISMA variable seleccionada — no volver al
 * calendario como hace el original (`src/app/pages/historical/historical.page.ts:207-236`,
 * que fuerza `typeView='calendar'` y limpia `selected` al venir de la vista Año).
 *
 * Implementación: `HistoricalScreen.tsx` → `goToMonth` ya no resetea
 * `typeView` ni `measureSelected` al venir de Año; el month-load effect
 * (existente, usado también por la navegación con flechas desde el commit
 * 24545a5) reconstruye la gráfica cuando `typeView === 'chart'`, buscando la
 * variable seleccionada por nombre y cayendo a `variables[0]` si no había
 * ninguna.
 *
 * Casos cubiertos:
 *   1. Gráfica con Hum seleccionada → Año → tocar un mes → sigue en gráfica
 *      con Hum seleccionada (se reconstruye la gráfica con esa variable).
 *   2. Calendario → Año → tocar un mes → sigue en calendario (comportamiento
 *      sin cambios cuando no había modo gráfica).
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

// expo-blur mock — BlurView renders as a plain View so its children are queryable
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

// SessionContext mock
jest.mock('@/state/SessionContext', () => ({
  useSessionContext: () => ({
    session: { phone: '+573000000002', userID: 'user-1', uvaID: 'uva-1' },
    isLoaded: true,
    setSession: jest.fn(),
    clearSession: jest.fn(),
    refreshSession: jest.fn(),
  }),
}));

// ConfigContext mock — TWO historical variables (Temperatura, Humedad) so the
// deviation is actually observable (changing selection matters).
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
    humedad: {
      name: 'Humedad',
      sortName: '<b>Hum</b>',
      icon: {
        enable: false,
        name: '',
        colorName: '',
        colorHex: '',
        imagePath: null,
      },
      fields: 1,
      unit: '%',
      range: { min: 20, max: 100, optionalMessage: '' },
      style: {
        backgroundColor: { colorName: 'green', colorHex: '#d1fae5' },
        borderColor: { colorName: 'green', colorHex: '#6dbb63' },
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
    {
      name: 'Humedad',
      symbol: '💧',
      unit: '%',
      measurementIds: ['humedad'],
      aggregationFunction: 'mean',
      style: {
        backgroundColor: { colorName: 'green', colorHex: '#d1fae5' },
        borderColor: { colorName: 'green', colorHex: '#6dbb63' },
      },
      graph: {
        type: 'line',
        measurementIds: ['humedad'],
        aggregationFunction: 'mean',
        style: {
          backgroundColor: { colorName: 'green', colorHex: '#d1fae5' },
          borderColor: { colorName: 'green', colorHex: '#6dbb63' },
        },
      },
    },
  ],
};

const mockConfigContextValue = {
  configMeasurement: mockMeasurementConfig,
  countTasks: () => 2,
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

// Calendar mock (month view + year view mini-calendars both use this component)
jest.mock('@/components/calendar/Calendar', () => ({
  Calendar: ({ onDayPress }: { onDayPress?: (d: unknown) => void }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="calendar-mock">
        <TouchableOpacity
          testID="calendar-day-complete"
          onPress={() =>
            onDayPress?.({ date: new Date('2026-05-10'), state: 'complete' })
          }
        >
          <Text>Day</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// TimeFrame mock
jest.mock('@/components/time-frame/TimeFrame', () => ({
  TimeFrame: ({
    onSegmentChange,
  }: {
    onSegmentChange?: (v: string) => void;
  }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="time-frame-mock">
        <TouchableOpacity
          testID="tf-month"
          onPress={() => onSegmentChange?.('month')}
        >
          <Text>Mes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="tf-year"
          onPress={() => onSegmentChange?.('year')}
        >
          <Text>Año</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Areachart mock — exposes borderColor so the test can tell WHICH variable's
// chart got rendered (Tem vs Hum) after the month-load effect rebuilds it.
jest.mock('@/components/areachart/Areachart', () => ({
  Areachart: ({
    borderColor,
    chartData,
  }: {
    borderColor?: string;
    chartData?: number[];
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="areachart-mock">
        <Text testID="areachart-border-color">{borderColor}</Text>
        <Text testID="areachart-count">{String(chartData?.length ?? 0)}</Text>
      </View>
    );
  },
}));

// Toast mock
jest.mock('@/components/ui/Toast', () => ({
  showToast: jest.fn(),
  hideToast: jest.fn(),
  ToastComponent: () => null,
}));

// MeasurementDSService mock
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

// UserProgressDSService mock
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

// UserDSService / UvaDSService mocks (transitive via EnvironmentalReport)
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

// EnvironmentalReportService mock (short-circuits the share flow's DataStore chain)
jest.mock('@/domain/report/environmental-report', () => ({
  EnvironmentalReportService: {
    generateReportData: jest.fn().mockResolvedValue(null),
  },
}));

// react-native-view-shot / expo-sharing / expo-linear-gradient mocks
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

// Navigation mock
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

const RAW_MEASUREMENTS = [
  {
    data: { temperatura: 25, humedad: 60 },
    ts: new Date(CURRENT_YEAR, CURRENT_MONTH, 5, 10).toISOString(),
  },
  {
    data: { temperatura: 27, humedad: 65 },
    ts: new Date(CURRENT_YEAR, CURRENT_MONTH, 6, 10).toISOString(),
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
  // Same shape for every month/year queried — the test does not care about
  // per-month streak details, only that the calendar/mini-calendars render.
  mockGetCompletedTasksByMonthYear.mockResolvedValue({
    daysComplete: [],
    daysIncomplete: [],
    daysSaveStreak: [],
  });
  mockGetMeasurementsByMont.mockResolvedValue(RAW_MEASUREMENTS);
  mockGetMeasurementsByDateRange.mockResolvedValue(RAW_MEASUREMENTS);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Historial — Año → mes conserva modo gráfica y variable (deviación 2026-09-10)', () => {
  it('gráfica con Humedad seleccionada → Año → tocar un mes → sigue en gráfica con Humedad', async () => {
    const { getByTestId, queryByTestId, getAllByTestId } = await render(
      <HistoricalScreen />,
    );

    // Wait for the initial month view to render.
    await waitFor(() => {
      expect(queryByTestId('calendar-mock')).not.toBeNull();
    });

    // Switch to chart mode (selects Temperatura, the first variable, by default).
    fireEvent.press(getByTestId('toggle-view-btn'));
    await waitFor(() => {
      expect(queryByTestId('areachart-mock')).not.toBeNull();
    });
    await waitFor(() => {
      expect(getByTestId('areachart-border-color').props.children).toBe(
        '#10BCCA',
      );
    });

    // Select Humedad explicitly.
    fireEvent.press(getByTestId('variable-card-Humedad'));
    await waitFor(() => {
      expect(getByTestId('areachart-border-color').props.children).toBe(
        '#6dbb63',
      );
    });

    // Go to the Año (year) view.
    fireEvent.press(getByTestId('tf-year'));
    await waitFor(() => {
      // Year view shows the mini-calendars grid instead of the month card.
      expect(queryByTestId('month-cell-0')).not.toBeNull();
    });
    // Month view content (toggle button / Areachart) is unmounted while in Año.
    expect(queryByTestId('areachart-mock')).toBeNull();

    // Tap a month cell (the current month, so completedTaskMonth resolves).
    fireEvent.press(getByTestId(`month-cell-${CURRENT_MONTH}`));

    // Back in month view, still in CHART mode, still showing Humedad.
    await waitFor(() => {
      expect(queryByTestId('areachart-mock')).not.toBeNull();
    });
    await waitFor(() => {
      expect(getByTestId('areachart-border-color').props.children).toBe(
        '#6dbb63',
      );
    });
    // Toggle button still offers to switch to "calendario" (i.e. we are in chart mode).
    const toggleText = getAllByTestId('toggle-view-btn')[0];
    expect(toggleText).toBeTruthy();
    expect(queryByTestId('calendar-mock')).toBeNull();

    // The chart was actually rebuilt for the target month (not stale).
    expect(mockGetMeasurementsByMont).toHaveBeenCalledWith(
      CURRENT_YEAR,
      CURRENT_MONTH,
    );
  });

  it('calendario → Año → tocar un mes → sigue en calendario (sin cambios)', async () => {
    const { getByTestId, queryByTestId } = await render(<HistoricalScreen />);

    await waitFor(() => {
      expect(queryByTestId('calendar-mock')).not.toBeNull();
    });
    // Stay in calendar mode (default) — never toggled to chart.

    fireEvent.press(getByTestId('tf-year'));
    await waitFor(() => {
      expect(queryByTestId('month-cell-0')).not.toBeNull();
    });

    fireEvent.press(getByTestId(`month-cell-${CURRENT_MONTH}`));

    await waitFor(() => {
      expect(queryByTestId('calendar-mock')).not.toBeNull();
    });
    // No chart was built/shown.
    expect(queryByTestId('areachart-mock')).toBeNull();
  });
});
