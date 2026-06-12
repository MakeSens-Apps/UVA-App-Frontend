/**
 * B07 — Historical Aggregations (domain/aggregations)
 * Extracted from: src/app/pages/historical/historical.page.ts (lines 631–871, 1322-line file)
 * Per plan.md B07: "extraer agregaciones de HistoricalPage [...] a funciones puras con
 *   fixtures REALES sacados del código/datos originales" (R-32)
 *
 * Functions extracted (all were private methods of HistoricalPage):
 *   - transformData()         — reshapes Measurement[] to HistoricalMeasurement keyed by measurementId
 *   - sum()                   — sums values across MeasurementEntry[]
 *   - mean()                  — means across two MeasurementEntry[] lists
 *   - calculateMeasurement()  — groups by date and applies sum or mean per day
 *   - calculateDetailedMeasurement() — groups by date, calculates avg/min/max per day
 *   - calculateOverallStats() — overall min/max/avg across a measurement's historical data
 *
 * These functions have ZERO side-effects and ZERO I/O — they transform data in memory.
 * They do NOT import from React, RN, or any native module.
 *
 * Type definitions for HistoricalMeasurement, MeasurementEntry, DailyStats, and
 * DetailedMeasurementEntry are declared here (were in historical.model.ts in the original).
 *
 * The Historical interface is imported from measurements.model (same file as original).
 */

import { Historical } from '@/data/models/configuration/measurements.model';

// ─── Type definitions (from historical.model.ts in the original) ──────────────

/**
 * A single timestamped measurement value.
 * The key is the ISO timestamp string; the value is the numeric measurement.
 * e.g. { "2024-01-15T10:30:00Z": 23.5 }
 */
export type MeasurementEntry = Record<string, number>;

/**
 * Historical measurement map: measurementId → array of timestamped values.
 * e.g. { "temperatura": [{"2024-01-15T10:30:00Z": 23.5}, ...], "humedad": [...] }
 */
export type HistoricalMeasurement = Record<string, MeasurementEntry[]>;

/**
 * Daily statistics for detailed mode (avg, min, max).
 */
export interface DailyStats {
  avg: number;
  min: number;
  max: number;
}

/**
 * Detailed measurement entry: date string → DailyStats.
 * e.g. { "2024-01-15": { avg: 23.5, min: 21.0, max: 26.0 } }
 */
export type DetailedMeasurementEntry = Record<string, DailyStats>;

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Transforms raw Measurement records into a HistoricalMeasurement map.
 * Groups values by measurementId (the `data` keys) and sorts each list by timestamp.
 *
 * Input shape (Amplify DataStore Measurement):
 *   { data: Record<string, number>, ts: string, ... }
 *
 * Output shape:
 *   { [measurementId]: [{ [ts]: value }, ...] }
 *
 * @param {Array<{ data?: Record<string, number> | null; ts: string }>} initialData
 * @returns {HistoricalMeasurement}
 */
export function transformData(
  initialData: Array<{ data?: Record<string, number> | null; ts: string }>,
): HistoricalMeasurement {
  const result: HistoricalMeasurement = {};

  for (const record of initialData) {
    const { data, ts } = record;

    if (data && typeof data === 'object') {
      for (const [key] of Object.entries(data)) {
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push({ [ts]: (data as Record<string, number>)[key] });
      }
    }
  }

  // Sort each list by timestamp (ascending)
  for (const key in result) {
    result[key] = result[key]
      .filter((entry) => entry !== undefined)
      .sort((a, b) => {
        const tsA = a ? parseInt(Object.keys(a)[0], 10) : 0;
        const tsB = b ? parseInt(Object.keys(b)[0], 10) : 0;
        return tsA - tsB;
      });
  }

  return result;
}

/**
 * Sums all values in a MeasurementEntry array.
 * Returns undefined if the array is falsy or empty.
 *
 * @param {MeasurementEntry[]} data
 * @returns {number | undefined}
 */
export function sum(data: MeasurementEntry[]): number | undefined {
  if (!data) {
    return undefined;
  }
  const total = data.reduce((acc, item) => {
    if (item) {
      const value = Object.values(item)[0];
      return acc + value;
    }
    return acc;
  }, 0);

  return Math.round(total);
}

/**
 * Calculates the mean of two MeasurementEntry arrays combined.
 * Treats the two lists as one pool of values and computes the overall average.
 * Returns undefined if either list is falsy or the combined count is 0.
 *
 * @param {MeasurementEntry[]} list1
 * @param {MeasurementEntry[]} list2
 * @returns {number | undefined}
 */
export function mean(
  list1: MeasurementEntry[],
  list2: MeasurementEntry[],
): number | undefined {
  if (!list1 || !list2) {
    return undefined;
  }
  const sum1 = sum(list1) ?? 0;
  const sum2 = sum(list2) ?? 0;
  const totalSum = sum1 + sum2;
  const totalCount = list1.length + list2.length;

  if (totalCount === 0) {
    return undefined;
  }

  return Math.round(totalSum / totalCount);
}

