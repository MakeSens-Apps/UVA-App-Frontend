/**
 * Device review round 2 — measurement flow (items D-22 … D-36)
 * Evidence: docs/evidence/device-2026-09-07/review-frames-021-090.md
 * Originals: src/app/pages/measurement/** + docs/evidence/measurement/*.png
 *
 *   D-22  Section headings must live INSIDE the task card, not above it.
 *   D-23  Task label typography = .measurement_result_title (14px), not 18px.
 *   D-24  "Disponible hasta las HH:MM" chip padding = .restrictionTime (4×10).
 *   ---   Restriction: the row must grey out on the restriction alone, exactly
 *         like `[ngClass]="{disable: hasRestrictionTimeTask(task)}"`; only the
 *         NAVIGATION is bypassed for test users (frame 054 at 08:16).
 *   D-25  Guide "Entendido" must clear the Android navigation bar.
 *   D-26  Guide title row carries the ↑/↓ `guide.icon` on its right.
 *   D-27  Guide image fills the sheet width with its natural aspect ratio.
 *   D-28  "Mostrar automaticamente." starts UNCHECKED and persists nothing.
 *   D-29  Sheet dims the page above it and shows a drag handle.
 *   D-30  Measurement cards carry the ↑/↓ `item.icon` in the right corner.
 *   D-31  "¿Cómo ver este dato?" uses information-circle.svg, not the ℹ️ emoji.
 *   D-32  Range alert = white box, grey border, ⚠️ alone on a centred line.
 *   D-33  "Guardar registro" = 36dp tall ion-button, regular weight.
 *   D-35  Confirmation modal has NO white card and shows separated digits.
 *   D-36  "Siguiente" is a full-width primary button inside the saved card.
 */

// ─── Suppress noisy console output from native mocks ──────────────────────────
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

/*
 * ConfigIcon reads its SVG off disk asynchronously. A test that does not await
 * that read would otherwise let the resulting setState land inside the NEXT
 * test's act() scope ("overlapping act() calls"), which leaves React unable to
 * mount anything afterwards. Draining the microtask queue here keeps every test
 * self-contained.
 */
afterEach(async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { act: flush } = require('@testing-library/react-native');
  await flush(async () => {
    await Promise.resolve();
  });
});

// ─── Module mocks ─────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */


jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: { 50: '#EDFEFE', 200: '#A9F5F8', 500: '#10BCCA', 600: '#1097AA', 700: '#14788A', 800: '#1A6270' },
        green: { 100: '#E3F2D5', 200: '#C8E6B0', 500: '#69AB3C' },
        white: '#FFFFFF',
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
        },
        orange: { 50: '#FDF9EF', 100: '#FBF0D9', 500: '#E58B24', 800: '#8E481E' },
        danger: '#E5245E',
        background: '#FAFAFA',
      },
      semanticColors: {
        primary: '#10BCCA',
        background: '#FAFAFA',
        text: '#171717',
        textSecondary: '#525252',
        border: '#E5E5E5',
      },
      typography: { sizes: { base: 16, sm: 14, lg: 18, xl: 22, xs: 12 } },
      spacing: { xs: 4, sm: 8, md: 16 },
      brandingOverrides: {},
    },
  }),
}));

jest.mock('@/theme/theme', () => ({
  fontFamilyForWeight: (w: string, italic?: boolean) =>
    `Montserrat-${w}${italic ? 'Italic' : ''}`,
}));

/** Redmi Note 10S under edge-to-edge: 48dp status bar, 24dp navigation bar. */
const DEVICE_TOP_INSET = 48;
const DEVICE_BOTTOM_INSET = 24;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, right: 0, bottom: 24, left: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// react-native-svg: SvgXml is what ConfigIcon uses for the RACIMO arrows.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SvgXml = ({ testID, ...rest }: Record<string, unknown> & { testID?: string }) =>
    React.createElement(View, { testID, ...rest });
  return { Svg: 'Svg', Path: 'Path', G: 'G', SvgXml };
});

