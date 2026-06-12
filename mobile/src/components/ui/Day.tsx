/**
 * B10 — DayComponent (primitive for Calendar)
 *
 * Ported from: src/app/components/calendar/day/day.component.ts
 *
 * Replaces: Angular DayComponent with ion-icon + ngClass
 *
 * Contract preserved (exact spec):
 *   - day: 0 means "empty cell" — renders nothing
 *   - day < 10: renders as '0X' (zero-padded) — "{{ day < 10 ? '0'+day : day }}"
 *   - state: 'complete' | 'incomplete' | 'future' | 'normal' | 'today' |
 *             'saveStreak' | 'none' | undefined
 *   - Icons:
 *       state==='complete'   → check.svg
 *       state==='saveStreak' → checkSaveStreak.svg
 *       customIcon===true    → icon prop (custom path/component)
 *   - iconPosition: 'top' | 'bottom-left'
 *   - isMiniCalendar: smaller circle variant
 *   - isMoonCalendar: moon calendar variant
 *
 * Color rules:
 *   complete       → green background
 *   today          → blue background (current)
 *   incomplete     → orange/light background
 *   future         → muted gray
 *   saveStreak     → green with special checkmark
 *   normal         → default
 *   none           → no styling
 *
 * Risks addressed: R-24, R-06, R-42
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// ─── Icon imports ──────────────────────────────────────────────────────────────
// SVGs are imported via react-native-svg-transformer and rendered as components

import CheckIcon from '@/assets/svg/icons/check.svg';
import CheckSaveStreakIcon from '@/assets/svg/icons/checkSaveStreak.svg';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DayState =
  | 'complete'
  | 'incomplete'
  | 'future'
  | 'normal'
  | 'today'
  | 'saveStreak'
  | 'none'
  | undefined;

export type DayIconPosition = 'top' | 'bottom-left';

export interface DayProps {
  /** Day number (1-31). 0 = empty cell. */
  day?: number;
  /** Whether this is a mini calendar cell. */
  isMiniCalendar?: boolean;
  /** The day's state determines visual styling and icon. */
  state?: DayState;
  /**
   * Custom icon: either a React SVG component (react-native-svg-transformer)
   * or a URI string. Only used when customIcon=true.
   */
  icon?: React.FC<{ width: number; height: number }> | string | null;
  /** When true, renders the custom `icon` instead of built-in state icons. */
  customIcon?: boolean;
  /** Position of the state icon overlay. */
  iconPosition?: DayIconPosition;
  /** Whether this day is part of a moon phase calendar. */
  isMoonCalendar?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CIRCLE_SIZE_NORMAL = 40;
const CIRCLE_SIZE_MINI = 28;
const CIRCLE_SIZE_MOON = 36;

const ICON_SIZE_NORMAL = 14;
const ICON_SIZE_MINI = 10;

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Day
 *
 * Renders a single calendar day cell.
 * Equivalent to `<app-day [day]="d" [state]="status" [icon]="icon">`.
 *
 * @example
 *   <Day day={15} state="complete" />
 *   <Day day={8} state="saveStreak" />
 *   <Day day={0} /> // empty cell
 */
