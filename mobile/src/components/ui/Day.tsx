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
   * Custom icon: a React SVG component (react-native-svg-transformer),
   * a PNG require() number (native) or string URL (web), or a URI string.
   * Only used when customIcon=true.
   */
  icon?: React.FC<{ width: number; height: number }> | number | string | null;
  /** When true, renders the custom `icon` instead of built-in state icons. */
  customIcon?: boolean;
  /** Position of the state icon overlay. */
  iconPosition?: DayIconPosition;
  /** Whether this day is part of a moon phase calendar. */
  isMoonCalendar?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CIRCLE_SIZE_NORMAL = 40;
// Original: calendar.component.scss .day.mini { width: 13.223px; height: 13.223px }
const CIRCLE_SIZE_MINI = 13;
// Moon calendar today circle (solid teal #1097AA background behind the icon+number cell)
const CIRCLE_SIZE_MOON = 36;

const ICON_SIZE_NORMAL = 14;
// Original: .day.mini { font-size: 4.628px } → icon sized proportionally
const ICON_SIZE_MINI = 5;
// Original: icon SVGs from assets/images/icons/Moon/ are 15×16px native size.
// screen-07 shows icons rendered at ~14-15px on the calendar grid — match that.
const ICON_SIZE_MOON = 15;

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

  // Original: moon calendar uses ~24px for custom SVG icons (ion-icon default size)
  const iconSize = isMiniCalendar
    ? ICON_SIZE_MINI
    : isMoonCalendar
      ? ICON_SIZE_MOON
      : ICON_SIZE_NORMAL;

  // Zero-pad (exact spec: day < 10 ? '0'+day : day)
  const dayLabel = day < 10 ? `0${day}` : `${day}`;

  // Background color per state — passes isMoonCalendar for .current.isMoonCalendar rule
  const bgColor = resolveBackground(state, theme, isMoonCalendar);

  // Text color — passes isMoonCalendar for white-on-dark rule
  const textColor = resolveTextColor(state, theme, isMoonCalendar);

  // Whether to show the icon overlay
  const showIcon =
    state === 'complete' || state === 'saveStreak' || customIcon;

  // Moon calendar special layout: icon on top, number below (column layout).
  // Original SCSS: .current.isMoonCalendar { background-color: var(--Colors-Blue-600, #1097AA); border: none }
  // → for today: solid teal circle background behind icon+number; for others: transparent.
  // Icon (ion-icon with iconPosition="top") is ~15px, day number is below.
  if (isMoonCalendar && customIcon && icon) {
    return (
      <View
        style={[
          styles.moonDayContainer,
          state === 'today' && {
            backgroundColor: '#1097AA',
            borderRadius: CIRCLE_SIZE_MOON / 2,
            width: CIRCLE_SIZE_MOON,
            height: CIRCLE_SIZE_MOON,
          },
        ]}
        testID={`day-cell-${day}`}
      >
        {/* Moon phase icon — vectorial SVG, ~15px, centered */}
        {renderIcon(state, customIcon, icon, ICON_SIZE_MOON)}
        {/* Day number below icon */}
        <Text
          style={[
            styles.dayText,
            styles.moonDayText,
            { color: textColor },
          ]}
        >
          {dayLabel}
        </Text>
      </View>
    );
  }

  // Icon overlay (for non-moon-calendar with custom icon)
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
        // Original: .current.isMoonCalendar { background: #1097AA; border: none } — no dashed border
        state === 'today' && !isMoonCalendar && styles.circleBorderToday,
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
  icon: React.FC<{ width: number; height: number }> | number | string | null | undefined,
  iconSize: number,
): React.JSX.Element | null {
  if (state === 'complete') {
    return <CheckIcon width={iconSize} height={iconSize} />;
  }
  if (state === 'saveStreak') {
    return <CheckSaveStreakIcon width={iconSize} height={iconSize} />;
  }
  if (customIcon && icon !== null && icon !== undefined) {
    // PNG require() — On native Metro returns a number (asset ID); on web Metro
    // returns a string URL. Both cases: render as Image with the same source.
    if (typeof icon === 'number') {
      return (
        <Image
          source={icon}
          style={{ width: iconSize, height: iconSize, borderRadius: iconSize / 2 }}
          resizeMode="cover"
        />
      );
    }
    // SVG component (react-native-svg-transformer) — only when it's a function
    if (typeof icon === 'function') {
      const SvgIcon = icon;
      return <SvgIcon width={iconSize} height={iconSize} />;
    }
    // String: Metro web returns a URL string for require() PNG assets.
    // Pass directly as source (react-native-web renders as <img>).
    return (
      <Image
        source={icon as any}
        style={{ width: iconSize, height: iconSize, borderRadius: iconSize / 2 }}
        resizeMode="cover"
      />
    );
  }
  return null;
}

// ─── Color resolution ──────────────────────────────────────────────────────────

function resolveBackground(
  state: DayState,
  theme: ReturnType<typeof useTheme>['theme'],
  isMoonCalendar = false,
): string {
  switch (state) {
    case 'complete':
      return '#1097AA'; // --Colors-Blue-600 (Ionic original)
    case 'saveStreak':
      return '#1097AA'; // --Colors-Blue-600 (Ionic original — same as complete)
    case 'today':
      // Original: .current.isMoonCalendar { background-color: var(--Colors-Blue-600, #1097AA); border: none }
      return isMoonCalendar ? '#1097AA' : 'transparent'; // moon: solid teal; normal: dashed border circle, no fill
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
  isMoonCalendar = false,
): string {
  switch (state) {
    case 'complete':
      return '#FFFFFF'; // white text on teal background
    case 'saveStreak':
      return '#FFFFFF'; // white text on teal background
    case 'today':
      // Original: .current.isMoonCalendar { color: #fff } — white on teal fill
      return isMoonCalendar ? '#FFFFFF' : '#164551'; // moon: white; normal: --Colors-Blue-900
    case 'incomplete':
      return '#164551'; // --Colors-Blue-900
    case 'future':
      return theme.colors.gray[400];
    case 'none':
      // Original: .calendar.moon { color: white } — moon calendar all text is white
      return isMoonCalendar ? '#FFFFFF' : 'transparent';
    case 'normal':
    default:
      // Original: .normal { color: var(--Colors-Blue-900) }
      // BUT in moon calendar all text is white (container sets color:white)
      return isMoonCalendar ? '#FFFFFF' : '#164551'; // moon: white; normal: --Colors-Blue-900
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
    // Original: calendar.component.scss .day.mini { font-size: 4.628px }
    fontSize: 5,
    lineHeight: 7,
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
  // Moon calendar: column layout — icon on top, number below
  // Original: each cell shows the moon phase image above the day number
  moonDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  moonDayText: {
    marginTop: 2,
    fontSize: 11,
  },
  // (moonTodayRing removed — today in moon calendar uses filled circle background, not a ring overlay
  //  Original SCSS: .current.isMoonCalendar { background-color: #1097AA; border: none })
});

export default Day;