// NOTE: every `*.svg` import resolves through jest's moduleNameMapper to the
// shared __mocks__/svgMock.js, which renders a host element of type "svg".
// A per-file jest.mock() would therefore replace ALL of them at once, so the
// assertions below identify the icons by testID instead of by component type.
const SVG_HOST_TYPE = 'svg';

// The RACIMO arrow lives on disk as an SVG — ConfigIcon reads it as text.
const ARROW_SVG = '<svg viewBox="0 0 24 24"><path d="M12 4v16"/></svg>';
const mockReadFile = jest.fn().mockResolvedValue({ success: true, data: { data: ARROW_SVG } });
jest.mock('@/data/storage/file-system', () => ({
  fileSystemService: { readFile: (...a: unknown[]) => mockReadFile(...a) },
  Directory: { Data: 'Data', Cache: 'Cache' },
}));

// ── Measurement configuration fixture ────────────────────────────────────────
// `activeTime` 00:00 → 00:01 is ALWAYS outside the window, so the task is
// restricted at any wall-clock time the suite happens to run at.
const ALWAYS_RESTRICTED = {
  activeDays: { enabled: false, days: null },
  activeTime: { enabled: true, start: '00:00', end: '00:01' },
  activeDuration: { enabled: false, duration: null },
  requiredTask: { enabled: false, taskID: null },
};

const NO_RESTRICTION = {
  activeDays: { enabled: false, days: null },
  activeTime: { enabled: false, start: '06:00', end: '18:00' },
  activeDuration: { enabled: false, duration: null },
  requiredTask: { enabled: false, taskID: null },
};

const ARROW_UP_ICON = {
  enable: true,
  name: 'arrow-up',
  colorName: 'green',
  colorHex: '#69AB3C',
  imagePath: 'icons/arrow-up.svg',
};

const mockMeasurementConfig = {
  tasks: {
    task1: {
      name: 'Temperatura y humedad (mañana) 🌡️',
      restrictions: ALWAYS_RESTRICTED,
      flows: ['flow1', 'flow2'],
      id: 'task1',
    },
    task2: {
      name: 'Registro de lluvias 🌧️',
      restrictions: NO_RESTRICTION,
      flows: ['flow1'],
      id: 'task2',
    },
  },
  flows: {
    flow1: {
      name: 'Registro máximos',
      text: '<p>Registros de temperatura y humedad máxima</p>',
      guides: ['guide1'],
      measurements: ['temperatura'],
      restrictions: null,
      nextFlow: 'flow2',
    },
    flow2: {
      name: 'Registro mínimos',
      text: '<p>Registros de temperatura y humedad mínima</p>',
      guides: [],
      measurements: ['temperatura'],
      restrictions: null,
      nextFlow: null,
    },
  },
  guides: {
    guide1: {
      name: 'Registro máximos',
      icon: ARROW_UP_ICON,
      image: 'guide1.png',
      text: '<div><ol><li>Oprima el botón ADJ-MAX/MIN.</li></ol></div>',
      nextGuide: null,
      // false → RegisterMeasurementScreen must NOT auto-open the guide here.
      showAutomatic: false,
    },
  },
  measurements: {
    temperatura: {
      name: '<span>Temperatura máxima</span>',
      sortName: '<span>temperatura max</span>',
      icon: ARROW_UP_ICON,
      fields: 2,
      unit: '°C',
      range: { min: 10, max: 38, optionalMessage: '' },
      style: {
        backgroundColor: { colorName: 'orange', colorHex: '#FDF9EF' },
        borderColor: { colorName: 'orange', colorHex: '#F7DFB1' },
      },
    },
  },
  bonus: {},
  historical: [],
};

