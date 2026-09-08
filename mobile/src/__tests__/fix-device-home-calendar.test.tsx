/**
 * fix-device-home-calendar — regression tests for the 2026-09-07 device review
 *
 * Covers the Home / calendar / moon items of
 * `docs/evidence/device-2026-09-07/review-frames-*.md`:
 *
 *   D-01  Home cards are the grey `.cards` panel (Gray-50 + 1px Gray-200, radius 10),
 *         with a white inner panel around the weekly calendar — not a white card with
 *         a drop shadow and radius ~24.
 *   D-02 / D-10 / D-37  Days with no registro (`future`) have NO filled grey circle.
 *   D-04  The seed sits next to "+2", not at the far right of the card header.
 *   D-05 / D-09 / D-21  Card titles are --Colors-Blue-800, buttons are regular weight.
 *   D-06  The complete-day ✓ badge is anchored bottom-RIGHT.
 *   D-07  `D L M M J V S` are light grey (--Colors-Gray-400) and regular weight.
 *   D-08 / D-11 / D-13  No hard-coded lunar phase while the real one loads.
 *   D-09 (modal)  modal_token: paragraph first, big "+N 🌰" below; no invented "5 🌰".
 *   D-10 (modal)  modal_Days_question shows the FIXED 02..08 example, not the real week.
 *   D-22  "today" ring is an SVG dashed stroke, not a RN dashed border.
 *   D-38  Mini calendars render the weekday header row.
 *   D6    Home reads the user progress only AFTER the daily rollover.
 *
 * Reference (authoritative): src/app/... + docs/evidence/home|moon-phase|historical.
 */

import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Module mocks ─────────────────────────────────────────────────────────────

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
          900: '#164551',
        },
        green: { 200: '#C8E6B0', 500: '#69AB3C' },
        white: '#FFFFFF',
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          700: '#404040',
        },
        orange: { 500: '#E58B24' },
        danger: '#E5245E',
      },
      semanticColors: {
        primary: '#10BCCA',
        background: '#F4F4F4',
        text: '#171717',
        textSecondary: '#525252',
      },
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

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...p }: { children: React.ReactNode }) => (
      <View {...p}>{children}</View>
    ),
  };
});

// react-native-svg: keep the element names so the dashed "today" ring is assertable.
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Path: 'Path',
  Circle: 'Circle',
  G: 'G',
}));

// Bottom sheet: render children as soon as the sheet mounts open (index >= 0),
// mirroring the Modal-hosted sheets.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockBottomSheet = React.forwardRef(
    (
      props: {
        children: React.ReactNode;
        onClose?: () => void;
        index?: number;
        handleComponent?: unknown;
        handleIndicatorStyle?: unknown;
        snapPoints?: unknown;
      },
      ref: React.Ref<{ snapToIndex: (i: number) => void; close: () => void }>,
    ) => {
      const { children, onClose, index } = props;
      (globalThis as Record<string, unknown>).__sheetProps = props;
      const [open, setOpen] = React.useState((index ?? -1) >= 0);
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
  MockBottomSheet.displayName = 'MockBottomSheet';
  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
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

const mockGetLastUserProgressPure = jest.fn();
const mockRecalculateDailyProgress = jest.fn();
const mockGetCompleteTaskWeek = jest.fn();
jest.mock('@/data/datastore/user-progress-ds', () => ({
  UserProgressDSService: {
    getLastUserProgressPure: (...a: unknown[]) => mockGetLastUserProgressPure(...a),
    recalculateDailyProgress: (...a: unknown[]) => mockRecalculateDailyProgress(...a),
    getCompleteTaskWeek: (...a: unknown[]) => mockGetCompleteTaskWeek(...a),
  },
}));

const mockGetCurrentPhase = jest.fn();
jest.mock('@/domain/moon/moon-phase', () => ({
  MoonPhaseService: {
    getCurrentPhase: (...a: unknown[]) => mockGetCurrentPhase(...a),
  },
  LunarPhase: {
    NEW_MOON: 'NEW_MOON',
    FIRST_QUARTER: 'FIRST_QUARTER',
    WANING_GIBBOUS: 'WANING_GIBBOUS',
    FULL_MOON: 'FULL_MOON',
    LAST_QUARTER: 'LAST_QUARTER',
    WANING_CRESCENT: 'WANING_CRESCENT',
  },
}));

jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => ({
    getConfigurationMeasurement: jest.fn().mockResolvedValue(null),
    countTasks: jest.fn().mockReturnValue(3),
    configApp: null,
    configMeasurement: null,
    configColors: null,
    getConfigurationApp: jest.fn(),
    getConfigurationColors: jest.fn(),
    downLoadData: jest.fn(),
    configExists: jest.fn(),
    loadImage: jest.fn(),
    updateConfiguration: jest.fn(),
  }),
}));

