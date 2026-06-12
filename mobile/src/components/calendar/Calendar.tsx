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
// SVGs imported as React components via react-native-svg-transformer.
// Map from phase key → SVG component (NOT require() for Image.source).

import NewMoonIcon from '@/assets/svg/moon/nueva.svg';
import WaningCrescentIcon from '@/assets/svg/moon/gibosa_creciente.svg';
import FirstQuarterIcon from '@/assets/svg/moon/cuarto_creciente.svg';
import FullMoonIcon from '@/assets/svg/moon/llena.svg';
import LastQuarterIcon from '@/assets/svg/moon/cuarto_menguante.svg';
import WaningGibbousIcon from '@/assets/svg/moon/gibosa_menguante.svg';

const MOON_PHASE_ICONS: Record<string, React.FC<{ width: number; height: number }>> = {
  'new-moon': NewMoonIcon,
  'waning-crescent': WaningCrescentIcon,
  'first-quarter': FirstQuarterIcon,
  'full-moon': FullMoonIcon,
  'last-quarter': LastQuarterIcon,
  'waning-gibbous': WaningGibbousIcon,
};

// Day header abbreviations (Spanish, Sun-first like original getDay() output)
const DAY_HEADERS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

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

  return (
    <View style={styles.container} testID="calendar">
      {hasTitle && (
        <Text
          style={[
            styles.title,
            {
              fontFamily: fontFamilyForWeight('600'),
              color: theme.semanticColors.text,
            },
          ]}
        >
          {title}
        </Text>
      )}

      {hasHeader && (
        <View style={styles.headerRow}>
          {DAY_HEADERS.map((day) => (
            <View key={day} style={styles.headerCell}>
              <Text
                style={[
                  styles.headerText,
                  {
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.semanticColors.textSecondary,
                  },
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.grid}>
        {calendarDays.map((dayData, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dayCell}
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
                    ? (MOON_PHASE_ICONS[dayData.icon] ?? null)
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
  title: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
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
});

export default Calendar;
export type { CalendarDay };