const mockLoadImage = jest.fn((path: string) => Promise.resolve(`file:///data/racimo/${path}`));
const mockConfigContextValue = {
  configMeasurement: mockMeasurementConfig,
  countTasks: () => 2,
  loadImage: (p: string) => mockLoadImage(p),
  getConfigurationMeasurement: jest.fn().mockResolvedValue(mockMeasurementConfig),
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

// Test user 3000000002 — the phone the device session actually ran with.
jest.mock('@/state/SessionContext', () => ({
  useSessionContext: () => ({
    session: { phone: '+573000000002', userID: 'user-1', uvaID: 'uva-1' },
    isLoaded: true,
    setSession: jest.fn(),
    clearSession: jest.fn(),
    refreshSession: jest.fn(),
  }),
}));

jest.mock('@/components/rich-text/RichText', () => ({
  RichText: ({
    html,
    baseFontSize,
    baseColor,
  }: {
    html: string;
    baseFontSize?: number;
    baseColor?: string;
  }) => {
    const { Text } = require('react-native');
    return (
      <Text
        testID="rich-text"
        // Surfaced so the assertions can read the typography contract.
        style={{ fontSize: baseFontSize, color: baseColor }}
      >
        {html}
      </Text>
    );
  },
}));

jest.mock('@/components/ui/ProgressBar', () => ({
  ProgressBar: () => {
    const { View } = require('react-native');
    return <View testID="progress-bar" />;
  },
}));

jest.mock('@/components/ui/BottomSheet', () => {
  const React = require('react');
  const MockSheet = React.forwardRef((_p: unknown, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
    return null;
  });
  MockSheet.displayName = 'MockSheet';
  return { UvaBottomSheet: MockSheet };
});

const mockAddMeasurement = jest.fn().mockResolvedValue(undefined);
jest.mock('@/data/datastore/measurement-ds', () => ({
  MeasurementDSService: {
    addMeasurement: (...a: unknown[]) => mockAddMeasurement(...a),
    getMeasurementsByDay: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/data/datastore/user-progress-ds', () => ({
  UserProgressDSService: {
    getLastUserProgressPure: jest.fn().mockResolvedValue(null),
    getLastUserProgress: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@/domain/gamification/gamification', () => ({
  GamificationService: {
    completeTaskProcess: jest.fn().mockResolvedValue(true),
    surpriseTaskProcess: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/data/storage/preferences', () => ({
  Preferences: {
    get: jest.fn().mockResolvedValue({ value: null }),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
  LAST_MEASUREMENT_VALUES_KEY: 'lastMeasurementValues',
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), push: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
  useRoute: () => ({ params: {} }),
}));

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable import/first */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';

import {
  MeasurementScreen,
  hasRestrictionTimeTask,
  getTextRestrictionTime,
} from '@/screens/measurement/MeasurementScreen';
import {
  GuideMeasurementScreen,
  GUIDE_HEADER_GAP,
  GUIDE_BACKDROP_OPACITY,
} from '@/screens/measurement/GuideMeasurementScreen';
import { RegisterMeasurementScreen } from '@/screens/measurement/RegisterMeasurementScreen';
import type { Task } from '@/data/models/configuration/measurements.model';
/* eslint-enable import/first */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenStyle<T>(style: unknown): T {
  return (StyleSheet.flatten(style as never) ?? {}) as T;
}

function makeGuideProps() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), push: jest.fn(), replace: jest.fn() };
  const route = { params: { taskId: 'task1', guideKey: 'guide1' } };
  return { navigation, route } as unknown as React.ComponentProps<typeof GuideMeasurementScreen>;
}

function makeRegisterProps(flowId = 'flow1') {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), push: jest.fn(), replace: jest.fn() };
  const route = { params: { taskId: 'task1', taskName: 'Registro máximos', flowId } };
  return { navigation, route } as unknown as React.ComponentProps<typeof RegisterMeasurementScreen>;
}

