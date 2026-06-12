/**
 * B07 — MoonPhaseService (domain/moon)
 * Ported from: src/app/core/services/view/moon/moon-phase.service.ts
 * Classification: Major adaptation
 *
 * Changes from original (per portability-matrix §4.1 / plan.md B07):
 *   - Removed @Injectable / class hierarchy: extends MoonPhaseAPIService → COMPOSITION
 *     (this module imports moonPhaseAPIService singleton directly, not via inheritance)
 *   - Replaced @capacitor/filesystem Directory with mobile/src/data/storage/file-system.ts
 *     Directory enum (same values, same semantics)
 *   - fileSystemService (DI) → fileSystemService singleton import (portability-matrix §4.1)
 *   - All instance methods converted to static (consistent with other domain services)
 *   - PHASE_MAPPING and config are module-level constants (were private readonly)
 *   - Preserving: regex AWSJSON sanitation (5 .replace()), lunar-phases-YYYY-MM.json
 *     file naming, 24-month download window, MoonEvent types, all public method signatures
 *   - No Angular / React / UI imports — pure domain module
 *
 * R-26: lunar-phases-YYYY-MM.json file naming preserved exactly.
 * R-20: fileSystemService.readFile/writeFile use file:// absolute paths via the B05 service.
 * Plan B07: "resolver extends por composición, PHASE_MAPPING+24 meses puros, preservar
 *            lunar-phases-YYYY-MM.json, Jest del parseo regex AWSJSON"
 */

import { moonPhaseAPIService } from '@/data/api/moon-phase-api';
import { fileSystemService, Directory } from '@/data/storage/file-system';

// ─── Interfaces (preserved from original) ───────────────────────────────────

export interface DailyLunarInfo {
  phase: string;
  lighting: number;
}

export interface MoonPhaseData {
  year: number;
  month: number;
  dailyLunarInfo: Record<string, DailyLunarInfo>;
  moonPhases: {
    lunaLlena: number;
    lunaNueva: number;
    cuartoCreciente: number;
    cuartoMenguante: number;
  };
}

export interface MoonPhaseAPIResponse {
  statusCode: number;
  body: MoonPhaseData;
}

export enum LunarPhase {
  NEW_MOON = 'NEW_MOON',
  FIRST_QUARTER = 'FIRST_QUARTER',
  WANING_GIBBOUS = 'WANING_GIBBOUS',
  FULL_MOON = 'FULL_MOON',
  LAST_QUARTER = 'LAST_QUARTER',
  WANING_CRESCENT = 'WANING_CRESCENT',
}

export interface DailyPhaseCalendar {
  day: number;
  status: string;
}

export interface MoonPhaseDay {
  phase: LunarPhase;
  lighting: number;
}

export interface MoonEvent {
  type: 'Luna Nueva' | 'Luna Llena';
  date: Date | string;
}

export type PhaseMapping = Record<string, LunarPhase>;

interface MoonPhaseServiceSuccessResponse<T> {
  success: true;
  data: T;
}

export interface MoonPhaseServiceErrorResponse {
  success: false;
  error: string;
}

export type MoonPhaseServiceResponse<T> =
  | MoonPhaseServiceSuccessResponse<T>
  | MoonPhaseServiceErrorResponse;

export type MonthPhasesResponse = MoonPhaseServiceResponse<
  DailyPhaseCalendar[]
>;
export type CurrentPhaseResponse = MoonPhaseServiceResponse<LunarPhase>;

export interface MoonPhaseServiceConfig {
  storageDirectory: Directory;
  filePrefix: string;
  monthsToDownload: number;
}

// ─── Module-level constants (were private readonly in original class) ────────

/**
 * PHASE_MAPPING — preserved exactly from original (plan.md B07 gate).
 * Maps Spanish API phase names to LunarPhase enum values.
 */
export const PHASE_MAPPING: PhaseMapping = {
  'Luna nueva': LunarPhase.NEW_MOON,
  'Luna llena': LunarPhase.FULL_MOON,
  Creciente: LunarPhase.FIRST_QUARTER,
  Menguante: LunarPhase.LAST_QUARTER,
  'Cuarto creciente': LunarPhase.FIRST_QUARTER,
  'Cuarto menguante': LunarPhase.LAST_QUARTER,
};

