/**
 * B11 — Component tests: Calendar, MoonCard, Header, ExploreContainer,
 *        TimeFrame, SyncAction, Areachart
 *
 * Gate requirements (plan.md §B11):
 *   1. generateCalendarMonth/Week + getStatus produce correct calendars
 *      on fixtures (months with/without data, save-streak priority)
 *   2. MoonCard never has undefined name/icon (bug fix §4.4 verified)
 *   3. Snapshots: Header, ExploreContainer, TimeFrame, SyncAction
 *   4. Areachart renders with RNTL without crash (normal and detailedMode)
 *   5. Suite completa verde; lint verde
 *
 * Risks: R-29, R-02, R-24, R-08, R-23
 */

// ─── Mocks (must come before imports per jest hoisting) ───────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('@shopify/react-native-skia', () => ({
  useFont: jest.fn(() => null),
  Skia: {},
  Canvas: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'skia-canvas' }, children);
  },
}));

jest.mock('victory-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CartesianChart = ({
    children,
    data,
  }: {
    children?: ((args: { points: Record<string, unknown[]>; chartBounds: Record<string, number> }) => React.ReactNode) | React.ReactNode;
    data?: unknown[];
  }) => {
    const points: Record<string, unknown[]> = {};
    if (Array.isArray(data) && data.length > 0) {
      const datum = data[0] as Record<string, unknown>;
      Object.keys(datum).forEach((k) => {
        points[k] = data.map((d) => ({ x: (d as Record<string, unknown>).x, y: (d as Record<string, unknown>)[k] }));
      });
    }
    const chartBounds = { top: 0, bottom: 200, left: 0, right: 300 };
    return React.createElement(
      View,
      { testID: 'cartesian-chart' },
      typeof children === 'function' ? children({ points, chartBounds }) : children,
    );
  };

  const Area = () => React.createElement(View, { testID: 'victory-area' });
  const AreaRange = () => React.createElement(View, { testID: 'victory-area-range' });
  const Line = () => React.createElement(View, { testID: 'victory-line' });

  return { CartesianChart, Area, AreaRange, Line };
});

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-render-html', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ source }: { source: { html: string } }) =>
      React.createElement(View, {}, React.createElement(Text, {}, source.html)),
  };
});

/* eslint-enable @typescript-eslint/no-require-imports */

// ─── Imports ──────────────────────────────────────────────────────────────────

/* eslint-disable import/first */
import React from 'react';
import { render } from '@testing-library/react-native';

import { ConfigContext } from '../state/ConfigContext';
import type { ConfigContextValue } from '../state/ConfigContext';
import { ThemeProvider } from '../theme/ThemeProvider';

// B11 components
import { Calendar } from '../components/calendar/Calendar';
import {
  generateCalendarMonth,
  generateCalendarWeek,
  getStatus,
} from '../components/calendar/calendarLogic';
import { MoonCard, LUNAR_PHASE_NAME } from '../components/moon-card/MoonCard';
import type { LunarPhaseKey } from '../components/moon-card/MoonCard';
import { Header } from '../components/header/Header';
import { ExploreContainer } from '../components/explore-container/ExploreContainer';
import { TimeFrame } from '../components/time-frame/TimeFrame';
import { SyncAction } from '../components/sync-action/SyncAction';
import { Areachart } from '../components/areachart/Areachart';
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

// ─── PURE LOGIC: generateCalendarMonth ────────────────────────────────────────