/** Walks a rendered element tree looking for the first descendant with `testID`. */
function findDescendant(node: unknown, testID: string): boolean {
  const el = node as { props?: Record<string, unknown>; children?: unknown[] } | null;
  if (!el || typeof el !== 'object') return false;
  if (el.props?.testID === testID) return true;
  return (el.children ?? []).some((c) => findDescendant(c, testID));
}

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     MeasurementScreen — task list
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('D-22 — section heading lives inside the task card', () => {
  it('renders "Registros sin completar" as a child of the white group card', async () => {
    const { getByText, getByTestId } = await render(<MeasurementScreen />);

    await waitFor(() => expect(getByTestId('task-row-task1')).toBeTruthy());

    const heading = getByText('Registros sin completar');
    // Card = the nearest ancestor styled as .measurement_incomplete (white, r16).
    const card = heading.parent;
    const cardStyle = flattenStyle<ViewStyle>(card?.props.style);
    expect(cardStyle.backgroundColor).toBe('#FFFFFF');
    expect(cardStyle.borderRadius).toBe(16);
    expect(cardStyle.padding).toBe(10);
    // …and the task rows are siblings of the heading inside that same card.
    expect(findDescendant(card, 'task-row-task1')).toBe(true);
  });
});

describe('D-23 — task label typography', () => {
  it('uses .measurement_result_title (14px), not the 18px checkbox-label size', async () => {
    const { getByTestId, getAllByTestId } = await render(<MeasurementScreen />);

    await waitFor(() => expect(getByTestId('task-row-task1')).toBeTruthy());

    const labels = getAllByTestId('rich-text').filter((n) =>
      String(n.props.children).includes('Temperatura y humedad'),
    );
    expect(labels.length).toBeGreaterThan(0);
    expect(flattenStyle<TextStyle>(labels[0].props.style).fontSize).toBe(14);
  });
});

describe('D-24 — "Disponible hasta las HH:MM" chip', () => {
  it('keeps the .restrictionTime padding (4×10) and a pinned 18dp line box', async () => {
    const { getByTestId, getByText } = await render(<MeasurementScreen />);

    await waitFor(() => expect(getByTestId('task-row-task1')).toBeTruthy());

    const chipText = getByText('Disponible hasta las 00:01');
    const chipStyle = flattenStyle<TextStyle>(chipText.props.style);
    expect(chipStyle.fontSize).toBe(12);
    expect(chipStyle.lineHeight).toBe(18);
    expect(chipStyle.fontStyle).toBe('italic');
    expect(chipStyle.color).toBe('#8E481E');

    const chipBox = flattenStyle<ViewStyle>(chipText.parent?.props.style);
    expect(chipBox.paddingVertical).toBe(4);
    expect(chipBox.paddingHorizontal).toBe(10);
    expect(chipBox.backgroundColor).toBe('#FBF0D9');
    expect(chipBox.alignSelf).toBe('flex-start');
  });
});

