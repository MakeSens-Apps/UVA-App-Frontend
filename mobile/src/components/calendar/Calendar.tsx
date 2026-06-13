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

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { Day } from '@/components/ui/Day';
import type { CalendarDay } from './calendarLogic';
import {
  generateCalendarMonth,
  generateCalendarWeek,
} from './calendarLogic';

// ─── Moon phase icon assets ───────────────────────────────────────────────────
// Moon SVGs use xlink:href with embedded bitmaps which react-native-svg cannot
// render on web (and inconsistently on some native devices).
// Use extracted PNG assets instead — identical to MoonCard fix (Divergence 13).
// Map from phase key → PNG require() number for Image.source.
// The Image rendering happens inside Day.tsx (which accepts number source).

// On native, require() for PNG returns a number (asset ID registered with NativeModules).
// On web (Metro web bundler), require() returns a string URL.
// Use `unknown` and let Day.tsx handle both.
const MOON_PHASE_PNG_ICONS: Record<string, number | string> = {
  'new-moon':        require('@/assets/png/moon/nueva.png') as number | string,
  'waning-crescent': require('@/assets/png/moon/gibosa_creciente.png') as number | string,
  'first-quarter':   require('@/assets/png/moon/cuarto_creciente.png') as number | string,
  'full-moon':       require('@/assets/png/moon/llena.png') as number | string,
  'last-quarter':    require('@/assets/png/moon/cuarto_menguante.png') as number | string,
  'waning-gibbous':  require('@/assets/png/moon/gibosa_menguante.png') as number | string,
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
  /** Whether to show the day-of-week header row */
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

      {hasHeader && (
        <View style={styles.headerRow}>
          {DAY_HEADERS.map((day, idx) => (
            <View key={`${day}-${idx}`} style={styles.headerCell}>
              <Text
                style={[
                  styles.headerText,
                  {
                    fontFamily: fontFamilyForWeight('600'),
                    // Original: .calendar.moon { color: white } — all text in moon mode is white
                    color: isMoonCalendar ? '#FFFFFF' : theme.semanticColors.textSecondary,
                  },
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Original: .calendar.mini { gap: 1.322px; padding: 0 } */}
      <View style={[styles.grid, isMini && styles.gridMini]}>
        {calendarDays.map((dayData, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dayCell, isMini && styles.dayCellMini]}
            onPress={() => onDayPress?.(dayData.date ? dayData : null)}
            disabled={!dayData.date || !onDayPress}
            testID={dayData.date ? `calendar-day-${dayData.dayOfMonth}` : `calendar-empty-${index}`}
          >
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
                    ? (MOON_PHASE_PNG_ICONS[dayData.icon] ?? null)
                    : null
                }
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  // Original: .calendar.mini { gap: 1.322px; padding: 0 }
  gridMini: {
    gap: 1.322,
  },
  // Original: .day.mini { padding: 4.298px 5.62px } — no vertical padding on cell
  dayCellMini: {
    paddingVertical: 0,
  },
});

export default Calendar;
export type { CalendarDay };
