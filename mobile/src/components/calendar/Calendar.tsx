/**
 * B11 — CalendarComponent
 *
 * Ported from: src/app/components/calendar/calendar.component.ts + .html
 * Classification: Major adaptation
 *
 * Preserved contracts:
 *   - Month view: 7-column grid with empty cells at start
 *   - Week view: 7-day row
 *   - Moon calendar type: shows phase icons, all non-today days are 'none'
 *   - getStatus priority: saveStreak > complete > incomplete > normal
 *   - Day header: Lu Ma Mi Ju Vi Sá Do (Spanish)
 *   - onDayPress replaces dayClick EventEmitter
 *
 * Changes from original:
 *   - Angular @Component → React functional component
 *   - Setters (daysComplete, daysIncomplete, phaseMoonDays) → direct props (reactive)
 *   - generateCalendarMonth/Week extracted to calendarLogic.ts (pure, tested)
 *   - ion-img → Image (RN), ion-icon → SVG components
 *   - ngClass → StyleSheet
 *
 * Risks: R-29, R-24
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { Day } from '@/components/ui/Day';
import type { CalendarDay } from './calendarLogic';
import {
  generateCalendarMonth,
  generateCalendarWeek,
} from './calendarLogic';

// ─── Moon phase icon assets (vectorial SVG) ───────────────────────────────────
// The original Ionic app uses small vectorial SVG icons (~15×16px) from
//   assets/images/icons/Moon/{new,full,crescent,declining,Gibosa_crescent,Gibosa_declining}.svg
// These are pure path-based SVGs (NO xlink:href) — compatible with
// react-native-svg-transformer → import as React components.
//
// The large "Moon/" SVGs (nueva.svg, llena.svg …) contain base64 bitmaps via
// xlink:href and must NOT be used here — the icon SVGs are the correct reference.

import MoonNewIcon        from '@/assets/svg/icons/moon/new.svg';
import MoonFullIcon       from '@/assets/svg/icons/moon/full.svg';
import MoonCrescentIcon   from '@/assets/svg/icons/moon/crescent.svg';
import MoonDecliningIcon  from '@/assets/svg/icons/moon/declining.svg';
import MoonGibCresIcon    from '@/assets/svg/icons/moon/gibosa_crescent.svg';
import MoonGibDecIcon     from '@/assets/svg/icons/moon/gibosa_declining.svg';

type MoonSvgComponent = React.FC<{ width: number; height: number }>;

// Map from phase key → SVG component (same keys used by calendarLogic/setIconPhase)
const MOON_PHASE_SVG_ICONS: Record<string, MoonSvgComponent> = {
  'new-moon':        MoonNewIcon as MoonSvgComponent,
  'waning-crescent': MoonGibCresIcon as MoonSvgComponent,
  'first-quarter':   MoonCrescentIcon as MoonSvgComponent,
  'full-moon':       MoonFullIcon as MoonSvgComponent,
  'last-quarter':    MoonDecliningIcon as MoonSvgComponent,
  'waning-gibbous':  MoonGibDecIcon as MoonSvgComponent,
};

// Day header abbreviations (Spanish, Sun-first like original getDay() output)
// Original: calendar.component.html uses single-letter initials: D L M M J V S
const DAY_HEADERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CalendarProps {
  /** Title displayed above the calendar (e.g. month name) */
  title?: string;
  /** Calendar view type */
  calendarView?: 'month' | 'week';
  /** Whether to show mini-sized day cells */
  isMini?: boolean;
  /**
   * Kept for API compatibility with the Angular component, where `hasHeader` gated the
   * `[header]` ng-content slot — NOT the `D L M M J V S` row, which the original renders
   * unconditionally. The weekday row is therefore always shown (D-38).
   */
  hasHeader?: boolean;
  /** Whether to show the title above the calendar */
  hasTitle?: boolean;
  /** Calendar type: 'normal' or 'moon' */
  typeCalendar?: 'moon' | 'normal';
  /** The date being viewed */
  viewDate?: Date;
  /** Days marked as completed */
  daysComplete?: number[];
  /** Days marked as incomplete */
  daysIncomplete?: number[];
  /** Days with save-streak status */
  daysSaveStreak?: number[];
  /** Moon phase data per day (for moon calendar type) */
  phaseMoonDays?: { day: number; status: string }[];
  /** Callback when a day is pressed */
  onDayPress?: (day: CalendarDay | null) => void;
}