describe('time restriction — greying out vs navigation (frame 054)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const task = (start: string, end: string) =>
    ({
      id: 't',
      name: 't',
      flows: [],
      restrictions: {
        activeDays: { enabled: false, days: null },
        activeTime: { enabled: true, start, end },
        activeDuration: { enabled: false, duration: null },
        requiredTask: { enabled: false, taskID: null },
      },
    }) as unknown as Task;

  it('reports the 08:00 window as CLOSED at 08:16 local time', () => {
    // The exact device situation: status bar 08:16, chip "Disponible hasta las 08:00".
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 7, 8, 16, 0));

    expect(hasRestrictionTimeTask(task('05:00', '08:00'))).toBe(true);
    expect(getTextRestrictionTime(task('05:00', '08:00'))).toBe('Disponible hasta las 08:00');
  });

  it('reports the window as OPEN inside it', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 7, 7, 30, 0));

    expect(hasRestrictionTimeTask(task('05:00', '08:00'))).toBe(false);
  });

  it('announces the wait before the window opens', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 7, 3, 0, 0));

    expect(hasRestrictionTimeTask(task('05:00', '08:00'))).toBe(true);
    expect(getTextRestrictionTime(task('05:00', '08:00'))).toBe('Disponible en 2 horas');
  });

  it('greys the label for a TEST user too — only navigation is bypassed', async () => {
    const { getByTestId, getAllByTestId } = await render(<MeasurementScreen />);

    await waitFor(() => expect(getByTestId('task-row-task1')).toBeTruthy());

    const restrictedLabel = getAllByTestId('rich-text').find((n) =>
      String(n.props.children).includes('Temperatura y humedad'),
    );
    const openLabel = getAllByTestId('rich-text').find((n) =>
      String(n.props.children).includes('Registro de lluvias'),
    );

    // `.disable { color: --Colors-Gray-400 }` — measurement.page.scss:96-100
    expect(flattenStyle<TextStyle>(restrictedLabel?.props.style).color).toBe('#A3A3A3');
    // The unrestricted task keeps --Gray-700.
    expect(flattenStyle<TextStyle>(openLabel?.props.style).color).toBe('#404040');

    // …and the test user can still open the restricted task (goToRegister bypass).
    mockNavigate.mockClear();
    fireEvent.press(getByTestId('task-row-task1'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'RegisterMeasurement',
      expect.objectContaining({ taskId: 'task1' }),
    );
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     GuideMeasurementScreen
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('GuideMeasurementScreen — sheet chrome and content', () => {
  it('D-25 — pads the "Entendido" footer by the bottom safe-area inset', async () => {
    const { navigation, route } = makeGuideProps();
    const { getByTestId } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('guide-btn-ok')).toBeTruthy());

    const footer = flattenStyle<ViewStyle>(getByTestId('guide-buttons').props.style);
    // 30dp of `.guide` padding-bottom + the Android navigation bar.
    expect(footer.paddingBottom).toBe(30 + DEVICE_BOTTOM_INSET);
    expect(footer.paddingBottom as number).toBeGreaterThan(DEVICE_BOTTOM_INSET);

    // The sheet is content-sized and bottom-anchored (user request 2026-09-10);
    // the F-11 top offset survives as the CEILING of its height.
    const sheet = flattenStyle<ViewStyle>(getByTestId('guide-sheet').props.style);
    expect(sheet.marginTop).toBe('auto');
    expect(sheet.maxHeight).toBe(
      Dimensions.get('window').height - DEVICE_TOP_INSET - GUIDE_HEADER_GAP,
    );
  });

  it('D-26 — puts guide.icon on the right of the title, tinted with colorHex', async () => {
    const { navigation, route } = makeGuideProps();
    const { getByTestId } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('guide-icon')).toBeTruthy());

    const row = flattenStyle<ViewStyle>(getByTestId('guide-title-row').props.style);
    expect(row.flexDirection).toBe('row');
    expect(row.justifyContent).toBe('space-between');

    // ConfigIcon read the SVG off disk and handed it to SvgXml (an <Image> could not).
    expect(mockReadFile).toHaveBeenCalledWith(
      'file:///data/racimo/icons/arrow-up.svg',
      'Data',
    );
    const icon = getByTestId('guide-icon');
    expect(icon.props.xml).toBe(ARROW_SVG);
    expect(icon.props.color).toBe('#69AB3C');
    expect(icon.props.width).toBe(24);
  });

  it('D-27 — image fills the sheet width with a natural aspect ratio', async () => {
    const { navigation, route } = makeGuideProps();
    const { getByTestId } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('guide-image')).toBeTruthy());

    const img = flattenStyle<ViewStyle>(getByTestId('guide-image').props.style);
    expect(img.width).toBe('100%');
    expect(typeof img.aspectRatio).toBe('number');
    // No fixed height any more — that is what made it ~215dp on the device.
    expect(img.height).toBeUndefined();
  });

  it('D-28 — "Mostrar automaticamente." starts unchecked and persists nothing', async () => {
    const { Preferences } = jest.requireMock('@/data/storage/preferences') as {
      Preferences: { set: jest.Mock };
    };
    Preferences.set.mockClear();

    const { navigation, route } = makeGuideProps();
    const { getByTestId, getByText } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('guide-show-automatic')).toBeTruthy());

    // Exact original label: no accent, trailing full stop.
    expect(getByText('Mostrar automaticamente.')).toBeTruthy();

    const row = getByTestId('guide-show-automatic');
    expect(row.props.accessibilityState.checked).toBe(false);
    // Empty box (no checkmark child).
    expect(getByTestId('guide-show-automatic-box').props.children).toBeNull();

    // Toggling is purely local — the original has no binding at all.
    fireEvent.press(row);
    await waitFor(() =>
      expect(
        getByTestId('guide-show-automatic').props.accessibilityState.checked,
      ).toBe(true),
    );
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('D-29 — dims the page above the sheet and shows the drag handle', async () => {
    const { navigation, route } = makeGuideProps();
    const { getByTestId } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('guide-sheet')).toBeTruthy());

    const backdrop = flattenStyle<ViewStyle>(getByTestId('guide-backdrop').props.style);
    expect(backdrop.position).toBe('absolute');
    expect(backdrop.backgroundColor).toBe('#000000');
    expect(backdrop.opacity).toBe(GUIDE_BACKDROP_OPACITY);

    const handle = flattenStyle<ViewStyle>(getByTestId('guide-drag-handle').props.style);
    expect(handle.width).toBe(36);
    expect(handle.height).toBe(4);
    expect(handle.alignSelf).toBe('center');

    // Tapping the backdrop dismisses, like `backdropDismiss: true`.
    fireEvent.press(getByTestId('guide-backdrop'));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     RegisterMeasurementScreen
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('RegisterMeasurementScreen — form chrome', () => {
  it('D-30 — draws item.icon in the right corner of each measurement card', async () => {
    const { navigation, route } = makeRegisterProps();
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('measurement-icon-0')).toBeTruthy());

    const icon = getByTestId('measurement-icon-0');
    expect(icon.props.xml).toBe(ARROW_SVG);
    expect(icon.props.color).toBe('#69AB3C');
    expect(icon.props.width).toBe(24);

    // `.measurements_name { justify-content: space-between }`
    const header = flattenStyle<ViewStyle>(
      getByTestId('measurement-card-0').props.children[0].props.style,
    );
    expect(header.justifyContent).toBe('space-between');
  });

  it('D-31 — uses information-circle.svg for "¿Cómo ver este dato?"', async () => {
    const { navigation, route } = makeRegisterProps();
    const { getByTestId, queryByText } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('guide-help-link')).toBeTruthy());

    // The emoji is gone and a real 20×20 vector icon took its place.
    expect(queryByText('ℹ️')).toBeNull();
    const icon = getByTestId('guide-help-icon');
    expect(icon.type).toBe(SVG_HOST_TYPE);
    expect(icon.props.width).toBe(20);
    expect(icon.props.height).toBe(20);
  });

  it('D-32 — range alert is a white bordered box with a centred title', async () => {
    const { navigation, route } = makeRegisterProps();
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    // Wait for the ConfigIcon disk read too: leaving it in flight would overlap
    // the act() scope of the fireEvent calls below.
    await waitFor(() => expect(getByTestId('measurement-icon-0')).toBeTruthy());

    // 99 °C is out of the configured 10–38 range.
    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '9');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '9');
    });

    await waitFor(() => expect(getByTestId('measurement-alert-0')).toBeTruthy());

    const box = flattenStyle<ViewStyle>(getByTestId('measurement-alert-0').props.style);
    // global `.alert`: white, 1px --Gray-300, radius 14, padding 10×16, centred column.
    expect(box.backgroundColor).toBe('#FFFFFF');
    expect(box.borderColor).toBe('#D4D4D4');
    expect(box.borderWidth).toBe(1);
    expect(box.borderRadius).toBe(14);
    expect(box.paddingVertical).toBe(10);
    expect(box.paddingHorizontal).toBe(16);
    expect(box.alignItems).toBe('center');
    // Column layout ⇒ the ⚠️ sits on its own line above the title.
    expect(box.flexDirection).toBeUndefined();
  });

  it('D-33 — "Guardar registro" is a 36dp ion-button in regular weight', async () => {
    const { navigation, route } = makeRegisterProps();
    const { getByTestId, getByText } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('save-button')).toBeTruthy());

    const btn = flattenStyle<ViewStyle>(getByTestId('save-button').props.style);
    expect(btn.height).toBe(36);
    expect(btn.borderRadius).toBe(8);
    expect(btn.paddingVertical).toBeUndefined();

    const labelStyle = flattenStyle<TextStyle>(
      getByText('Guardar registro').props.style,
    );
    expect(labelStyle.fontFamily).toBe('Montserrat-500');
    expect(labelStyle.fontSize).toBe(15);
  });
});

