/**
 * B11 — Calendar pure logic functions
 *
 * Ported from: src/app/components/calendar/calendar.component.ts
 * Classification: Major adaptation
 *
 * These are extracted as PURE functions (no component state, no side-effects)
 * so they can be unit-tested independently (gate requirement).
 *
 * Preserved contracts:
 *   - date-fns used 1:1 (same imports: addDays, eachDayOfInterval, endOfWeek, getDay,
 *     getDaysInMonth, startOfMonth, startOfWeek, isFuture, isToday)
 *   - calendar[] shape identical to the original
 *   - getStatus priority: saveStreak > complete > incomplete > normal (original order)
 *   - moon icon mapping matches original setIconPhase()
 *
 * Changes from original:
 *   - Angular @Component / @Input removed → pure functions
 *   - No side-effects (no this.calendar = [...])
 *   - generateCalendars() split into generateCalendarMonth() and generateCalendarWeek()
 *     taking all required parameters explicitly
 */

import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  getDay,
  getDaysInMonth,
  startOfMonth,
  startOfWeek,
  isFuture,
  isToday,
} from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CalendarDayState =
  | 'today'
  | 'complete'
  | 'incomplete'
  | 'future'
  | 'normal'
  | 'saveStreak'
  | 'none'
  | undefined;

export interface CalendarDay {
  /** The date object representing the day */
  date: Date | null;
  /** Day of the month (1-31) */
  dayOfMonth: number | null;
  /** Day of the week (0 = Sunday, 1 = Monday, etc.) */
  dayOfWeek: number | null;
  /** The state of the day, used to mark completion or status */
  state?: CalendarDayState;
  /** The icon to be displayed on the day */
  icon?: string | null;
}

// ─── Moon phase icon map (preserved from original setIconPhase) ────────────────

const MOON_ICON_MAP: Record<string, string> = {
  'new-moon': 'new-moon',
  'waning-crescent': 'waning-crescent',
  'first-quarter': 'first-quarter',
  'full-moon': 'full-moon',
  'last-quarter': 'last-quarter',
  'waning-gibbous': 'waning-gibbous',
};

/**
 * Returns the moon phase key for use as an asset identifier.
 * Preserved from original setIconPhase() — returns the phase key string.
 * The actual asset require() happens in the Calendar component.
 *
 * @param phase - string representing the moon phase
 * @returns phase key string or 'new-moon' as fallback
 */
export function getMoonPhaseKey(phase: string): string {
  return MOON_ICON_MAP[phase] ?? 'new-moon';
}

// ─── getStatus (pure, priority: saveStreak > complete > incomplete > normal) ───

/**
 * Determines the state of a given day.
 * Priority order (preserved from original):
 *   saveStreak > complete > incomplete > normal
 *
 * @param day - day of the month (1-31)
 * @param daysComplete - days marked as completed
 * @param daysIncomplete - days marked as incomplete
 * @param daysSaveStreak - days with save-streak status
 * @returns the day state string
 */
export function getStatus(
  day: number,
  daysComplete: number[],
  daysIncomplete: number[],
  daysSaveStreak: number[],
): 'complete' | 'incomplete' | 'normal' | 'saveStreak' {
  if (daysSaveStreak.includes(day)) {
    return 'saveStreak';
  }
  if (daysComplete.includes(day)) {
    return 'complete';
  }
  if (daysIncomplete.includes(day)) {
    return 'incomplete';
  }
  return 'normal';
}

// ─── generateCalendarMonth (pure) ─────────────────────────────────────────────

/**
 * Generates a monthly calendar array.
 * Includes empty cells at the start if the month does not begin on Sunday.
 *
 * Preserved from original generateCalendarMonth():
 *   - Empty cells for days before the first day of the month
 *   - state: isToday → 'today'; moon → 'none'; isFuture → 'future'; else getStatus
 *   - icon: moon calendar → phase icon key; else null
 *
 * @param viewDate - the date within the month to generate
 * @param daysComplete - days marked as completed
 * @param daysIncomplete - days marked as incomplete
 * @param daysSaveStreak - days with save-streak status
 * @param phaseMoonDays - moon phase data for each day
 * @param typeCalendar - 'moon' or 'normal'
 * @returns CalendarDay[]
 */
export function generateCalendarMonth(
  viewDate: Date,
  daysComplete: number[] = [],
  daysIncomplete: number[] = [],
  daysSaveStreak: number[] = [],
  phaseMoonDays: { day: number; status: string }[] = [],
  typeCalendar: 'moon' | 'normal' = 'normal',
): CalendarDay[] {
  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfMonth = getDay(startOfMonth(viewDate));

  const result: CalendarDay[] = [];

  // Empty cells for days before first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    result.push({
      date: null,
      dayOfMonth: null,
      dayOfWeek: null,
    });
  }

  const startDate = startOfMonth(viewDate);
  const endDate = addDays(startDate, daysInMonth - 1);

  const daysArray = eachDayOfInterval({ start: startDate, end: endDate });

  daysArray.forEach((day) => {
    const dayNum = day.getDate();
    const phaseMoon =
      typeCalendar === 'moon'
        ? (phaseMoonDays.find((phase) => phase.day === dayNum)?.status ??
          'new-moon')
        : null;

    result.push({
      date: day,
      dayOfMonth: dayNum,
      dayOfWeek: day.getDay(),
      icon: typeCalendar === 'moon' ? getMoonPhaseKey(phaseMoon!) : null,
      state: isToday(day)
        ? 'today'
        : typeCalendar === 'moon'
          ? 'none'
          : isFuture(day)
            ? 'future'
            : getStatus(dayNum, daysComplete, daysIncomplete, daysSaveStreak),
    });
  });

  return result;
}

// ─── generateCalendarWeek (pure) ──────────────────────────────────────────────

/**
 * Generates a weekly calendar array for the week containing viewDate.
 * Week starts on Sunday (weekStartsOn: 0).
 *
 * Preserved from original generateCalendarWeek().
 *
 * @param viewDate - any date within the desired week
 * @param daysComplete - days marked as completed
 * @param daysIncomplete - days marked as incomplete
 * @param daysSaveStreak - days with save-streak status
 * @param typeCalendar - 'moon' or 'normal'
 * @returns CalendarDay[] (always 7 elements)
 */
export function generateCalendarWeek(
  viewDate: Date,
  daysComplete: number[] = [],
  daysIncomplete: number[] = [],
  daysSaveStreak: number[] = [],
  typeCalendar: 'moon' | 'normal' = 'normal',
): CalendarDay[] {
  const startDate = startOfWeek(viewDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(viewDate, { weekStartsOn: 0 });

  const daysArray = eachDayOfInterval({ start: startDate, end: endDate });

  return daysArray.map((day) => {
    const dayNum = day.getDate();
    return {
      date: day,
      dayOfMonth: dayNum,
      dayOfWeek: day.getDay(),
      state: isToday(day)
        ? 'today'
        : typeCalendar === 'moon'
          ? 'none'
          : isFuture(day)
            ? 'future'
            : getStatus(dayNum, daysComplete, daysIncomplete, daysSaveStreak),
    };
  });
}