// ─── Inline grid styles (NOT in StyleSheet.create) ────────────────────────────
// These constants are defined outside the component and outside StyleSheet to
// avoid RN-web atomic CSS bleed. StyleSheet.create de-duplicates CSS values
// by property, so two StyleSheet entries with the same CSS value share one
// atomic class. When that class appears on both a parent and child element,
// RNW can misapply it. Using plain object literals bypasses this system.
//
// Original: .calendar { display:grid; grid-template-columns:repeat(7,1fr); gap:2px }
// Original: .calendar.mini { gap: 1.322px; padding: 0 }
// Original: .day { height:40px; min-width:40px; ... margin:auto }
// Original: .day.mini { width:13.223px; padding:4.298px 5.62px }

// Normal-mode circle size (matches Day.tsx CIRCLE_SIZE_NORMAL = 40)
const CIRCLE_NORMAL = 40;
// Mini-mode cells are flexible (1fr): the 13px circle from Day.tsx is centred inside.

const WEEK_ROW_STYLE: ViewStyle = {
  flexDirection: 'row',
  marginBottom: 2,
  alignItems: 'center',
  // Normal mode: TO uses flex:1, so this just centers rows vertically.
};

const WEEK_ROW_MINI_STYLE: ViewStyle = {
  flexDirection: 'row',
  marginBottom: 1.322,
  alignItems: 'center',
  // Mini mode: 7 flexible columns, exactly like the original CSS grid
  // (`grid-template-columns: repeat(7, 1fr)`). Fixed-width cells + space-around
  // overflowed the ~90px mini-month column, so the circles touched each other
  // and the ✓ badges overlapped their neighbours (D-39).
};

// Normal-mode cell: fixed width = circle size, centered content
const DAY_CELL_STYLE: ViewStyle = {
  width: CIRCLE_NORMAL,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 2,
};

// Mini-mode cell: one seventh of the row (original: 1fr of a 7-column grid), with the
// circle centred inside so there is always air between neighbouring days (D-39).
// Original: .day.mini { width: 13.223px; ... } inside `grid-template-columns: repeat(7,1fr)`
const DAY_CELL_MINI_STYLE: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 0,
};

// TouchableOpacity (TO) wrapper inherits the cell dimensions via inner View.
// TO uses flex:1 in BOTH modes so each of the 7 columns gets an equal share of the row
// (original: `grid-template-columns: repeat(7, 1fr)`).
const TO_FLEX1_STYLE: ViewStyle = {
  flex: 1,
};

// ─── Week chunker ─────────────────────────────────────────────────────────────

/**
 * Splits flat calendar day array into chunks of 7 (weeks).
 * The last chunk may have fewer than 7 items (partial last week).
 * Used instead of flexWrap+percentage-widths to avoid RN-web atomic CSS bleed.
 */