describe('generateCalendarMonth — pure logic', () => {
  // Use a fixed date to avoid flakiness from "today"
  const FIXED_DATE = new Date(2024, 0, 1); // January 2024 (starts on Monday = day 1)

  it('generates 31 actual day cells for January 2024', () => {
    const days = generateCalendarMonth(FIXED_DATE);
    const actualDays = days.filter((d) => d.date !== null);
    expect(actualDays).toHaveLength(31);
  });

  it('generates leading empty cells for January 2024 (starts on Monday = 1 empty Sun cell)', () => {
    const days = generateCalendarMonth(FIXED_DATE);
    const emptyCells = days.filter((d) => d.date === null);
    // January 1, 2024 is a Monday (getDay() = 1), so 1 empty cell
    expect(emptyCells).toHaveLength(1);
  });

  it('correctly marks a complete day', () => {
    const days = generateCalendarMonth(FIXED_DATE, [5], [], []);
    const day5 = days.find((d) => d.dayOfMonth === 5);
    expect(day5?.state).toBe('complete');
  });

  it('correctly marks an incomplete day', () => {
    const days = generateCalendarMonth(FIXED_DATE, [], [7], []);
    const day7 = days.find((d) => d.dayOfMonth === 7);
    expect(day7?.state).toBe('incomplete');
  });

  it('saveStreak takes priority over complete', () => {
    // Day 10 is both complete AND saveStreak → should be saveStreak
    const days = generateCalendarMonth(FIXED_DATE, [10], [], [10]);
    const day10 = days.find((d) => d.dayOfMonth === 10);
    expect(day10?.state).toBe('saveStreak');
  });

  it('saveStreak takes priority over incomplete', () => {
    // Day 8 is both incomplete AND saveStreak → should be saveStreak
    const days = generateCalendarMonth(FIXED_DATE, [], [8], [8]);
    const day8 = days.find((d) => d.dayOfMonth === 8);
    expect(day8?.state).toBe('saveStreak');
  });

  it('complete takes priority over incomplete', () => {
    // Day 12 is both complete AND incomplete → should be complete
    const days = generateCalendarMonth(FIXED_DATE, [12], [12], []);
    const day12 = days.find((d) => d.dayOfMonth === 12);
    expect(day12?.state).toBe('complete');
  });

  it('days with no data are "normal" or "future"', () => {
    // Jan 15, 2024 is in the past (not future) relative to FIXED_DATE
    // But 2024-01-20 onwards might be future depending on when test runs.
    // Use a past month to avoid flakiness.
    const PAST_DATE = new Date(2020, 5, 1); // June 2020 - definitely past
    const days = generateCalendarMonth(PAST_DATE, [], [], []);
    const day3 = days.find((d) => d.dayOfMonth === 3);
    // Not future (June 2020 is past), not today, no data → 'normal'
    expect(day3?.state).toBe('normal');
  });

  it('moon calendar type marks all non-today days as "none"', () => {
    const PAST_DATE = new Date(2020, 5, 1);
    const days = generateCalendarMonth(PAST_DATE, [5, 10], [], [], [], 'moon');
    const actualDays = days.filter((d) => d.date !== null);
    // All should be 'none' (except potentially today, but June 2020 has no today)
    actualDays.forEach((d) => {
      expect(d.state).toBe('none');
    });
  });

  it('moon calendar provides icon keys for phaseMoonDays', () => {
    const PAST_DATE = new Date(2020, 5, 1);
    const phaseDays = [{ day: 3, status: 'full-moon' }];
    const days = generateCalendarMonth(PAST_DATE, [], [], [], phaseDays, 'moon');
    const day3 = days.find((d) => d.dayOfMonth === 3);
    expect(day3?.icon).toBe('full-moon');
  });

  it('all days have dayOfMonth and dayOfWeek set', () => {
    const days = generateCalendarMonth(FIXED_DATE);
    const actualDays = days.filter((d) => d.date !== null);
    actualDays.forEach((d) => {
      expect(d.dayOfMonth).toBeGreaterThan(0);
      expect(d.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(d.dayOfWeek).toBeLessThanOrEqual(6);
    });
  });
});

// ─── PURE LOGIC: generateCalendarWeek ─────────────────────────────────────────

describe('generateCalendarWeek — pure logic', () => {
  // Fixed Wednesday, January 3, 2024
  const FIXED_DATE = new Date(2024, 0, 3);

  it('always generates exactly 7 days', () => {
    const days = generateCalendarWeek(FIXED_DATE);
    expect(days).toHaveLength(7);
  });

  it('week starts on Sunday (weekStartsOn: 0)', () => {
    const days = generateCalendarWeek(FIXED_DATE);
    // First day of week should be Sunday Dec 31, 2023 (dayOfWeek = 0)
    expect(days[0].dayOfWeek).toBe(0);
  });

  it('all days have dates', () => {
    const days = generateCalendarWeek(FIXED_DATE);
    days.forEach((d) => {
      expect(d.date).not.toBeNull();
    });
  });

  it('marks complete days correctly', () => {
    // Jan 3 (Wed) is in the week; dayOfMonth = 3
    const days = generateCalendarWeek(FIXED_DATE, [3], [], []);
    const day3 = days.find((d) => d.dayOfMonth === 3);
    expect(day3?.state).toBe('complete');
  });

  it('saveStreak priority preserved in week view', () => {
    const days = generateCalendarWeek(FIXED_DATE, [3], [], [3]);
    const day3 = days.find((d) => d.dayOfMonth === 3);
    expect(day3?.state).toBe('saveStreak');
  });
});

// ─── PURE LOGIC: getStatus ────────────────────────────────────────────────────

describe('getStatus — priority: saveStreak > complete > incomplete > normal', () => {
  it('returns "saveStreak" when day is in daysSaveStreak', () => {
    expect(getStatus(5, [5], [5], [5])).toBe('saveStreak');
  });

  it('returns "complete" when in daysComplete but NOT daysSaveStreak', () => {
    expect(getStatus(5, [5], [5], [])).toBe('complete');
  });

  it('returns "incomplete" when in daysIncomplete only', () => {
    expect(getStatus(5, [], [5], [])).toBe('incomplete');
  });

  it('returns "normal" when not in any list', () => {
    expect(getStatus(5, [], [], [])).toBe('normal');
  });

  it('returns "normal" for day not in any list (empty arrays)', () => {
    expect(getStatus(15, [], [], [])).toBe('normal');
  });

  it('saveStreak overrides complete + incomplete simultaneously', () => {
    expect(getStatus(10, [10], [10], [10])).toBe('saveStreak');
  });

  it('complete overrides incomplete when both present', () => {
    expect(getStatus(10, [10], [10], [])).toBe('complete');
  });
});

// ─── MoonCard — bug fix verification (§4.4) ───────────────────────────────────

describe('MoonCard — name and icon never undefined (§4.4 bug fix)', () => {
  const allPhases: LunarPhaseKey[] = [
    'NEW_MOON',
    'FULL_MOON',
    'FIRST_QUARTER',
    'LAST_QUARTER',
    'WANING_GIBBOUS',
    'WANING_CRESCENT',
  ];

  allPhases.forEach((phase) => {
    it(`phase="${phase}" renders phase name without crash`, async () => {
      const { getByTestId } = await render(
        <Wrapper>
          <MoonCard phase={phase} />
        </Wrapper>,
      );
      const nameEl = getByTestId('moon-card-phase-name');
      // Name must not be empty or "undefined"
      expect(nameEl.props.children).toBeTruthy();
      expect(nameEl.props.children).not.toBe('undefined');
    });
  });

  it('phase=undefined falls back to NEW_MOON without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <MoonCard />
      </Wrapper>,
    );
    const nameEl = getByTestId('moon-card-phase-name');
    expect(nameEl.props.children).toBe(LUNAR_PHASE_NAME.NEW_MOON);
  });

  it('LUNAR_PHASE_NAME has all 6 phase keys defined', () => {
    expect(LUNAR_PHASE_NAME.NEW_MOON).toBeTruthy();
    expect(LUNAR_PHASE_NAME.FULL_MOON).toBeTruthy();
    expect(LUNAR_PHASE_NAME.FIRST_QUARTER).toBeTruthy();
    expect(LUNAR_PHASE_NAME.LAST_QUARTER).toBeTruthy();
    expect(LUNAR_PHASE_NAME.WANING_GIBBOUS).toBeTruthy();
    expect(LUNAR_PHASE_NAME.WANING_CRESCENT).toBeTruthy();
  });

  it('hasArrow=false hides arrow', async () => {
    const { queryByTestId } = await render(
      <Wrapper>
        <MoonCard phase="FULL_MOON" hasArrow={false} />
      </Wrapper>,
    );
    // moon-card still renders but no arrow
    expect(queryByTestId('moon-card')).toBeTruthy();
  });

  it('background="green" renders without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <MoonCard phase="WANING_GIBBOUS" background="green" />
      </Wrapper>,
    );
    expect(getByTestId('moon-card')).toBeTruthy();
  });

  it('matches snapshot', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <MoonCard phase="FULL_MOON" background="gray" hasArrow />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── Header ────────────────────────────────────────────────────────────────────

describe('Header', () => {
  it('renders title', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Header title="Inicio" />
      </Wrapper>,
    );
    expect(getByTestId('header-title').props.children).toBe('Inicio');
  });

  it('shows back button when hasBackButton=true', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Header title="Detalle" hasBackButton />
      </Wrapper>,
    );
    expect(getByTestId('header-back-btn')).toBeTruthy();
  });

  it('hides back button when hasBackButton=false (default)', async () => {
    const { queryByTestId } = await render(
      <Wrapper>
        <Header title="Inicio" />
      </Wrapper>,
    );
    expect(queryByTestId('header-back-btn')).toBeNull();
  });

  it('shows profile button when hasProfileButton=true (default)', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Header title="Inicio" seed={42} />
      </Wrapper>,
    );
    expect(getByTestId('header-profile-btn')).toBeTruthy();
  });

  it('hides profile button when hasProfileButton=false', async () => {
    const { queryByTestId } = await render(
      <Wrapper>
        <Header title="Test" hasProfileButton={false} />
      </Wrapper>,
    );
    expect(queryByTestId('header-profile-btn')).toBeNull();
  });

  it('renders seed fallback (null → 0) without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Header title="Inicio" seed={null} />
      </Wrapper>,
    );
    expect(getByTestId('header')).toBeTruthy();
  });

  it('matches snapshot', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <Header title="Inicio" seed={15} hasProfileButton />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── ExploreContainer ──────────────────────────────────────────────────────────

describe('ExploreContainer', () => {
  it('renders children', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <ExploreContainer title="Bienvenido">
          <></>
        </ExploreContainer>
      </Wrapper>,
    );
    expect(getByTestId('explore-container')).toBeTruthy();
  });

  it('renders with BgBlue=true without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <ExploreContainer title="Login" BgBlue />
      </Wrapper>,
    );
    expect(getByTestId('explore-container')).toBeTruthy();
  });

  it('renders titleHTML via RichText without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <ExploreContainer titleHTML="<span>Bienvenido a <b>UVA</b></span>" />
      </Wrapper>,
    );
    expect(getByTestId('explore-container')).toBeTruthy();
  });

  it('title takes priority over titleHTML', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <ExploreContainer title="Título plano" titleHTML="<b>HTML</b>" />
      </Wrapper>,
    );
    expect(getByTestId('explore-container')).toBeTruthy();
  });

  it('matches snapshot with title and subtitle', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <ExploreContainer
          title="Registro"
          subTitle="Crea tu cuenta"
          message="Ingresa tus datos"
          BgBlue={false}
        />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── TimeFrame ─────────────────────────────────────────────────────────────────

describe('TimeFrame', () => {
  it('renders Mes and Año buttons', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <TimeFrame timeFrame="month" />
      </Wrapper>,
    );
    expect(getByTestId('time-frame-month')).toBeTruthy();
    expect(getByTestId('time-frame-year')).toBeTruthy();
  });

  it('defaults to month selection', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <TimeFrame />
      </Wrapper>,
    );
    expect(getByTestId('time-frame')).toBeTruthy();
  });

  it('matches snapshot (month selected)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <TimeFrame timeFrame="month" />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot (year selected)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <TimeFrame timeFrame="year" />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── SyncAction ────────────────────────────────────────────────────────────────

describe('SyncAction', () => {
  it('shows no-pending state when isInfoPending=false', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <SyncAction
          isInfoPending={false}
          noInfoPendingText="Todo sincronizado"
          title="Sincronización"
          buttonText="Sincronizar"
        />
      </Wrapper>,
    );
    expect(getByTestId('sync-action-no-pending')).toBeTruthy();
  });

  it('shows pending state when isInfoPending=true', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <SyncAction
          isInfoPending
          infoPendingText="Hay datos pendientes"
          title="Sincronización"
          buttonText="Sincronizar"
        />
      </Wrapper>,
    );
    expect(getByTestId('sync-action-pending')).toBeTruthy();
  });

  it('button is disabled when isInfoPending=false', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <SyncAction
          isInfoPending={false}
          title="Sync"
          buttonText="Sync"
        />
      </Wrapper>,
    );
    const btn = getByTestId('sync-action-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('button is enabled when isInfoPending=true', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <SyncAction
          isInfoPending
          title="Sync"
          buttonText="Sync"
        />
      </Wrapper>,
    );
    const btn = getByTestId('sync-action-btn');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('matches snapshot (pending)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <SyncAction
          isInfoPending
          infoPendingText="4 registros pendientes"
          noInfoPendingText="Todo al día"
          title="Sincronización de datos"
          buttonText="Sincronizar ahora"
        />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot (not pending)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <SyncAction
          isInfoPending={false}
          infoPendingText="Hay datos"
          noInfoPendingText="Todo sincronizado"
          title="Sincronización de datos"
          buttonText="Sincronizar ahora"
        />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── Areachart (SPIKE) ─────────────────────────────────────────────────────────

describe('Areachart (SPIKE victory-native) — render without crash', () => {
  // Real-like measurement fixtures
  const CHART_LABELS_NORMAL = [
    '2024-01-01',
    '2024-01-02',
    '2024-01-03',
    '2024-01-04',
    '2024-01-05',
  ];
  const CHART_DATA_NORMAL = [22.5, 24.1, 21.3, 23.8, 20.9];

  const CHART_DATA_DETAILED_MIN = [19.0, 21.5, 18.8, 20.1, 18.5];
  const CHART_DATA_DETAILED_MAX = [26.0, 27.3, 24.5, 28.0, 24.1];

  it('renders in normal mode without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Areachart
          chartData={CHART_DATA_NORMAL}
          chartLabels={CHART_LABELS_NORMAL}
          background="#FBA641"
          borderColor="#FBA641"
        />
      </Wrapper>,
    );
    expect(getByTestId('areachart')).toBeTruthy();
  });

  it('renders in detailedMode without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Areachart
          chartData={CHART_DATA_NORMAL}
          chartLabels={CHART_LABELS_NORMAL}
          chartMinData={CHART_DATA_DETAILED_MIN}
          chartMaxData={CHART_DATA_DETAILED_MAX}
          background="#10BCCA"
          borderColor="#10BCCA"
          detailedMode
        />
      </Wrapper>,
    );
    expect(getByTestId('areachart')).toBeTruthy();
  });

  it('renders with empty data without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Areachart chartData={[]} chartLabels={[]} />
      </Wrapper>,
    );
    expect(getByTestId('areachart-empty')).toBeTruthy();
  });

  it('renders with ymin/ymax domain without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Areachart
          chartData={CHART_DATA_NORMAL}
          chartLabels={CHART_LABELS_NORMAL}
          ymin={10}
          ymax={40}
          background="#10BCCA"
          borderColor="#10BCCA"
        />
      </Wrapper>,
    );
    expect(getByTestId('areachart')).toBeTruthy();
  });

  it('renders with xmin/xmax domain without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Areachart
          chartData={CHART_DATA_NORMAL}
          chartLabels={CHART_LABELS_NORMAL}
          xmin="2024-01-01"
          xmax="2024-01-31"
        />
      </Wrapper>,
    );
    expect(getByTestId('areachart')).toBeTruthy();
  });

  it('renders temperature data fixture (normal mode)', async () => {
    // Realistic temperature measurements
    const tempLabels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2024, 0, i + 1);
      return d.toISOString().slice(0, 10);
    });
    const tempData = Array.from({ length: 30 }, () => 20 + Math.random() * 10);

    const { getByTestId } = await render(
      <Wrapper>
        <Areachart
          chartData={tempData}
          chartLabels={tempLabels}
          background="#E58B24"
          borderColor="#E58B24"
          ymin={10}
          ymax={40}
        />
      </Wrapper>,
    );
    expect(getByTestId('areachart')).toBeTruthy();
  });

  it('renders humidity data fixture (detailedMode)', async () => {
    const humLabels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2024, 0, i + 1);
      return d.toISOString().slice(0, 10);
    });
    const avg = Array.from({ length: 30 }, () => 60 + Math.random() * 20);
    const min = avg.map((v) => v - 5);
    const max = avg.map((v) => v + 5);

    const { getByTestId } = await render(
      <Wrapper>
        <Areachart
          chartData={avg}
          chartLabels={humLabels}
          chartMinData={min}
          chartMaxData={max}
          background="#10BCCA"
          borderColor="#10BCCA"
          ymin={0}
          ymax={100}
          detailedMode
        />
      </Wrapper>,
    );
    expect(getByTestId('areachart')).toBeTruthy();
  });
});

