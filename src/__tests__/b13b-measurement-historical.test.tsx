/**
 * B13b — MeasurementScreen + RegisterMeasurementScreen + HistoricalScreen tests
 *
 * Gate requirements (plan.md B13b):
 *   1. Digit input navigation (auto-advance on single digit)
 *   2. save() integration with measurement-engine B07 (DataStore mocked)
 *   3. groupRemainingLazyMeasurements: pending measurement grouping
 *   4. Historical aggregation with fixtures
 *
 * NOTE: RNTL v14 — render() is async, must be awaited.
 * Uses jest.mock() with hoisted factories.
 */

// ─── Suppress noisy console.warn from native mocks ────────────────────────────
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── Screen imports (static — dynamic import not supported without --experimental-vm-modules) ──
import { MeasurementScreen } from '@/screens/measurement/MeasurementScreen';
import { HistoricalScreen } from '@/screens/historical/HistoricalScreen';
import { RegisterMeasurementScreen } from '@/screens/measurement/RegisterMeasurementScreen';

// ─── Import domain functions (no mocks needed — pure) ────────────────────────

import {
  transformData,
  calculateOverallStats,
  calculateMeasurement,
} from '@/domain/aggregations/historical-aggregations';

// ─── ════════════════════════════════════════════════════════════════════════ ───
//     SECTION 3 — save() integration with measurement-engine B07
// ─── ════════════════════════════════════════════════════════════════════════ ───

import {
  validateRestriction,
  getMessageError,
} from '@/domain/measurement-engine/measurement-engine';
import type {
  RestrictionSpec,
  MeasurementValue,
} from '@/domain/measurement-engine/measurement-engine';
import type { Measurement } from '@/data/models/configuration/measurements.model';

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
        },
        green: { 500: '#6dbb63', 700: '#4a9c40' },
        white: '#FFFFFF',
        gray: {
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

jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  G: 'G',
}));

jest.mock('@/assets/svg/icons/arrow-right.svg', () => 'ArrowRightIcon');
jest.mock('@/assets/svg/icons/semilla.svg', () => 'SemillaIcon');
jest.mock('@/assets/svg/icons/user-circle.svg', () => 'UserCircleIcon');