export function Day({
  day = 0,
  isMiniCalendar = false,
  state = 'normal',
  icon,
  customIcon = false,
  iconPosition = 'bottom-left',
  isMoonCalendar = false,
}: DayProps): React.JSX.Element {
  const { theme } = useTheme();

  // Empty cell (day === 0): render invisible placeholder
  if (!day) {
    const size = isMiniCalendar
      ? CIRCLE_SIZE_MINI
      : isMoonCalendar
        ? CIRCLE_SIZE_MOON
        : CIRCLE_SIZE_NORMAL;
    return <View style={{ width: size, height: size }} testID="day-empty" />;
  }

  const circleSize = isMiniCalendar
    ? CIRCLE_SIZE_MINI
    : isMoonCalendar
      ? CIRCLE_SIZE_MOON
      : CIRCLE_SIZE_NORMAL;

  const iconSize = isMiniCalendar ? ICON_SIZE_MINI : ICON_SIZE_NORMAL;

  // Zero-pad (exact spec: day < 10 ? '0'+day : day)
  const dayLabel = day < 10 ? `0${day}` : `${day}`;

  // Background color per state
  const bgColor = resolveBackground(state, theme);

  // Text color
  const textColor = resolveTextColor(state, theme);

  // Whether to show the icon overlay
  const showIcon =
    state === 'complete' || state === 'saveStreak' || customIcon;

  // Icon overlay
  const iconEl = showIcon ? (
    <View
      style={[
        styles.iconWrapper,
        iconPosition === 'top'
          ? styles.iconTop
          : styles.iconBottomLeft,
      ]}
    >
      {renderIcon(state, customIcon, icon, iconSize)}
    </View>
  ) : null;

  return (
    <View
      style={[
        styles.circle,
        { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
        { backgroundColor: bgColor },
        state === 'today' && styles.circleBorderToday,
        state === 'incomplete' && styles.circleBorderIncomplete,
      ]}
      testID={`day-cell-${day}`}
    >
      <Text
        style={[
          styles.dayText,
          { color: textColor },
          isMiniCalendar && styles.dayTextMini,
        ]}
      >
        {dayLabel}
      </Text>
      {iconEl}
    </View>
  );
}

// ─── Icon renderer ─────────────────────────────────────────────────────────────

function renderIcon(
  state: DayState,
  customIcon: boolean,
  icon: React.FC<{ width: number; height: number }> | string | null | undefined,
  iconSize: number,
): React.JSX.Element | null {
  if (state === 'complete') {
    return <CheckIcon width={iconSize} height={iconSize} />;
  }
  if (state === 'saveStreak') {
    return <CheckSaveStreakIcon width={iconSize} height={iconSize} />;
  }
  if (customIcon && icon) {
    // SVG component (react-native-svg-transformer)
    if (typeof icon === 'function') {
      const SvgIcon = icon;
      return <SvgIcon width={iconSize} height={iconSize} />;
    }
    // URI string fallback
    return (
      <Image
        source={{ uri: icon }}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    );
  }
  return null;
}

// ─── Color resolution ──────────────────────────────────────────────────────────

function resolveBackground(
  state: DayState,
  theme: ReturnType<typeof useTheme>['theme'],
): string {
  switch (state) {
    case 'complete':
      return '#1097AA'; // --Colors-Blue-600 (Ionic original)
    case 'saveStreak':
      return '#1097AA'; // --Colors-Blue-600 (Ionic original — same as complete)
    case 'today':
      return 'transparent'; // dashed border circle, no fill
    case 'incomplete':
      return 'transparent'; // solid border circle, no fill
    case 'future':
      return theme.colors.gray[100];
    case 'none':
      return 'transparent';
    case 'normal':
    default:
      return 'transparent';
  }
}

function resolveTextColor(
  state: DayState,
  theme: ReturnType<typeof useTheme>['theme'],
): string {
  switch (state) {
    case 'complete':
      return '#FFFFFF'; // white text on teal background
    case 'saveStreak':
      return '#FFFFFF'; // white text on teal background
    case 'today':
      return '#164551'; // --Colors-Blue-900
    case 'incomplete':
      return '#164551'; // --Colors-Blue-900
    case 'future':
      return theme.colors.gray[400];
    case 'none':
      return 'transparent';
    case 'normal':
    default:
      return '#164551'; // --Colors-Blue-900 (not gray/black)
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBorderToday: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#14788A', // --Colors-Blue-700 (Ionic original: 2px dashed)
  },
  circleBorderIncomplete: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#14788A', // --Colors-Blue-700 (Ionic original: 2px solid)
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 18,
  },
  dayTextMini: {
    fontSize: 9,
    lineHeight: 12,
  },
  iconWrapper: {
    position: 'absolute',
  },
  iconTop: {
    top: -6,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -7 }],
  },
  iconBottomLeft: {
    bottom: -4,
    left: -2,
  },
});

export default Day;