function chunkByWeek(days: CalendarDay[]): CalendarDay[][] {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Calendar
 *
 * Displays a monthly or weekly calendar with day states.
 * Integrates with Day component (B10) for cell rendering.
 *
 * @example
 *   <Calendar
 *     title="Enero 2025"
 *     hasTitle
 *     hasHeader
 *     daysComplete={[1, 5, 12]}
 *     daysIncomplete={[3, 7]}
 *     daysSaveStreak={[14]}
 *     onDayPress={(day) => console.log(day)}
 *   />
 */
export function Calendar({
  title = 'Enero',
  calendarView = 'month',
  isMini = false,
  hasHeader = false,
  hasTitle = false,
  typeCalendar = 'normal',
  viewDate = new Date(),
  daysComplete = [],
  daysIncomplete = [],
  daysSaveStreak = [],
  phaseMoonDays = [],
  onDayPress,
}: CalendarProps): React.JSX.Element {
  const { theme } = useTheme();

  // Generate calendar days using pure functions (B11 gate requirement)
  const calendarDays: CalendarDay[] = useMemo(() => {
    if (calendarView === 'month') {
      return generateCalendarMonth(
        viewDate,
        daysComplete,
        daysIncomplete,
        daysSaveStreak,
        phaseMoonDays,
        typeCalendar,
      );
    } else {
      return generateCalendarWeek(
        viewDate,
        daysComplete,
        daysIncomplete,
        daysSaveStreak,
        typeCalendar,
      );
    }
  }, [
    calendarView,
    viewDate,
    daysComplete,
    daysIncomplete,
    daysSaveStreak,
    phaseMoonDays,
    typeCalendar,
  ]);

  const isMoonCalendar = typeCalendar === 'moon';

  return (
    <View
      style={[
        styles.container,
        // Original: .calendar { padding: 8px } / .calendar.mini { padding: 0 }
        !isMini && !isMoonCalendar && styles.containerPadded,
        // Original: .calendar.moon { background: #1A6270; border-radius: 16px;
        //   padding: 20px 10px 10px 10px; gap: 6px; margin-inline: 10px; color: white }
        isMoonCalendar && styles.containerMoon,
      ]}
      testID="calendar"
    >
      {hasTitle && (
        <Text
          style={[
            styles.title,
            isMini && styles.titleMini,
            {
              fontFamily: fontFamilyForWeight(isMini ? '500' : '600'),
              color: isMoonCalendar ? '#FFFFFF' : theme.semanticColors.text,
            },
          ]}
        >
          {title}
        </Text>
      )}

      {/* Weekday header row.
          Original calendar.component.html renders `D L M M J V S` for EVERY normal and
          moon calendar (the `hasHeader` input only gates the `[header]` ng-content slot),
          so mini calendars carry it too — D-38 (Historial › vista Año).
          Colour/weight: `.calendar { color: var(--Colors-Gray-400) }` + dayCalendar mixin
          `font-weight: 400` — light grey, regular (D-07). */}
      <View style={[styles.headerRow, isMini && styles.headerRowMini]}>
        {DAY_HEADERS.map((day, idx) => (
          <View
            key={`${day}-${idx}`}
            style={isMini ? DAY_CELL_MINI_STYLE : styles.headerCell}
          >
            <Text
              style={[
                styles.headerText,
                isMini && styles.headerTextMini,
                {
                  fontFamily: fontFamilyForWeight('400'),
                  // Original: .calendar.moon { color: white } — all text in moon mode is white
                  color: isMoonCalendar ? '#FFFFFF' : theme.colors.gray[400],
                },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid — rendered as explicit week rows (7 cells per row).
          Inline styles are used for per-row and per-cell layout to avoid
          RN-web atomic CSS bleed where StyleSheet.create classes with the
          same CSS value share the same atomic class name and can appear on
          unintended elements.
          Original: .calendar { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px }
          Mini:     .calendar.mini { gap: 1.322px; padding: 0 }               */}
      {chunkByWeek(calendarDays).map((week, weekIndex) => (
        <View
          key={weekIndex}
          style={isMini ? WEEK_ROW_MINI_STYLE : WEEK_ROW_STYLE}
        >
          {week.map((dayData, dayIndex) => (
            /* Cell layout strategy for RN web compatibility:
               - TouchableOpacity wraps an Animated.View in RNW, introducing
                 an extra DOM layer. Styles applied to TO can shift to children.
               - We use TO with `flex: 1` (inline, not StyleSheet) so each TO
                 expands to 1/7 of the weekRow width.
               - An inner View handles centering (alignItems/justifyContent).
               - The Day circle renders inside at its fixed mini/normal size.        */
            <TouchableOpacity
              key={dayIndex}
              style={TO_FLEX1_STYLE}
              onPress={() => onDayPress?.(dayData.date ? dayData : null)}
              disabled={!dayData.date || !onDayPress}
              testID={dayData.date ? `calendar-day-${dayData.dayOfMonth}` : `calendar-empty-${weekIndex * 7 + dayIndex}`}
            >
              <View style={isMini ? DAY_CELL_MINI_STYLE : DAY_CELL_STYLE}>
                {dayData.date === null ? (
                  // Empty placeholder cell
                  <Day day={0} isMiniCalendar={isMini} isMoonCalendar={typeCalendar === 'moon'} />
                ) : (
                  <Day
                    day={dayData.dayOfMonth ?? 0}
                    state={dayData.state}
                    isMiniCalendar={isMini}
                    isMoonCalendar={typeCalendar === 'moon'}
                    customIcon={typeCalendar === 'moon' && !!dayData.icon}
                    icon={
                      typeCalendar === 'moon' && dayData.icon
                        ? (MOON_PHASE_SVG_ICONS[dayData.icon] ?? null)
                        : null
                    }
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  // Original: .calendar { padding: 8px }
  containerPadded: {
    padding: 8,
  },
  // Original: .calendar.moon { background: #1A6270; border-radius: 16px;
  //   padding: 20px 10px 10px 10px; gap: 6px; margin-inline: 10px; color: white }
  containerMoon: {
    backgroundColor: '#1A6270',
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 6,
    marginHorizontal: 10,
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  // Original: .calendar_title.mini { font-size: 12px; margin-block: 2px }
  titleMini: {
    fontSize: 12,
    marginBottom: 2,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  headerRowMini: {
    marginBottom: 1.322,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
  },
  // Original: .day.mini { font-size: 4.628px }
  headerTextMini: {
    fontSize: 5,
    lineHeight: 7,
  },
  // weekRow, weekRowMini, dayCell, dayCellMini are defined as plain object
  // constants (WEEK_ROW_STYLE etc.) above, NOT in this StyleSheet, to avoid
  // RN-web atomic CSS bleed. See comment near WEEK_ROW_STYLE.
});

export default Calendar;
export type { CalendarDay };