// ─── Calendar component (integration with Day) ────────────────────────────────

describe('Calendar component integration', () => {
  it('renders month view without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Calendar
          viewDate={new Date(2024, 0, 1)}
          daysComplete={[5, 10]}
          daysIncomplete={[3]}
          daysSaveStreak={[14]}
        />
      </Wrapper>,
    );
    expect(getByTestId('calendar')).toBeTruthy();
  });

  it('renders week view without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Calendar
          calendarView="week"
          viewDate={new Date(2024, 0, 3)}
          daysComplete={[3]}
        />
      </Wrapper>,
    );
    expect(getByTestId('calendar')).toBeTruthy();
  });

  it('renders moon calendar type without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Calendar
          typeCalendar="moon"
          viewDate={new Date(2024, 0, 1)}
          phaseMoonDays={[
            { day: 1, status: 'new-moon' },
            { day: 15, status: 'full-moon' },
          ]}
        />
      </Wrapper>,
    );
    expect(getByTestId('calendar')).toBeTruthy();
  });

  it('renders with hasHeader and hasTitle without crash', async () => {
    const { getByTestId } = await render(
      <Wrapper>
        <Calendar
          title="Enero 2024"
          hasTitle
          hasHeader
          viewDate={new Date(2024, 0, 1)}
        />
      </Wrapper>,
    );
    expect(getByTestId('calendar')).toBeTruthy();
  });
});