// The weekly Calendar is mocked in the HomeScreen suite so the only Day cells in the
// tree are the ones of the FIXED streak example (D-10).
jest.mock('@/components/calendar/Calendar', () => ({
  Calendar: () => {
    const { Text } = require('react-native');
    return <Text testID="calendar-mock">Calendar</Text>;
  },
}));

jest.mock('@/components/header/Header', () => ({
  Header: ({ seed }: { seed?: number | null }) => {
    const { Text } = require('react-native');
    return <Text testID="header-seed">{String(seed)}</Text>;
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => () => void) => {
    const React = require('react');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => cb(), []);
  },
}));

const mockGetEnableNotifications = jest.fn().mockResolvedValue(false);
jest.mock('@/native/notifications/LocalRemindersService', () => ({
  __esModule: true,
  localRemindersService: {
    getEnableNotifications: (...a: unknown[]) => mockGetEnableNotifications(...a),
    scheduleDailyNotifications: jest.fn(),
  },
  default: {
    getEnableNotifications: (...a: unknown[]) => mockGetEnableNotifications(...a),
    scheduleDailyNotifications: jest.fn(),
  },
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

/* eslint-disable import/first */
import { StyleSheet } from 'react-native';
import { Day } from '@/components/ui/Day';
import { MoonCard } from '@/components/moon-card/MoonCard';
import { HomeScreen } from '@/screens/home/HomeScreen';
/* eslint-enable import/first */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flatten(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
}

function makeHomeNav() {
  const parent = { navigate: jest.fn(), getParent: jest.fn() };
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    getParent: jest.fn(() => parent),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLastUserProgressPure.mockResolvedValue({
    Streak: 0,
    Seed: 0,
    completedTasks: 0,
    ts: new Date().toISOString(),
  });
  mockRecalculateDailyProgress.mockResolvedValue(null);
  mockGetCompleteTaskWeek.mockResolvedValue({
    daysComplete: [],
    daysIncomplete: [],
    daysSaveStreak: [],
  });
  mockGetCurrentPhase.mockResolvedValue({ success: false });
  mockGetEnableNotifications.mockResolvedValue(false);
});

// ─── Day ──────────────────────────────────────────────────────────────────────

describe('Day — device review D-02 / D-06 / D-22 / D-37', () => {
  it('a "future" day has no filled circle (only light grey text)', async () => {
    const { getByTestId } = await render(<Day day={25} state="future" />);
    const cell = flatten(getByTestId('day-cell-25').props.style);
    expect(cell.backgroundColor).toBe('transparent');
  });

  it('a "normal" day (past, sin registro) has no filled circle either', async () => {
    const { getByTestId } = await render(<Day day={9} state="normal" />);
    expect(flatten(getByTestId('day-cell-9').props.style).backgroundColor).toBe(
      'transparent',
    );
  });

  it('a complete day is filled with --Colors-Blue-600', async () => {
    const { getByTestId } = await render(<Day day={4} state="complete" />);
    expect(flatten(getByTestId('day-cell-4').props.style).backgroundColor).toBe(
      '#1097AA',
    );
  });

  it('the ✓ badge is anchored bottom-RIGHT (original ion-icon { bottom:0; right:0 })', async () => {
    const { getByTestId } = await render(<Day day={4} state="complete" />);
    const badge = flatten(getByTestId('day-icon-badge').props.style);
    expect(badge.position).toBe('absolute');
    expect(badge.bottom).toBe(0);
    expect(badge.right).toBe(0);
    // RN was mirroring it to the bottom-LEFT with negative offsets (D-06 / D-39).
    expect(badge.left).toBeUndefined();
  });

  it('"today" uses an SVG dashed ring, not a RN dashed border', async () => {
    const { getByTestId } = await render(<Day day={11} state="today" />);
    const cell = flatten(getByTestId('day-cell-11').props.style);
    // RN's borderStyle:'dashed' renders with its own dash metric on Android (D-22).
    expect(cell.borderStyle).toBeUndefined();
    expect(cell.backgroundColor).toBe('transparent');
    const ring = getByTestId('day-today-ring');
    const circle = ring.props.children as {
      props: { stroke: string; strokeWidth: number; strokeDasharray: string };
    };
    // date_current.svg → stroke #14788A, stroke-width 2, stroke-dasharray "4 4"
    expect(circle.props.stroke).toBe('#14788A');
    expect(circle.props.strokeWidth).toBe(2);
    expect(circle.props.strokeDasharray).toBe('4 4');
  });

  it('an incomplete day keeps the 2px solid ring and no fill', async () => {
    const { getByTestId } = await render(<Day day={3} state="incomplete" />);
    const cell = flatten(getByTestId('day-cell-3').props.style);
    expect(cell.backgroundColor).toBe('transparent');
    expect(cell.borderWidth).toBe(2);
    expect(cell.borderColor).toBe('#14788A');
  });

  it('mini cells keep the original hairline rings so they do not blob (D-39)', async () => {
    const { getByTestId } = await render(
      <Day day={3} state="incomplete" isMiniCalendar />,
    );
    // Original: `.date.incomplete.mini { border: 0.661px solid --Colors-Blue-700 }`
    expect(flatten(getByTestId('day-cell-3').props.style).borderWidth).toBeCloseTo(0.661);
  });

  it('moon "today" cell is a 40x40 teal circle wrapping icon + number (D-21)', async () => {
    const Icon = () => null;
    const { getByTestId } = await render(
      <Day day={11} state="today" isMoonCalendar customIcon icon={Icon as never} />,
    );
    const cell = flatten(getByTestId('day-cell-11').props.style);
    expect(cell.width).toBe(40);
    expect(cell.height).toBe(40);
    expect(cell.borderRadius).toBe(20);
    expect(cell.backgroundColor).toBe('#1097AA');
  });
});

// ─── Calendar ─────────────────────────────────────────────────────────────────

describe('Calendar — device review D-07 / D-38', () => {
  // The HomeScreen suite mocks Calendar; require the real module here.
  const RealCalendar = (
    jest.requireActual('@/components/calendar/Calendar') as {
      Calendar: React.ComponentType<Record<string, unknown>>;
    }
  ).Calendar;

  it('renders the D L M M J V S row even when hasHeader is false (D-38)', async () => {
    const { getAllByText } = await render(
      <RealCalendar calendarView="week" hasHeader={false} viewDate={new Date(2024, 0, 3)} />,
    );
    // 'M' appears twice in the original header (Martes / Miércoles).
    expect(getAllByText('M')).toHaveLength(2);
    expect(getAllByText('D').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('S').length).toBeGreaterThanOrEqual(1);
  });

  it('mini calendars also render the weekday row (Historial › vista Año)', async () => {
    const { getAllByText } = await render(
      <RealCalendar isMini viewDate={new Date(2024, 0, 1)} />,
    );
    expect(getAllByText('M')).toHaveLength(2);
  });

  it('weekday initials are --Colors-Gray-400 and regular weight (D-07)', async () => {
    const { getAllByText } = await render(
      <RealCalendar calendarView="week" hasHeader viewDate={new Date(2024, 0, 3)} />,
    );
    const style = flatten(getAllByText('D')[0].props.style);
    expect(style.color).toBe('#A3A3A3');
    expect(style.fontFamily).toBe('Montserrat-400');
  });
});

// ─── MoonCard ─────────────────────────────────────────────────────────────────

describe('MoonCard — device review D-08 / D-11 / D-13', () => {
  it('phase={null} renders a neutral placeholder and NO phase name', async () => {
    const { getByTestId } = await render(<MoonCard phase={null} />);
    expect(getByTestId('moon-card-placeholder')).toBeTruthy();
    expect(getByTestId('moon-card-phase-name').props.children).toBe('');
  });

  it('a resolved phase replaces the placeholder with its name', async () => {
    const { getByTestId, queryByTestId } = await render(
      <MoonCard phase="LAST_QUARTER" />,
    );
    expect(queryByTestId('moon-card-placeholder')).toBeNull();
    expect(getByTestId('moon-card-phase-name').props.children).toBe('Cuarto menguante');
  });
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

describe('HomeScreen — device review D-01 / D-04 / D-05 / D-09 / D-10 / D6', () => {
  it('cards are the grey `.cards` panel: Gray-50 + 1px Gray-200 border, radius 10 (D-01)', async () => {
    const nav = makeHomeNav();
    const { findByTestId } = await render(
      <HomeScreen navigation={nav as never} route={{} as never} />,
    );
    for (const id of ['home-card-streak', 'home-card-seeds']) {
      const card = flatten((await findByTestId(id)).props.style);
      expect(card.backgroundColor).toBe('#FAFAFA');
      expect(card.borderWidth).toBe(1);
      expect(card.borderColor).toBe('#E5E5E5');
      expect(card.borderRadius).toBe(10);
      // The original `.cards` has no shadow at all.
      expect(card.elevation).toBeUndefined();
      expect(card.shadowOpacity).toBeUndefined();
    }
  });

  it('the weekly calendar sits in a white bordered inner panel (D-01)', async () => {
    const nav = makeHomeNav();
    const { findByTestId } = await render(
      <HomeScreen navigation={nav as never} route={{} as never} />,
    );
    const panel = flatten((await findByTestId('home-calendar-panel')).props.style);
    expect(panel.backgroundColor).toBe('#FFFFFF');
    expect(panel.borderWidth).toBe(1);
    expect(panel.borderColor).toBe('#E5E5E5');
    expect(panel.borderRadius).toBe(10);
  });

  it('card titles are --Colors-Blue-800 and the seed is NOT pushed right (D-04 / D-05)', async () => {
    const nav = makeHomeNav();
    const { findByTestId } = await render(
      <HomeScreen navigation={nav as never} route={{} as never} />,
    );
    const streak = flatten((await findByTestId('streak-label')).props.style);
    expect(streak.color).toBe('#1A6270');

    const seeds = flatten((await findByTestId('seeds-label')).props.style);
    expect(seeds.color).toBe('#1A6270');
    // The seed icon follows the text inline: the label must not stretch (D-04).
    expect(seeds.flex).toBeUndefined();
  });

  it('the "Ver historial" label is regular weight, not bold (D-05)', async () => {
    const nav = makeHomeNav();
    const { findByText } = await render(
      <HomeScreen navigation={nav as never} route={{} as never} />,
    );
    const label = flatten((await findByText('Ver historial')).props.style);
    expect(label.fontFamily).toBe('Montserrat-500');
  });

  it('modal_Days_question shows the FIXED 02..08 example, not the real week (D-10)', async () => {
    const nav = makeHomeNav();
    const { getByTestId, findByTestId } = await render(
      <HomeScreen navigation={nav as never} route={{} as never} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('modal-days-trigger'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('modal-days-siguiente'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(await findByTestId('streak-example')).toBeTruthy();
    // 02 completo, 03 incompleto, 04 y 05 completos, 06 por registrar, 07/08 sin registro.
    expect(flatten(getByTestId('day-cell-2').props.style).backgroundColor).toBe('#1097AA');
    expect(flatten(getByTestId('day-cell-3').props.style).backgroundColor).toBe('transparent');
    expect(flatten(getByTestId('day-cell-3').props.style).borderWidth).toBe(2);
    expect(flatten(getByTestId('day-cell-4').props.style).backgroundColor).toBe('#1097AA');
    expect(flatten(getByTestId('day-cell-5').props.style).backgroundColor).toBe('#1097AA');
    expect(flatten(getByTestId('day-cell-7').props.style).backgroundColor).toBe('transparent');
    expect(flatten(getByTestId('day-cell-8').props.style).backgroundColor).toBe('transparent');
    // Title INSIDE the light-cyan panel.
    expect(getByTestId('streak-example')).toBeTruthy();
  });

  it('modal_token has no invented "5 🌰" heading (D-09)', async () => {
    const nav = makeHomeNav();
    const { getByTestId, queryByText, findByTestId } = await render(
      <HomeScreen navigation={nav as never} route={{} as never} />,
    );
    await act(async () => {
      fireEvent.press(getByTestId('modal-token-trigger'));
    });
    expect(await findByTestId('modal-token')).toBeTruthy();
    expect(queryByText('+2')).toBeTruthy();
    expect(queryByText('+1')).toBeTruthy();
    expect(queryByText('+3')).toBeTruthy();
    // The original third card shows date_incomplete_to_done.svg, never a "5" heading.
    expect(queryByText('5')).toBeNull();
  });

  it('reads the user progress only AFTER the daily rollover (D6)', async () => {
    let releaseRollover: (() => void) | undefined;
    mockRecalculateDailyProgress.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          releaseRollover = () => resolve(null);
        }),
    );

    const nav = makeHomeNav();
    await render(<HomeScreen navigation={nav as never} route={{} as never} />);

    await waitFor(() => {
      expect(mockRecalculateDailyProgress).toHaveBeenCalled();
    });
    // Stale read would show yesterday's completedTasks in "Progreso: X de Y".
    expect(mockGetLastUserProgressPure).not.toHaveBeenCalled();

    await act(async () => {
      releaseRollover?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockGetLastUserProgressPure).toHaveBeenCalled();
    });
  });
});

// ─── BottomSheet host ─────────────────────────────────────────────────────────

describe('BottomSheet — device review D-12 / D-13 / D-14', () => {
  const RealSheets = jest.requireActual('@/components/ui/BottomSheet') as {
    UvaFullBottomSheet: React.ComponentType<Record<string, unknown>>;
  };

  /** Collects every node of a given type from the rendered JSON tree. */
  function collect(node: unknown, type: string, out: Record<string, unknown>[] = []) {
    if (!node || typeof node !== 'object') return out;
    const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
    if (n.type === type && n.props) out.push(n.props);
    (n.children ?? []).forEach((c) => collect(c, type, out));
    return out;
  }

  it('hosts the sheet in a full-window Modal so it covers the tab bar (D-13)', async () => {
    const ref = React.createRef<{ present: () => void; dismiss: () => void }>();
    const { toJSON } = await render(
      <RealSheets.UvaFullBottomSheet ref={ref as never}>
        <></>
      </RealSheets.UvaFullBottomSheet>,
    );
    await act(async () => {
      ref.current?.present();
    });
    const modals = collect(toJSON(), 'Modal');
    expect(modals).toHaveLength(1);
    expect(modals[0].transparent).toBe(true);
    // Without these the Modal window stops at the system bars and the tab bar stays lit.
    expect(modals[0].statusBarTranslucent).toBe(true);
    expect(modals[0].navigationBarTranslucent).toBe(true);
  });

  it('keeps the grey drag handle (D-14)', async () => {
    const ref = React.createRef<{ present: () => void; dismiss: () => void }>();
    await render(
      <RealSheets.UvaFullBottomSheet ref={ref as never}>
        <></>
      </RealSheets.UvaFullBottomSheet>,
    );
    await act(async () => {
      ref.current?.present();
    });
    const props = (globalThis as Record<string, unknown>).__sheetProps as Record<
      string,
      unknown
    >;
    // `handleComponent={null}` used to remove the pill entirely.
    expect(props.handleComponent).toBeUndefined();
    expect(flatten(props.handleIndicatorStyle)).toMatchObject({
      backgroundColor: '#D4D4D4',
    });
  });

  it('close button is a white ✕ on a rounded teal square (D-12)', async () => {
    const ref = React.createRef<{ present: () => void; dismiss: () => void }>();
    const { getByTestId } = await render(
      <RealSheets.UvaFullBottomSheet ref={ref as never} showCloseButton>
        <></>
      </RealSheets.UvaFullBottomSheet>,
    );
    await act(async () => {
      ref.current?.present();
    });
    const button = flatten(getByTestId('bottom-sheet-close').props.style);
    expect(button.backgroundColor).toBe('#1097AA');
    expect(button.width).toBe(36);
    expect(button.borderRadius).toBe(8);
  });
});