describe('RegisterMeasurementScreen — confirmation modal (D-35)', () => {
  async function openConfirm() {
    const { navigation, route } = makeRegisterProps();
    const utils = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(utils.getByTestId('measurement-icon-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(utils.getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(utils.getByTestId('digit-input-0-1'), '8');
    });
    await act(async () => {
      fireEvent.press(utils.getByTestId('save-button'));
    });

    await waitFor(() => expect(utils.getByTestId('confirm-modal-wrapper')).toBeTruthy());
    return utils;
  }

  it('floats over the blurred form with no white container card', async () => {
    const { getByTestId } = await openConfirm();

    const wrapper = flattenStyle<ViewStyle>(getByTestId('confirm-modal-wrapper').props.style);
    // `.wrapper { margin-inline: 10px }` and nothing else.
    expect(wrapper.marginHorizontal).toBe(10);
    expect(wrapper.backgroundColor).toBeUndefined();
    expect(wrapper.borderRadius).toBeUndefined();
    expect(wrapper.padding).toBeUndefined();
  });

  it('shows the value as separated underlined digits, not a joined string', async () => {
    const { getByTestId, queryByText } = await openConfirm();

    expect(getByTestId('confirm-digit-0-0')).toBeTruthy();
    expect(getByTestId('confirm-digit-0-1')).toBeTruthy();
    // The joined "28" rendering is gone.
    expect(queryByText('28')).toBeNull();

    const box = flattenStyle<ViewStyle>(getByTestId('confirm-digit-0-0').props.style);
    expect(box.width).toBe(40);
    expect(box.borderBottomWidth).toBe(2);
    expect(box.borderBottomColor).toBe('#525252');
  });

  it('keeps the ↑/↓ icon on the summary cards', async () => {
    const { getByTestId } = await openConfirm();
    expect(getByTestId('confirm-icon-0').props.xml).toBe(ARROW_SVG);
  });

  it('uses a SINGLE Modal for both phases (no stacked modals)', async () => {
    const { queryAllByTestId } = await openConfirm();
    // The confirm and saved phases share one <Modal>, switched by `modalStage`
    // (commit a2fbf3f). Two stacked modals never transition on a real device.
    expect(queryAllByTestId('confirm-modal').length).toBe(1);
    expect(queryAllByTestId('saved-modal').length).toBe(0);
  });
});

describe('RegisterMeasurementScreen — saved modal (D-36)', () => {
  it('gives "Siguiente" the full width of the modal card plus padding', async () => {
    const { navigation, route } = makeRegisterProps();
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByTestId('measurement-icon-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '8');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });

    await waitFor(() => expect(getByTestId('confirm-save-button')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });

    // flow1.nextFlow === 'flow2' ⇒ the saved phase must offer "Siguiente".
    await waitFor(() => expect(getByTestId('next-flow-button')).toBeTruthy());

    const container = flattenStyle<ViewStyle>(getByTestId('next-flow-container').props.style);
    // Cancels `.modal_saved { align-items: center }`, which is what shrank the button.
    expect(container.alignSelf).toBe('stretch');
    expect(container.paddingHorizontal as number).toBeGreaterThan(0);

    const btn = flattenStyle<ViewStyle>(getByTestId('next-flow-button').props.style);
    expect(btn.height).toBe(36);
    expect(btn.borderRadius).toBe(8);
  });
});
