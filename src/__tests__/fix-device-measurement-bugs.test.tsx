/**
 * Device regressions — Redmi Note 10S (Android 13, 1080x2400 @440dpi, edge-to-edge)
 * Evidence: docs/evidence/device-findings-2026-09-07.md
 *
 *   F-08 (ALTA) — RegisterMeasurementScreen: the typed digits were rendered cut
 *                 in half (only the bottom of the "5" and the "0" were visible).
 *                 Frame docs/evidence/device-2026-09-07/009-192156.png versus the
 *                 original docs/evidence/measurement/screen-06-register-form-flow1-filled.png
 *
 *   F-11 (ALTA) — GuideMeasurementScreen: the sheet filled the whole window and
 *                 the close (X) button ended up UNDER the status bar.
 *                 Frame docs/evidence/device-2026-09-07/005-192141.png versus the
 *                 original docs/evidence/measurement/screen-03-guide-flow1-step1.png
 *
 * These tests pin the style contract that makes both correct at any density.
 */

// ─── Suppress noisy console output from native mocks ──────────────────────────
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

// ─── Module mocks ─────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */

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
          50: '#FAFAFA',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#525252',
          700: '#404040',
        },
        orange: { 50: '#FFF7ED', 500: '#E58B24', 700: '#C2410C' },
        danger: '#E5245E',
        background: '#f9fafb',
      },
      semanticColors: {
        primary: '#10BCCA',
        background: '#f9fafb',
        text: '#171717',
        textSecondary: '#525252',
        border: '#e5e7eb',
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

// Status bar inset of the reference device (Redmi Note 10S ≈ 48dp under
// edge-to-edge). A non-zero value is what makes the F-11 assertion meaningful.
const DEVICE_TOP_INSET = 48;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, right: 0, bottom: 24, left: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-svg', () => ({ Svg: 'Svg', Path: 'Path', G: 'G' }));

jest.mock('@/assets/svg/icons/exclamation.svg', () => 'ExclamationIcon');

// ── Measurement configuration fixture ────────────────────────────────────────
const mockMeasurementConfig = {
  tasks: {
    task1: {
      name: 'Temperatura y Humedad',
      restrictions: {},
      flows: ['flow1'],
      id: 'task1',
    },
  },
  flows: {
    flow1: {
      name: 'Registro máximos',
      text: '<p>Registros de temperatura y humedad máxima</p>',
      guides: ['guide1'],
      measurements: ['temperatura'],
      restrictions: null,
      nextFlow: null,
    },
  },
  guides: {
    guide1: {
      name: 'Registro máximos',
      icon: {
        enable: false,
        name: '',
        colorName: '',
        colorHex: '',
        imagePath: null,
      },
      image: 'guide1.png',
      text: '<div><ol><li>Oprima el botón ADJ-MAX/MIN.</li></ol></div>',
      nextGuide: null,
      // showAutomatic false → the screen must NOT auto-open the guide during the
      // RegisterMeasurement test.
      showAutomatic: false,
    },
  },
  measurements: {
    temperatura: {
      name: '<span>Temperatura máxima</span>',
      sortName: '<span>temperatura max</span>',
      icon: {
        enable: false,
        name: '',
        colorName: '',
        colorHex: '',
        imagePath: null,
      },
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

jest.mock('@/components/rich-text/RichText', () => ({
  RichText: ({ html }: { html: string }) => {
    const { Text } = require('react-native');
    return <Text testID="rich-text">{html}</Text>;
  },
}));

jest.mock('@/data/datastore/measurement-ds', () => ({
  MeasurementDSService: {
    addMeasurement: jest.fn().mockResolvedValue(undefined),
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

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable import/first */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import { RegisterMeasurementScreen } from '@/screens/measurement/RegisterMeasurementScreen';
import {
  GuideMeasurementScreen,
  GUIDE_HEADER_GAP,
} from '@/screens/measurement/GuideMeasurementScreen';
/* eslint-enable import/first */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenStyle<T>(style: unknown): T {
  return (StyleSheet.flatten(style as never) ?? {}) as T;
}

/** Window height `useWindowDimensions()` reports under jest-expo. */
const WINDOW_HEIGHT = Dimensions.get('window').height;

function makeRegisterProps() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  };
  const route = {
    params: { taskId: 'task1', taskName: 'Registro máximos', flowId: 'flow1' },
  };
  return { navigation, route } as unknown as React.ComponentProps<
    typeof RegisterMeasurementScreen
  >;
}

function makeGuideProps() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  };
  const route = { params: { taskId: 'task1', guideKey: 'guide1' } };
  return { navigation, route } as unknown as React.ComponentProps<
    typeof GuideMeasurementScreen
  >;
}

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     F-08 — digit inputs must never clip the glyph on Android
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('F-08 — RegisterMeasurementScreen digit input (clipped digits on Android)', () => {
  it('pins the Android-safe text metrics on every digit input', async () => {
    const { navigation, route } = makeRegisterProps();
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(getByTestId('digit-input-0-0')).toBeTruthy();
    });

    for (const testID of ['digit-input-0-0', 'digit-input-0-1']) {
      const style = flattenStyle<TextStyle>(getByTestId(testID).props.style);

      // The bug: the glyph box did not fit in the fixed height.
      expect(typeof style.fontSize).toBe('number');
      expect(typeof style.lineHeight).toBe('number');
      expect(style.lineHeight!).toBeGreaterThanOrEqual(style.fontSize!);

      // Android adds implicit padding to TextInput on top of the glyph box.
      expect(style.paddingVertical).toBe(0);

      // Centers the line box inside `height` instead of pinning it to the bottom.
      expect(style.textAlignVertical).toBe('center');

      // Removes Android's extra ascent/descent padding.
      expect(style.includeFontPadding).toBe(false);

      // The box must be tall enough for the whole line, at any density.
      expect(typeof style.height).toBe('number');
      expect(style.height!).toBeGreaterThanOrEqual(style.lineHeight!);
    }
  });

  it('keeps the original visual contract: 26px font, 40px wide, 2px bottom rule', async () => {
    const { navigation, route } = makeRegisterProps();
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(getByTestId('digit-input-0-0')).toBeTruthy();
    });

    // register-measurement.page.scss:104-115
    const style = flattenStyle<TextStyle>(
      getByTestId('digit-input-0-0').props.style,
    );
    expect(style.fontSize).toBe(26);
    expect(style.width).toBe(40);
    expect(style.borderBottomWidth).toBe(2);
    expect(style.borderBottomColor).toBe('#525252');
    expect(style.textAlign).toBe('center');
    expect(style.borderRadius).toBe(0);
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     F-11 — guide sheet must start below the status bar
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('F-11 — GuideMeasurementScreen close button under the status bar', () => {
  /**
   * The sheet is now CONTENT-SIZED and anchored to the bottom (user request,
   * 2026-09-10 — same mechanics as the Home help sheets, `UvaBottomSheet` with
   * `enableDynamicSizing`). The fixed `marginTop: insets.top + GUIDE_HEADER_GAP`
   * became a CEILING: `maxHeight = windowHeight − insets.top − GUIDE_HEADER_GAP`.
   * F-11 still holds: whatever the content height, the sheet top can never go
   * above `insets.top + GUIDE_HEADER_GAP`, so the X always clears the status bar.
   */
  it('caps the sheet at windowHeight − topInset − header gap and anchors it to the bottom', async () => {
    const { navigation, route } = makeGuideProps();
    const { getByTestId } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(getByTestId('guide-sheet')).toBeTruthy();
    });

    const sheetStyle = flattenStyle<ViewStyle>(
      getByTestId('guide-sheet').props.style,
    );
    expect(sheetStyle.maxHeight).toBe(
      WINDOW_HEIGHT - DEVICE_TOP_INSET - GUIDE_HEADER_GAP,
    );
    // Bottom-anchored: the sheet is the only in-flow child of the transparent route.
    expect(sheetStyle.marginTop).toBe('auto');
    // …and it is NOT full height any more — that is the regression this replaces.
    expect(sheetStyle.flex).toBeUndefined();
    expect(sheetStyle.height).toBeUndefined();
  });

  it('lets the content scroll inside the sheet instead of growing past the ceiling', async () => {
    const { navigation, route } = makeGuideProps();
    const { getByTestId } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(getByTestId('guide-scroll')).toBeTruthy();
    });

    // The ScrollView must be able to give up height (RN's default flexShrink is 0)
    // but must not stretch a short guide to the ceiling.
    const scrollStyle = flattenStyle<ViewStyle>(
      getByTestId('guide-scroll').props.style,
    );
    expect(scrollStyle.flexShrink).toBe(1);
    expect(scrollStyle.flexGrow).toBe(0);
    expect(scrollStyle.flex).toBeUndefined();
  });

  it('keeps the close button inside the sheet, so it clears the status bar', async () => {
    const { navigation, route } = makeGuideProps();
    const { getByTestId } = await render(
      <GuideMeasurementScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(getByTestId('guide-btn-close')).toBeTruthy();
    });

    const sheetStyle = flattenStyle<ViewStyle>(
      getByTestId('guide-sheet').props.style,
    );
    const closeStyle = flattenStyle<ViewStyle>(
      getByTestId('guide-btn-close').props.style,
    );

    expect(closeStyle.position).toBe('absolute');
    /*
     * Worst case for F-11 is the TALLEST possible sheet (height === maxHeight),
     * whose top sits at windowHeight − maxHeight = topInset + GUIDE_HEADER_GAP.
     * `top` is relative to the sheet, so the X can never reach the status bar.
     */
    const worstCaseSheetTop = WINDOW_HEIGHT - (sheetStyle.maxHeight as number);
    const absoluteTop = worstCaseSheetTop + (closeStyle.top as number);
    expect(absoluteTop).toBeGreaterThan(DEVICE_TOP_INSET);
    // 38×38 tap target of the original .btn_close.
    expect(closeStyle.width).toBe(38);
    expect(closeStyle.height).toBe(38);
  });

  it('leaves the original header visible above the sheet (ion-modal parity)', () => {
    // Header paddingTop 8 + toolbar minHeight 44 (components/header/Header.tsx)
    expect(GUIDE_HEADER_GAP).toBe(52);
  });
});