const CONFIG: MoonPhaseServiceConfig = {
  storageDirectory: Directory.Data,
  filePrefix: 'lunar-phases',
  monthsToDownload: 24,
};

// ─── Pure helpers (testable without I/O) ────────────────────────────────────

/**
 * Maps an API phase name to the corresponding LunarPhase enum value.
 * Falls back to NEW_MOON if the phase is not found in the mapping.
 *
 * @param {string} phase - The phase name to map (e.g. 'Luna nueva').
 * @returns {LunarPhase} The corresponding lunar phase enum value.
 */
export function mapPhaseToEnum(phase: string): LunarPhase {
  const mapped = PHASE_MAPPING[phase];
  return mapped || LunarPhase.NEW_MOON;
}

/**
 * Maps an API phase name to a calendar status string (lowercase with hyphens).
 * e.g. 'Luna nueva' → 'new_moon' → 'new-moon'
 *
 * @param {string} phase - The phase name.
 * @returns {string} Calendar status string.
 */
export function mapPhaseToCalendarStatus(phase: string): string {
  return mapPhaseToEnum(phase).toLowerCase().replace('_', '-');
}

/**
 * Sanitizes an AWSJSON string returned by the GraphQL API.
 * The API returns a non-standard JSON-like string with:
 *   - '=' instead of ':'
 *   - unquoted keys
 *   - single-quoted values
 *   - extra spaces
 *
 * Applies 5 .replace() calls (R-26: "saneo regex AWSJSON (5 .replace()) frágil"):
 *   1. '=' → ':'
 *   2. unquoted keys → "key":
 *   3. single quotes → double quotes
 *   4. :"textValue" for unquoted text values
 *   5. extra spaces between quoted values
 *
 * @param {string} rawString - The raw AWSJSON string from the API.
 * @returns {string} A valid JSON string.
 */
