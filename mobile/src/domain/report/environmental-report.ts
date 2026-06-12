/**
 * B15-cierre — EnvironmentalReportService (domain/report)
 *
 * Ported from:
 *   - src/app/core/services/view/environmental-report.service.ts
 *   - src/app/components/environmental-report/environmental-report.component.ts
 *
 * Changes from original:
 *   - Web-only: Angular DI / ApplicationRef / createComponent / html-to-image removed.
 *     Image capture is done by the React component layer (HistoricalScreen) via
 *     react-native-view-shot captureRef() — not here.
 *   - generateReportImage() is NOT ported (it was the Angular-specific method).
 *   - Pure data transformation kept as static methods (zero I/O in this file).
 *   - Data fetching (UserDSService, UvaDSService, MeasurementDSService) preserved with
 *     original logic and all field name variants (TEMPERATURA_MAX, temperature, temp, etc.).
 *
 * Risks: R-01 (image capture done natively in RN — this is the fix), R-42 (field names).
 */

import { UserDSService } from '@/data/datastore/user-ds';
import { UvaDSService } from '@/data/datastore/uva-ds';
import { MeasurementDSService } from '@/data/datastore/measurement-ds';

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Daily measurement data for day/night periods.
 * "day" = morning (00:00–11:59), "night" = afternoon (12:00–23:59).
 * Note: the original HTML labels them as "Día" and "Noche" but represents
 * morning/afternoon measurements. Preserved as-is.
 */
export interface DayData {
  day: {
    tempMax: number | null;
    tempMin: number | null;
    humMax: number | null;
    humMin: number | null;
  };
  night: {
    tempMax: number | null;
    tempMin: number | null;
    humMax: number | null;
    humMin: number | null;
  };
  rainfall: number | null;
}

/**
 * Complete report data for a month.
 */
export interface ReportData {
  month: string;
  farmName: string;
  monitorName: string;
  days: DayData[];
  summary: {
    totalRainfall: number | null;
    rainyDays: number;
    temperature: {
      max: number | null;
      min: number | null;
      avg: number | null;
    };
    humidity: {
      max: number | null;
      min: number | null;
      avg: number | null;
    };
  };
}

// ─── Month names ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Measurement raw type ─────────────────────────────────────────────────────

interface RawMeasurement {
  ts: string;
  data: string | Record<string, number> | null | undefined;
}

// ─── EnvironmentalReportService ───────────────────────────────────────────────

/**
 * Generates monthly environmental report data.
 * RN equivalent of the Angular EnvironmentalReportService — data layer only.
 * Image capture is responsibility of the view layer (HistoricalScreen + view-shot).
 */
export class EnvironmentalReportService {
  /**
   * Truncates text to 20 characters with ellipsis.
   * Preserved from original (historical.page.ts).
   */
  private static truncateText(text: string): string {
    if (!text || text.length <= 20) return text;
    return text.substring(0, 18) + '...';
  }

  /**
   * Generates report data for a specific month and year.
   * Fetches user, UVA, and measurement data (same logic as original).
   *
   * @param {number} year - The year (e.g. 2026)
   * @param {number} month - The month, 0-based (e.g. 4 = Mayo)
   * @returns {Promise<ReportData>}
   */
  static async generateReportData(year: number, month: number): Promise<ReportData> {
    // User name
    let userName = 'Usuario';
    try {
      const user = await UserDSService.getUser();
      if (user) userName = `${user.Name} ${user.LastName}`;
    } catch {
      // non-fatal
    }

    // Farm name from UVA fields
    let farmName = 'Finca Registrada';
    try {
      const uva = await UvaDSService.getUVAByID();
      if (uva?.fields) {
        const fields = typeof uva.fields === 'string' ? JSON.parse(uva.fields) : uva.fields;
        if (fields && typeof fields === 'object' && fields['farmName']) {
          farmName = fields['farmName'];
        }
      }
    } catch {
      // non-fatal: use default
    }

    // Measurements
    const rawMeasurements = await MeasurementDSService.getMeasurementsByMont(year, month);
    const days = EnvironmentalReportService.processDailyData(rawMeasurements as RawMeasurement[], year, month);
    const summary = EnvironmentalReportService.calculateSummary(days);

    return {
      month: `${MONTH_NAMES[month]} ${year}`,
      farmName: EnvironmentalReportService.truncateText(farmName),
      monitorName: EnvironmentalReportService.truncateText(userName),
      days,
      summary,
    };
  }

  /**
   * Processes raw measurements into an array of DayData (one entry per day in the month).
   */
  static processDailyData(measurements: RawMeasurement[], year: number, month: number): DayData[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const measurementsByDay = EnvironmentalReportService.groupMeasurementsByDay(measurements);
    const days: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayMeasurements = measurementsByDay[dayKey] ?? [];
      days.push(EnvironmentalReportService.processDayMeasurements(dayMeasurements));
    }