/**
 * Calculates aggregated measurement values (sum or mean) for the specified keys.
 * Groups measurements by date (ignoring time) and applies the aggregation per day.
 *
 * @param {HistoricalMeasurement} historicalData
 * @param {string[]} keys - measurement IDs to aggregate
 * @param {'sum' | 'mean'} calculationType
 * @returns {MeasurementEntry} date string → aggregated value
 */
export function calculateMeasurement(
  historicalData: HistoricalMeasurement,
  keys: string[],
  calculationType: 'sum' | 'mean',
): MeasurementEntry {
  const result: MeasurementEntry = {};

  keys.forEach((key) => {
    if (historicalData[key]) {
      const dailyValues: Record<string, number[]> = {};

      historicalData[key].forEach((entry) => {
        for (const timestamp in entry) {
          const date = timestamp.split('T')[0]; // YYYY-MM-DD
          if (!dailyValues[date]) {
            dailyValues[date] = [];
          }
          dailyValues[date].push(entry[timestamp]);
        }
      });

      for (const date in dailyValues) {
        const values = dailyValues[date];
        if (calculationType === 'sum') {
          result[date] = values.reduce((acc, val) => acc + val, 0);
        } else if (calculationType === 'mean') {
          result[date] =
            values.reduce((acc, val) => acc + val, 0) / values.length;
        }
      }
    }
  });

  return result;
}

/**
 * Calculates detailed daily statistics (avg, min, max) for the specified keys.
 * Groups measurements by date (ignoring time) and calculates statistics per day.
 *
 * @param {HistoricalMeasurement} historicalData
 * @param {string[]} keys - measurement IDs to process
 * @returns {DetailedMeasurementEntry} date string → { avg, min, max }
 */
export function calculateDetailedMeasurement(
  historicalData: HistoricalMeasurement,
  keys: string[],
): DetailedMeasurementEntry {
  const result: DetailedMeasurementEntry = {};

  keys.forEach((key) => {
    if (historicalData[key]) {
      const dailyValues: Record<string, number[]> = {};

      historicalData[key].forEach((entry) => {
        for (const timestamp in entry) {
          const date = timestamp.split('T')[0];
          if (!dailyValues[date]) {
            dailyValues[date] = [];
          }
          dailyValues[date].push(entry[timestamp]);
        }
      });

      for (const date in dailyValues) {
        const values = dailyValues[date];
        if (values.length > 0) {
          const avg =
            values.reduce((acc, val) => acc + val, 0) / values.length;
          const minVal = Math.min(...values);
          const maxVal = Math.max(...values);
          result[date] = { avg, min: minVal, max: maxVal };
        }
      }
    }
  });

  return result;
}

/**
 * Calculates overall statistics (min, max, avg) for a measurement.
 * For 'mean'+'line' graphs: uses calculateDetailedMeasurement to aggregate daily data.
 * For 'sum' or other graphs: uses calculateMeasurement.
 *
 * @param {Historical} measurement - The measurement configuration
 * @param {HistoricalMeasurement} transformedData
 * @returns {{ min: number|undefined; max: number|undefined; avg: number|undefined }}
 */
export function calculateOverallStats(
  measurement: Historical,
  transformedData: HistoricalMeasurement,
): { min: number | undefined; max: number | undefined; avg: number | undefined } {
  if (
    measurement.aggregationFunction === 'mean' &&
    measurement.graph.type === 'line'
  ) {
    const detailedMeasures = calculateDetailedMeasurement(
      transformedData,
      measurement.measurementIds,
    );

    if (detailedMeasures && Object.keys(detailedMeasures).length > 0) {
      const dailyStats = Object.values(detailedMeasures);
      const mins = dailyStats.map((stats) => stats.min);
      const maxs = dailyStats.map((stats) => stats.max);
      const avgs = dailyStats.map((stats) => stats.avg);

      return {
        min: mins.length > 0 ? Math.min(...mins) : undefined,
        max: maxs.length > 0 ? Math.max(...maxs) : undefined,
        avg:
          avgs.length > 0
            ? avgs.reduce((s, a) => s + a, 0) / avgs.length
            : undefined,
      };
    }
  } else {
    const measures = calculateMeasurement(
      transformedData,
      measurement.measurementIds,
      measurement.aggregationFunction === 'sum' ? 'sum' : 'mean',
    );

    if (measures) {
      const values = Object.values(measures);
      const total =
        values.length > 0 ? values.reduce((s, val) => s + val, 0) : 0;
      return {
        min: values.length > 0 ? Math.min(...values) : undefined,
        max: values.length > 0 ? Math.max(...values) : undefined,
        avg:
          measurement.aggregationFunction === 'sum'
            ? total
            : values.length > 0
              ? total / values.length
              : undefined,
      };
    }
  }

  return { min: undefined, max: undefined, avg: undefined };
}