export function sanitizeAWSJSON(rawString: string): string {
  return rawString
    .replace(/=/g, ':')
    .replace(/(\w+):/g, '"$1":')
    .replace(/'/g, '"')
    .replace(/:([a-zA-Z\s]+)/g, ':"$1"')
    .replace(/"\s+"/g, '" "');
}

/**
 * Gets the next [year, month] pair after the given month.
 * Month is 1-based (1=January, 12=December).
 *
 * @param {number} year - The current year.
 * @param {number} month - The current month (1-12).
 * @returns {[number, number]} The next [year, month].
 */
export function getNextMonth(year: number, month: number): [number, number] {
  if (month === 12) {
    return [year + 1, 1];
  }
  return [year, month + 1];
}

// ─── MoonPhaseService (static) ───────────────────────────────────────────────

export class MoonPhaseService {
  /**
   * Downloads and stores moon phase data for the next 24 months.
   * Files are stored as: lunar-phases-YYYY-MM.json (R-26 preserved).
   * Each file contains the full API response body including dailyLunarInfo and moonPhases.
   *
   * @returns {Promise<MoonPhaseServiceResponse<boolean>>} Response indicating success or failure.
   */
  static async downloadAndStoreMoonPhaseData(): Promise<
    MoonPhaseServiceResponse<boolean>
  > {
    try {
      const currentDate = new Date();

      for (let i = 0; i < CONFIG.monthsToDownload; i++) {
        const targetDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + i,
          1,
        );
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        const response = await moonPhaseAPIService.getMoonPhase({
          year,
          month,
        });

        if (!response.success) {
          return {
            success: false,
            error: `Failed to fetch moon phase data for ${year}-${month}`,
          };
        }

        const rawData = response.data.getMoonPhase;
        const dataResponse = rawData
          ? sanitizeAWSJSON(rawData.toString())
          : '';

        const fileName = `${CONFIG.filePrefix}-${year}-${month.toString().padStart(2, '0')}.json`;
        const writeResult = await fileSystemService.writeFile(
          fileName,
          dataResponse,
          Directory.Data,
          false,
        );

        if (!writeResult.success) {
          return {
            success: false,
            error: `Failed to store moon phase data for ${year}-${month}`,
          };
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets the current day's moon phase.
   * @returns {Promise<CurrentPhaseResponse>} The current moon phase as a response.
   */
  static async getCurrentPhase(): Promise<MoonPhaseServiceResponse<LunarPhase>> {
    try {
      const currentDate = new Date();
      const currentDay = currentDate.getDate();

      const monthData = await this.getCurrentMonthData();
      if (!monthData?.dailyLunarInfo?.[currentDay]) {
        return {
          success: false,
          error: 'Current day moon phase data not found',
        };
      }

      const phaseInfo = monthData.dailyLunarInfo[currentDay];
      return {
        success: true,
        data: mapPhaseToEnum(phaseInfo.phase),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets the moon phases for all days in the current month.
   * @returns {Promise<MonthPhasesResponse>} The moon phases for the current month.
   */
  static async getMonthPhases(): Promise<MonthPhasesResponse> {
    try {
      const monthData = await this.getCurrentMonthData();
      if (!monthData?.dailyLunarInfo) {
        return {
          success: false,
          error: 'Month phase data not found',
        };
      }

      const result: DailyPhaseCalendar[] = Object.entries(
        monthData.dailyLunarInfo,
      )
        .map(([day, info]) => ({
          day: parseInt(day),
          status: mapPhaseToCalendarStatus(info.phase),
        }))
        .sort((a, b) => a.day - b.day);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets the next full moon and new moon events by analyzing daily lunar information.
   * @param {number} count - Optional parameter to specify how many next events to return.
   * @returns {Promise<MoonPhaseServiceResponse<MoonEvent[]>>} A list of moon events.
   */
  static async getNextMoonEvents(
    count = 2,
  ): Promise<MoonPhaseServiceResponse<MoonEvent[]>> {
    try {
      const currentDate = new Date();
      const events: MoonEvent[] = [];
      let currentYear = currentDate.getFullYear();
      let currentMonth = currentDate.getMonth() + 1;
      let currentDay = currentDate.getDate();

      while (events.length < count) {
        try {
          const fileName = `${CONFIG.filePrefix}-${currentYear}-${currentMonth.toString().padStart(2, '0')}.json`;
          const readResult = await fileSystemService.readFile(
            fileName,
            CONFIG.storageDirectory,
            false,
          );

          if (!readResult.success) {
            [currentYear, currentMonth] = getNextMonth(
              currentYear,
              currentMonth,
            );
            continue;
          }

          const data = JSON.parse(readResult.data.data.toString());
          const monthData = data.body as MoonPhaseData;

          if (monthData.dailyLunarInfo) {
            Object.entries(monthData.dailyLunarInfo).forEach(([day, info]) => {
              const dayNum = parseInt(day, 10);
              if (
                currentMonth === currentDate.getMonth() + 1 &&
                dayNum < currentDay
              ) {
                return;
              }

              if (info.phase === 'Luna nueva') {
                events.push({
                  type: 'Luna Nueva',
                  date: new Date(currentYear, currentMonth - 1, dayNum),
                });
              } else if (info.phase === 'Luna llena') {
                events.push({
                  type: 'Luna Llena',
                  date: new Date(currentYear, currentMonth - 1, dayNum),
                });
              }
            });
          }

          if (events.length >= count * 2) {
            break;
          }

          [currentYear, currentMonth] = getNextMonth(currentYear, currentMonth);
          currentDay = 1;
        } catch {
          [currentYear, currentMonth] = getNextMonth(currentYear, currentMonth);
        }
      }

      const sortedEvents = events
        .filter((event) => new Date(event.date) >= currentDate)
        .slice(0, count);

      if (sortedEvents.length === 0) {
        return {
          success: false,
          error: 'No se encontraron próximos eventos lunares.',
        };
      }

      return {
        success: true,
        data: sortedEvents,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get next moon events',
      };
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Reads the current month's data from filesystem.
   * File name: lunar-phases-YYYY-MM.json (R-26 preserved).
   * @private
   * @returns {Promise<MoonPhaseData>} The moon phase data for the current month.
   */
  private static async getCurrentMonthData(): Promise<MoonPhaseData> {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const fileName = `${CONFIG.filePrefix}-${year}-${month.toString().padStart(2, '0')}.json`;

    const readResult = await fileSystemService.readFile(
      fileName,
      CONFIG.storageDirectory,
      false,
    );

    if (!readResult.success) {
      throw new Error('Failed to read moon phase data from storage');
    }

    try {
      const data = JSON.parse(readResult.data.data.toString());
      return data.body as MoonPhaseData;
    } catch {
      throw new Error('Invalid moon phase data format');
    }
  }
}