    return days;
  }

  /**
   * Groups measurements by YYYY-MM-DD key.
   */
  static groupMeasurementsByDay(measurements: RawMeasurement[]): Record<string, RawMeasurement[]> {
    const grouped: Record<string, RawMeasurement[]> = {};
    for (const m of measurements) {
      const d = new Date(m.ts);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(m);
    }
    return grouped;
  }

  /**
   * Splits day's measurements into morning/afternoon, calculates temp/hum stats + rainfall.
   */
  static processDayMeasurements(measurements: RawMeasurement[]): DayData {
    const morning = measurements.filter((m) => new Date(m.ts).getHours() < 12);
    const afternoon = measurements.filter((m) => new Date(m.ts).getHours() >= 12);

    return {
      day: EnvironmentalReportService.calculatePeriodStats(morning),
      night: EnvironmentalReportService.calculatePeriodStats(afternoon),
      rainfall: EnvironmentalReportService.calculateTotalRainfall(measurements),
    };
  }

  /**
   * Calculates temperature/humidity stats for a measurement period.
   * Supports all known field name variants from the original service.
   */
  static calculatePeriodStats(measurements: RawMeasurement[]): DayData['day'] {
    if (measurements.length === 0) {
      return { tempMax: null, tempMin: null, humMax: null, humMin: null };
    }

    const temperatures: number[] = [];
    const humidities: number[] = [];

    for (const m of measurements) {
      try {
        const data: Record<string, number> | null =
          typeof m.data === 'string' ? JSON.parse(m.data) : (m.data as Record<string, number> | null);
        if (!data) continue;

        // Temperature field variants (preserved from original)
        for (const key of ['TEMPERATURA_MAX', 'TEMPERATURA_MIN', 'temperature', 'temp', 'Temperature']) {
          if (data[key] !== undefined) temperatures.push(data[key]);
        }
        // Humidity field variants (preserved from original)
        for (const key of ['HUMEDAD_MAX', 'HUMEDAD_MIN', 'humidity', 'hum', 'Humidity']) {
          if (data[key] !== undefined) humidities.push(data[key]);
        }
      } catch {
        // ignore parse errors
      }
    }

    return {
      tempMax: temperatures.length > 0 ? Math.max(...temperatures) : null,
      tempMin: temperatures.length > 0 ? Math.min(...temperatures) : null,
      humMax: humidities.length > 0 ? Math.max(...humidities) : null,
      humMin: humidities.length > 0 ? Math.min(...humidities) : null,
    };
  }

  /**
   * Calculates total rainfall from measurements.
   * Supports all known field name variants.
   */
  static calculateTotalRainfall(measurements: RawMeasurement[]): number {
    let total = 0;
    for (const m of measurements) {
      try {
        const data: Record<string, number> | null =
          typeof m.data === 'string' ? JSON.parse(m.data) : (m.data as Record<string, number> | null);
        if (!data) continue;
        for (const key of ['PRECIPITACION', 'rain', 'rainfall', 'Rain']) {
          if (data[key] !== undefined) total += data[key];
        }
      } catch {
        // ignore
      }
    }
    return Math.round(total * 10) / 10;
  }

  /**
   * Calculates monthly summary statistics from the days array.
   */
  static calculateSummary(days: DayData[]): ReportData['summary'] {
    const allTemps: number[] = [];
    const allHums: number[] = [];
    let totalRainfall = 0;
    let rainyDays = 0;

    for (const day of days) {
      // Temperatures — include 0 and negatives (valid data)
      for (const v of [day.day.tempMax, day.day.tempMin, day.night.tempMax, day.night.tempMin]) {
        if (v !== null && v !== undefined) allTemps.push(v);
      }
      // Humidities — include 0, exclude negatives
      for (const v of [day.day.humMax, day.day.humMin, day.night.humMax, day.night.humMin]) {
        if (v !== null && v !== undefined && v >= 0) allHums.push(v);
      }
      // Rainfall
      if (day.rainfall !== null && day.rainfall !== undefined) {
        totalRainfall += day.rainfall;
        if (day.rainfall > 0) rainyDays++;
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;

    return {
      totalRainfall: totalRainfall > 0 ? Math.round(totalRainfall * 10) / 10 : null,
      rainyDays,
      temperature: {
        max: allTemps.length > 0 ? Math.max(...allTemps) : null,
        min: allTemps.length > 0 ? Math.min(...allTemps) : null,
        avg: avg(allTemps),
      },
      humidity: {
        max: allHums.length > 0 ? Math.max(...allHums) : null,
        min: allHums.length > 0 ? Math.min(...allHums) : null,
        avg: avg(allHums),
      },
    };
  }

  /**
   * Formats a numeric value for display (1 decimal or '-' if null).
   * Equivalent to Angular's formatValue() from environmental-report.component.ts.
   */
  static formatValue(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return value.toFixed(1);
  }

  /**
   * Formats rainfall value for display (positive value or '-' if 0/null).
   * Equivalent to Angular's formatRainfall().
   */
  static formatRainfall(rainfall: number | null | undefined): string {
    if (rainfall === null || rainfall === undefined) return '-';
    return rainfall > 0 ? String(rainfall) : '-';
  }

  /**
   * Gets the first 15 days (first half) of the month.
   */
  static getFirstHalfDays(days: DayData[]): DayData[] {
    return days.slice(0, 15);
  }

  /**
   * Gets days 16–31 (second half) of the month.
   */
  static getSecondHalfDays(days: DayData[]): DayData[] {
    return days.slice(15);
  }
}