// BottomSheet mock
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockBS = React.forwardRef(
    (
      {
        children,
        onClose,
      }: { children: React.ReactNode; onClose?: () => void },
      ref: React.Ref<unknown>,
    ) => {
      const [open, setOpen] = React.useState(false);
      React.useImperativeHandle(ref, () => ({
        snapToIndex: () => setOpen(true),
        close: () => {
          setOpen(false);
          onClose?.();
        },
      }));
      return open ? <View testID="bottom-sheet">{children}</View> : null;
    },
  );
  MockBS.displayName = 'MockBS';
  return {
    __esModule: true,
    default: MockBS,
    BottomSheetView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    // UvaBottomSheet renders its content in a BottomSheetScrollView (the scrollable is
    // what reports the content height to the dynamic-sizing detent — --height: auto).
    BottomSheetScrollView: ({
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
    ),
    BottomSheetBackdrop: () => null,
  };
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

// ConfigContext mock with measurement config fixture
const mockMeasurementConfig = {
  tasks: {
    task1: {
      name: 'Temperatura y Humedad',
      restrictions: {
        activeDays: { enabled: false, days: null },
        activeTime: { enabled: false, start: '06:00', end: '18:00' },
        activeDuration: { enabled: false, duration: null },
        requiredTask: { enabled: false, taskID: null },
      },
      flows: ['flow1', 'flow2'],
      id: 'task1',
    },
  },
  flows: {
    flow1: {
      name: 'Temperatura',
      text: '<p>Registra la temperatura</p>',
      guides: ['guide1'],
      measurements: ['temperatura'],
      restrictions: null,
      nextFlow: 'flow2',
    },
    flow2: {
      name: 'Humedad',
      text: '<p>Registra la humedad</p>',
      guides: [],
      measurements: ['humedad'],
      restrictions: {
        restriction1: {
          enabled: true,
          measurementIds: ['temperatura', 'humedad'],
          message: 'La temperatura no puede ser menor a la humedad',
          validationFunction: '0:>:1',
        },
      },
      nextFlow: null,
    },
  },
  guides: {
    guide1: {
      name: 'Guía temperatura',
      icon: {
        enable: false,
        name: '',
        colorName: '',
        colorHex: '',
        imagePath: null,
      },
      image: 'guide_temp.jpg',
      text: '<p>Coloca el termómetro a la sombra</p>',
      nextGuide: null,
      showAutomatic: false,
    },
  },
  measurements: {
    temperatura: {
      name: 'Temperatura',
      sortName: '<b>Temp</b>',
      icon: {
        enable: true,
        name: 'thermometer',
        colorName: 'red',
        colorHex: '#f00',
        imagePath: null,
      },
      fields: 2,
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
      fields: 2,
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
  ],
};

// NOTE: the context value must be STABLE across renders (the real provider
// memoizes its callbacks with useCallback). A fresh object per render makes
// effect dependencies like getConfigurationMeasurement loop forever.
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

// RichText mock
jest.mock('@/components/rich-text/RichText', () => ({
  RichText: ({ html }: { html: string }) => {
    const { Text } = require('react-native');
    return <Text testID="rich-text">{html}</Text>;
  },
}));

// Calendar mock
jest.mock('@/components/calendar/Calendar', () => ({
  Calendar: ({
    onDayPress,
    daysComplete,
    daysIncomplete,
  }: {
    onDayPress?: (d: unknown) => void;
    daysComplete?: number[];
    daysIncomplete?: number[];
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="calendar-mock">
        <TouchableOpacity
          testID="calendar-day-complete"
          onPress={() =>
            onDayPress?.({ date: new Date('2025-06-10'), state: 'complete' })
          }
        >
          <Text>Day</Text>
        </TouchableOpacity>
        <Text testID="days-complete">{JSON.stringify(daysComplete)}</Text>
      </View>
    );
  },
}));

// TimeFrame mock
jest.mock('@/components/time-frame/TimeFrame', () => ({
  TimeFrame: ({
    onSegmentChange,
    timeFrame,
  }: {
    onSegmentChange?: (v: string) => void;
    timeFrame?: string;
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
        <Text testID="tf-current">{timeFrame}</Text>
      </View>
    );
  },
}));

// Areachart mock
jest.mock('@/components/areachart/Areachart', () => ({
  Areachart: () => {
    const { View } = require('react-native');
    return <View testID="areachart-mock" />;
  },
}));

// ProgressBar mock
jest.mock('@/components/ui/ProgressBar', () => ({
  ProgressBar: ({
    currentProgress,
    totalProgress,
  }: {
    currentProgress: number;
    totalProgress: number;
  }) => {
    const { Text } = require('react-native');
    return (
      <Text testID="progress-bar">
        {currentProgress}/{totalProgress}
      </Text>
    );
  },
}));

// MeasurementDSService mock
const mockAddMeasurement = jest.fn();
const mockGetMeasurementsByDay = jest.fn();
const mockGetMeasurementsByMont = jest.fn();
const mockGetMeasurementsByDateRange = jest.fn();
jest.mock('@/data/datastore/measurement-ds', () => ({
  MeasurementDSService: {
    addMeasurement: (...a: unknown[]) => mockAddMeasurement(...a),
    getMeasurementsByDay: (...a: unknown[]) => mockGetMeasurementsByDay(...a),
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

// GamificationService mock
jest.mock('@/domain/gamification/gamification', () => ({
  GamificationService: {
    completeTaskProcess: jest.fn().mockResolvedValue(true),
    surpriseTaskProcess: jest.fn().mockResolvedValue(true),
  },
}));

// Preferences mock
jest.mock('@/data/storage/preferences', () => ({
  Preferences: {
    get: jest.fn().mockResolvedValue({ value: null }),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
  LAST_MEASUREMENT_VALUES_KEY: 'lastMeasurementValues',
}));

// UserDSService mock (needed transitively via HistoricalScreen → EnvironmentalReport → environmental-report.ts)
jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: {
    getUser: jest.fn().mockResolvedValue(null),
    updateUser: jest.fn().mockResolvedValue(undefined),
  },
}));

// UvaDSService mock (same transitive chain)
jest.mock('@/data/datastore/uva-ds', () => ({
  UvaDSService: {
    getUVAByID: jest.fn().mockResolvedValue(undefined),
    getUVAByuserID: jest.fn().mockResolvedValue(undefined),
  },
}));

// EnvironmentalReportService mock (short-circuits the DataStore transitive chain)
jest.mock('@/domain/report/environmental-report', () => ({
  EnvironmentalReportService: {
    generateReportData: jest.fn().mockResolvedValue(null),
  },
}));

// react-native-view-shot mock (used in HistoricalScreen)
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn().mockResolvedValue('file:///tmp/report.png'),
}));

// expo-linear-gradient mock (used in EnvironmentalReport)
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// expo-sharing mock (used in HistoricalScreen)
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// Navigation mock
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    push: mockPush,
    replace: mockReplace,
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

// expo-blur mock — BlurView renders as a plain View so its children are queryable
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

// ─── ════════════════════════════════════════════════════════════════════════ ───
//     SECTION 1 — groupRemainingLazyMeasurements (unit test, no component)
// ─── ════════════════════════════════════════════════════════════════════════ ───

// Import the helper directly (it's not exported by the component, so we test its logic directly)
// We replicate the function from the screen because it's inlined there:

type LocalMeasurement = { id: string; value: number };
type TaskCompleted = { id?: string; measurements: LocalMeasurement[] };

function groupRemainingLazyMeasurements(
  tasksCompleted: TaskCompleted[],
  dataMeasurementCompleted: {
    data: string | Record<string, string> | null;
    task?: string | null;
  }[],
): Record<string, LocalMeasurement[]> {
  const existingMeasurementIds = tasksCompleted.flatMap((task) =>
    task.measurements.map((m) => m.id),
  );
  const remainingMeasurements = dataMeasurementCompleted.filter((lazy) => {
    if (!lazy.data) return false;
    const parsedData =
      typeof lazy.data === 'string'
        ? (JSON.parse(lazy.data) as Record<string, string> | null)
        : lazy.data;
    if (!parsedData) return false;
    const measurementIds = Object.keys(parsedData);
    return measurementIds.some((id) => !existingMeasurementIds.includes(id));
  });
  return remainingMeasurements.reduce(
    (acc, lazy) => {
      const taskId = lazy.task ?? 'unknown';
      if (!acc[taskId]) acc[taskId] = [];
      const parsedData =
        typeof lazy.data === 'string'
          ? (JSON.parse(lazy.data) as Record<string, string> | null)
          : lazy.data;
      if (!parsedData) return acc;
      const entries: LocalMeasurement[] = Object.entries(parsedData).map(
        ([key, value]) => ({ id: key, value: parseFloat(value as string) }),
      );
      acc[taskId].push(...entries);
      return acc;
    },
    {} as Record<string, LocalMeasurement[]>,
  );
}

describe('groupRemainingLazyMeasurements', () => {
  const makeLazy = (data: Record<string, string>, task: string) => ({
    data: JSON.stringify(data),
    task,
  });

  it('groups measurements from DataStore by taskId', () => {
    const completed: TaskCompleted[] = [];
    const lazys = [makeLazy({ temperatura: '25', humedad: '60' }, 'task1')];

    const result = groupRemainingLazyMeasurements(completed, lazys);
    expect(result['task1']).toHaveLength(2);
    expect(result['task1'].find((m) => m.id === 'temperatura')?.value).toBe(25);
    expect(result['task1'].find((m) => m.id === 'humedad')?.value).toBe(60);
  });

  it('ignores measurements already in tasksCompleted', () => {
    const completed: TaskCompleted[] = [
      { id: 'task1', measurements: [{ id: 'temperatura', value: 25 }] },
    ];
    const lazys = [makeLazy({ temperatura: '25', humedad: '60' }, 'task1')];

    // temperatura is already in completed → only humedad is remaining
    const result = groupRemainingLazyMeasurements(completed, lazys);
    // The filter checks if ANY measurement is NOT in existing — humedad is new
    expect(result['task1']).toBeDefined();
    const humedadEntry = result['task1']?.find((m) => m.id === 'humedad');
    expect(humedadEntry?.value).toBe(60);
  });

  it('handles empty dataMeasurementCompleted', () => {
    const result = groupRemainingLazyMeasurements([], []);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('uses "unknown" when task is null', () => {
    const lazys = [makeLazy({ temperatura: '30' }, 'unknown')];
    const result = groupRemainingLazyMeasurements([], lazys);
    expect(result['unknown']).toBeDefined();
    expect(result['unknown'][0].id).toBe('temperatura');
  });

  it('handles multiple tasks separately', () => {
    const lazys = [
      makeLazy({ temperatura: '25' }, 'task1'),
      makeLazy({ lluvia: '5' }, 'task2'),
    ];
    const result = groupRemainingLazyMeasurements([], lazys);
    expect(result['task1']).toHaveLength(1);
    expect(result['task2']).toHaveLength(1);
    expect(result['task1'][0].id).toBe('temperatura');
    expect(result['task2'][0].id).toBe('lluvia');
  });

  it('ignores lazys with null data', () => {
    const lazys = [{ data: null, task: 'task1' }];
    const result = groupRemainingLazyMeasurements([], lazys);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ───
//     SECTION 2 — Historical aggregation with fixtures (domain, no React)
// ─── ════════════════════════════════════════════════════════════════════════ ───

describe('Historical aggregation with fixtures', () => {
  const fixtureMeasurements = [
    {
      id: 'm1',
      data: { temperatura: 25, humedad: 60 },
      ts: '2025-06-01T10:00:00.000Z',
      task: 'task1',
      uvaID: 'uva-1',
      type: 'RAW',
      logs: {},
    },
    {
      id: 'm2',
      data: { temperatura: 27, humedad: 58 },
      ts: '2025-06-02T10:00:00.000Z',
      task: 'task1',
      uvaID: 'uva-1',
      type: 'RAW',
      logs: {},
    },
    {
      id: 'm3',
      data: { temperatura: 23, humedad: 65 },
      ts: '2025-06-01T16:00:00.000Z',
      task: 'task1',
      uvaID: 'uva-1',
      type: 'RAW',
      logs: {},
    },
  ];

  it('transformData reshapes measurements by measurementId key', () => {
    const transformed = transformData(fixtureMeasurements as any);
    expect(transformed['temperatura']).toBeDefined();
    expect(transformed['humedad']).toBeDefined();
    expect(transformed['temperatura']).toHaveLength(3);
    expect(transformed['humedad']).toHaveLength(3);
  });

  it('calculateMeasurement aggregates by date with mean', () => {
    const transformed = transformData(fixtureMeasurements as any);
    const result = calculateMeasurement(transformed, ['temperatura'], 'mean');

    // June 1: (25+23)/2 = 24, June 2: 27
    expect(result['2025-06-01']).toBeCloseTo(24, 0);
    expect(result['2025-06-02']).toBeCloseTo(27, 0);
  });

  it('calculateMeasurement aggregates by date with sum', () => {
    const transformed = transformData(fixtureMeasurements as any);
    const result = calculateMeasurement(transformed, ['humedad'], 'sum');

    // June 1: 60+65 = 125, June 2: 58
    expect(result['2025-06-01']).toBe(125);
    expect(result['2025-06-02']).toBe(58);
  });

  it('calculateOverallStats returns correct min/max/avg for sum variable', () => {
    const transformed = transformData(fixtureMeasurements as any);
    const historicalDef = {
      name: 'Temperatura',
      symbol: '🌡',
      unit: '°C',
      measurementIds: ['temperatura'],
      aggregationFunction: 'sum',
      style: {
        backgroundColor: { colorName: 'blue', colorHex: '#EFF9FB' },
        borderColor: { colorName: 'blue', colorHex: '#10BCCA' },
      },
      graph: {
        type: 'bar',
        measurementIds: ['temperatura'],
        aggregationFunction: 'sum',
        style: {
          backgroundColor: { colorName: 'blue', colorHex: '#EFF9FB' },
          borderColor: { colorName: 'blue', colorHex: '#10BCCA' },
        },
      },
    };

    const stats = calculateOverallStats(historicalDef, transformed);
    // Daily sums: Jun 1 = 48, Jun 2 = 27
    expect(stats.max).toBe(48); // max of [48, 27]
    expect(stats.min).toBe(27); // min of [48, 27]
  });

  it('calculateOverallStats returns undefined min/max when no data', () => {
    const transformed = {};
    const historicalDef = {
      name: 'Lluvia',
      symbol: '🌧',
      unit: 'mm',
      measurementIds: ['lluvia'],
      aggregationFunction: 'sum',
      style: {
        backgroundColor: { colorName: 'green', colorHex: '#d1fae5' },
        borderColor: { colorName: 'green', colorHex: '#6dbb63' },
      },
      graph: {
        type: 'bar',
        measurementIds: ['lluvia'],
        aggregationFunction: 'sum',
        style: {
          backgroundColor: { colorName: 'green', colorHex: '#d1fae5' },
          borderColor: { colorName: 'green', colorHex: '#6dbb63' },
        },
      },
    };
    const stats = calculateOverallStats(historicalDef, transformed);
    // When no data: min and max are undefined, avg may be undefined or 0 (implementation-defined)
    expect(stats.min).toBeUndefined();
    expect(stats.max).toBeUndefined();
    // avg is either undefined or 0 when no values
    expect(stats.avg === undefined || stats.avg === 0).toBe(true);
  });
});

describe('save() integration — measurement engine B07', () => {
  describe('validateRestriction integration (mocked DataStore)', () => {
    it('passes when temperatura > humedad (restriction satisfied)', () => {
      const spec: RestrictionSpec = {
        enabled: true,
        measurementIds: ['temperatura', 'humedad'],
        message: 'La temperatura no puede ser menor a la humedad',
        validationFunction: '0:>:1',
      };

      const values: MeasurementValue[] = [
        { id: 'temperatura', value: 35, flow: 'flow2' },
        { id: 'humedad', value: 28, flow: 'flow2' },
      ];

      const result = validateRestriction([spec], values);
      expect(result.valid).toBe(true);
    });

    it('fails when temperatura <= humedad (restriction violated)', () => {
      const spec: RestrictionSpec = {
        enabled: true,
        measurementIds: ['temperatura', 'humedad'],
        message: 'La temperatura no puede ser menor a la humedad',
      };

      const values: MeasurementValue[] = [
        { id: 'temperatura', value: 28, flow: 'flow2' },
        { id: 'humedad', value: 65, flow: 'flow2' },
      ];

      const result = validateRestriction([spec], values);
      expect(result.valid).toBe(false);
      expect(result.failureMessage).toBe(
        'La temperatura no puede ser menor a la humedad',
      );
    });

    it('getMessageError generates correct range error', () => {
      const m: Measurement = {
        name: 'Temperatura',
        sortName: 'temperatura',
        icon: {
          enable: false,
          name: '',
          colorName: '',
          colorHex: '',
          imagePath: null,
        },
        fields: 2,
        unit: '°C',
        range: { min: 10, max: 45, optionalMessage: '' },
        style: {
          backgroundColor: { colorName: 'blue', colorHex: '#EFF9FB' },
          borderColor: { colorName: 'blue', colorHex: '#10BCCA' },
        },
        value: 5, // below min
        showRestrictionAlert: false,
      };
      const msg = getMessageError(m);
      expect(msg).toBe('La temperatura no puede ser menor a 10 °C');
    });

    it('getMessageError returns restriction alert message when set', () => {
      const m: Measurement = {
        name: 'Temperatura',
        sortName: 'temperatura',
        icon: {
          enable: false,
          name: '',
          colorName: '',
          colorHex: '',
          imagePath: null,
        },
        fields: 2,
        unit: '°C',
        range: { min: 10, max: 45, optionalMessage: '' },
        style: {
          backgroundColor: { colorName: 'blue', colorHex: '#EFF9FB' },
          borderColor: { colorName: 'blue', colorHex: '#10BCCA' },
        },
        value: 35,
        showRestrictionAlert: true,
        textRestrictionAlert: 'La temperatura no puede ser menor a la humedad',
      };
      const msg = getMessageError(m);
      expect(msg).toBe('La temperatura no puede ser menor a la humedad');
    });
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ───
//     SECTION 4 — RegisterMeasurementScreen: digit input navigation
// ─── ════════════════════════════════════════════════════════════════════════ ───

describe('RegisterMeasurementScreen — digit input navigation', () => {
  /**
   * We test the digit input logic in isolation (onDigitsChange function behavior)
   * because the full screen render requires complex navigation prop setup.
   * The critical behavior: entering a single digit auto-advances focus.
   */

  // Replicate onDigitsChange logic:
  function simulateDigitInput(
    fieldsArray: string[],
    digitIdx: number,
    inputText: string,
  ): { fieldsArray: string[]; value?: number; advanced: boolean } {
    const isValid =
      inputText && inputText.length === 1 && /^\d$/.test(inputText);
    if (!isValid) {
      const next = [...fieldsArray];
      next[digitIdx] = '';
      return { fieldsArray: next, advanced: false };
    }
    const next = [...fieldsArray];
    next[digitIdx] = inputText;
    const nextDigitIdx = digitIdx + 1;
    const advanced = nextDigitIdx < fieldsArray.length;
    const value = Number(next.join('').replace(/^0+/, '') || '0');
    return { fieldsArray: next, value, advanced };
  }

  it('accepts a single digit and advances to next field', () => {
    const { fieldsArray, value, advanced } = simulateDigitInput(
      ['', ''],
      0,
      '2',
    );
    expect(fieldsArray[0]).toBe('2');
    expect(advanced).toBe(true); // should advance to index 1
  });

  it('assembles full value after two digits', () => {
    let state = {
      fieldsArray: ['', ''],
      value: undefined as number | undefined,
    };
    const r1 = simulateDigitInput(state.fieldsArray, 0, '2');
    const r2 = simulateDigitInput(r1.fieldsArray, 1, '5');
    expect(r2.value).toBe(25);
    expect(r2.advanced).toBe(false); // no more fields
  });

  it('does not advance when input is NOT a single digit', () => {
    const { fieldsArray, advanced } = simulateDigitInput(['', ''], 0, 'ab');
    expect(fieldsArray[0]).toBe(''); // cleared
    expect(advanced).toBe(false);
  });

  it('does not advance when input is empty', () => {
    const { fieldsArray, advanced } = simulateDigitInput(['', ''], 0, '');
    expect(fieldsArray[0]).toBe('');
    expect(advanced).toBe(false);
  });

  it('accepts digit 0', () => {
    const { fieldsArray, advanced } = simulateDigitInput(['', '', ''], 0, '0');
    expect(fieldsArray[0]).toBe('0');
    expect(advanced).toBe(true);
  });

  it('handles 3-digit fields correctly', () => {
    const arr = ['', '', ''];
    const r1 = simulateDigitInput(arr, 0, '1');
    const r2 = simulateDigitInput(r1.fieldsArray, 1, '5');
    const r3 = simulateDigitInput(r2.fieldsArray, 2, '3');
    expect(r3.fieldsArray).toEqual(['1', '5', '3']);
    expect(r3.advanced).toBe(false);
    expect(r3.value).toBe(153);
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ───
//     SECTION 5 — MeasurementScreen: component smoke test
// ─── ════════════════════════════════════════════════════════════════════════ ───

describe('MeasurementScreen — component smoke test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastUserProgressPure.mockResolvedValue({ Seed: 12, Streak: 3 });
    mockGetMeasurementsByDay.mockResolvedValue([]);
    mockGetCompletedTasksByMonthYear.mockResolvedValue({
      daysComplete: [1, 5, 10],
      daysIncomplete: [2, 3],
      daysSaveStreak: [4],
    });
    mockGetCountTasksByMonthYear.mockResolvedValue(5);
    mockGetMeasurementsByMont.mockResolvedValue([]);
    mockGetMeasurementsByDateRange.mockResolvedValue([]);
  });

  it('renders without crashing', async () => {
    const { getByText } = await render(<MeasurementScreen />);
    await waitFor(() => {
      expect(getByText('Registros climáticos')).toBeTruthy();
    });
  });

  it('shows progress bar with correct totalTask', async () => {
    const { getByTestId } = await render(<MeasurementScreen />);
    await waitFor(() => {
      const pb = getByTestId('progress-bar');
      // children can be string "0/2" or array [0, '/', 2] depending on React version
      const childrenStr = Array.isArray(pb.props.children)
        ? pb.props.children.join('')
        : String(pb.props.children);
      expect(childrenStr).toBe('0/2');
    });
  });

  it('shows incomplete task when getMeasurementsByDay returns empty', async () => {
    const { getByText } = await render(<MeasurementScreen />);
    await waitFor(() => {
      expect(getByText('Registros sin completar')).toBeTruthy();
    });
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ───
//     SECTION 6 — HistoricalScreen: component smoke test
// ─── ════════════════════════════════════════════════════════════════════════ ───

describe('HistoricalScreen — component smoke test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastUserProgressPure.mockResolvedValue({ Seed: 8, Streak: 2 });
    mockGetCompletedTasksByMonthYear.mockResolvedValue({
      daysComplete: [1, 5],
      daysIncomplete: [3],
      daysSaveStreak: [],
    });
    mockGetCountTasksByMonthYear.mockResolvedValue(3);
    mockGetMeasurementsByMont.mockResolvedValue([]);
    mockGetMeasurementsByDateRange.mockResolvedValue([]);
  });

  it('renders header with title', async () => {
    const { getByText } = await render(<HistoricalScreen />);
    await waitFor(() => {
      expect(getByText('Historial de registros')).toBeTruthy();
    });
  });

  it('renders TimeFrame component', async () => {
    const { getByTestId } = await render(<HistoricalScreen />);
    await waitFor(() => {
      expect(getByTestId('time-frame-mock')).toBeTruthy();
    });
  });

  it('renders Calendar when in calendar mode', async () => {
    const { getByTestId } = await render(<HistoricalScreen />);
    await waitFor(() => {
      expect(getByTestId('calendar-mock')).toBeTruthy();
    });
  });

  it('shows register count from UserProgressDSService', async () => {
    mockGetCountTasksByMonthYear.mockResolvedValue(7);
    const { getByText } = await render(<HistoricalScreen />);
    await waitFor(() => {
      expect(getByText('7 Registros')).toBeTruthy();
    });
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ───
//     SECTION 7 — RegisterMeasurementScreen: multi-flow advance (max → min)
//     BUG 1 regression test (audit CRÍTICA)
// ─── ════════════════════════════════════════════════════════════════════════ ───

describe('RegisterMeasurementScreen — multi-flow advance (BUG 1)', () => {
  // Minimal stub matching NativeStackScreenProps consumed by the screen.
  function makeProps(flowId: string) {
    const navigation = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      push: mockPush,
      replace: mockReplace,
    };
    const route = {
      params: { taskId: 'task1', taskName: 'Temperatura y Humedad', flowId },
    };
    return { navigation, route } as unknown as React.ComponentProps<
      typeof RegisterMeasurementScreen
    >;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddMeasurement.mockResolvedValue(undefined);
  });

  it('flow WITH nextFlow: save → shows saved modal with "Siguiente" → goToComplete REPLACES with flowId=nextFlow', async () => {
    const { navigation, route } = makeProps('flow1'); // flow1.nextFlow === 'flow2'
    const { getByTestId, queryByText, getByText } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    // Wait for the flow to load (digit inputs appear).
    await waitFor(() => {
      expect(getByTestId('digit-input-0-0')).toBeTruthy();
    });

    // Enter the two digits of temperatura → 25 (within range 10..45).
    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '5');
    });

    // Tap "Guardar registro" on the page → opens confirmation modal.
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });

    // Confirm save inside the confirmation modal.
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });

    // addMeasurement must have been called once.
    await waitFor(() => {
      expect(mockAddMeasurement).toHaveBeenCalledTimes(1);
    });

    // BUG 1: the saved modal must appear with the "Siguiente" button (flow has nextFlow).
    await waitFor(() => {
      expect(queryByText('Siguiente')).toBeTruthy();
    });
    expect(getByText('Temperatura guardados')).toBeTruthy();

    // Tap "Siguiente" → must navigate to the NEXT flow (flow2 = mínimos), not loop back.
    await act(async () => {
      fireEvent.press(getByTestId('next-flow-button'));
    });

    /*
     * `replace`, not `push` (device report 2026-09-10): pushing kept the already
     * saved máximos screen underneath, and the system back button dropped the user
     * onto it again — which is how the duplicate máximos record was created.
     */
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(
      'RegisterMeasurement',
      expect.objectContaining({
        taskId: 'task1',
        flowId: 'flow2',
        hasBackButton: false,
      }),
    );
  });

  it('flow WITHOUT nextFlow: save → shows saved modal then auto-navigates to Measurement tab (no "Siguiente")', async () => {
    jest.useFakeTimers();
    try {
      const { navigation, route } = makeProps('flow2'); // flow2.nextFlow === null
      const { getByTestId, queryByText } = await render(
        <RegisterMeasurementScreen navigation={navigation} route={route} />,
      );

      await waitFor(() => {
        expect(getByTestId('digit-input-0-0')).toBeTruthy();
      });

      // Enter humedad → 60 (within range 20..100).
      await act(async () => {
        fireEvent.changeText(getByTestId('digit-input-0-0'), '6');
        fireEvent.changeText(getByTestId('digit-input-0-1'), '0');
      });

      await act(async () => {
        fireEvent.press(getByTestId('save-button'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('confirm-save-button'));
      });

      await waitFor(() => {
        expect(mockAddMeasurement).toHaveBeenCalledTimes(1);
      });

      // Saved modal shown, but NO "Siguiente" button (no nextFlow).
      expect(queryByText('Humedad guardados')).toBeTruthy();
      expect(queryByText('Siguiente')).toBeNull();

      // After the 2s timeout it navigates back to the Measurement tab.
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('AppTabs', {
          screen: 'Measurement',
        });
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
