import { DataStore, SortDirection, Predicates } from '@aws-amplify/datastore';
import { Measurement } from 'src/models';

/**
 * Service for managing Measurement data.
 */
export class MeasurementDSService {
  /**
   * Adds a new Measurement.
   * @param {string}type - Type of the measurement.
   * @param {Record<string, number>} data - Data of the measurement (JSON).
   * @param {Record<string, number>} logs - Logs associated with the measurement (JSON).
   * @param {string} ts - Timestamp of the measurement.
   * @param {string} task - Task related to the measurement.
   * @param {string} uvaID - ID of the associated UVA.
   * @returns {Promise<Measurement>}The newly created Measurement.
   */
  static async addMeasurement(
    type: string,
    data: Record<string, number>,
    logs: Record<string, number>,
    ts: string,
    task: string,
    uvaID: string,
  ): Promise<Measurement> {
    try {
      return await DataStore.save(
        new Measurement({
          type,
          data: JSON.stringify(data),
          logs: JSON.stringify(logs),
          ts,
          task,
          uvaID,
        }),
      );
    } catch (error) {
      console.error('Error adding Measurement', error);
      throw error;
    }
  }

  /**
   * Retrieves all Measurements for a specific UVA.
   * @param {number} [limit] - Maximum number of entries to retrieve.
   * @param {SortDirection} [sortDirection] - Sorting direction: SortDirection.ASCENDING or SortDirection.DESCENDING.
   * @returns {Promise<Measurement[]>} List of Measurements.
   */
  static async getMeasurementsByUVA(
    limit?: number,
    sortDirection: SortDirection = SortDirection.DESCENDING,
  ): Promise<Measurement[]> {
    try {
      return await DataStore.query(Measurement, Predicates.ALL, {
        sort: (up) => up.ts(sortDirection),
        limit,
      });
    } catch (error) {
      console.error('Error fetching Measurements', error);
      throw error;
    }
  }

  /**
   * Retrieves Measurements within a given date range.
   * @param {Date} startDate - Start date of the range.
   * @param {Date} endDate - End date of the range.
   * @returns {Promise<Measurement[]>} List of Measurements within the date range.
   */
  static async getMeasurementsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Measurement[]> {
    try {
      return await DataStore.query(Measurement, (c) =>
        c.and((c) => [
          c.ts.ge(startDate.toISOString()),
          c.ts.le(endDate.toISOString()),
        ]),
      );
    } catch (error) {
      console.error('Error fetching Measurements by date range', error);
      throw error;
    }
  }
  /**
   * Retrieves Measurements within a given date range.
   * @param {number} year - Start date of the range.
   * @param {number} month - End date of the range.
   * @returns {Promise<Measurement[]>} List of Measurements within the date range.
   */
  static async getMeasurementsByMont(
    year: number,
    month: number,
  ): Promise<Measurement[]> {
    try {
      const startDate = new Date(year, month, 1); // Primer día del mes
      const endDate = new Date(year, month + 1, 0); // Último día del mes

      return await DataStore.query(Measurement, (c) =>
        c.and((c) => [
          c.ts.ge(startDate.toISOString()),
          c.ts.le(endDate.toISOString()),
        ]),
      );
    } catch (error) {
      console.error('Error fetching Measurements by date range', error);
      throw error;
    }
  }

  static async countMeasurementsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      const measurements = await this.getMeasurementsByDateRange(
        startDate,
        endDate,
      );
      return measurements.length; // Devuelve el número de registros.
    } catch (error) {
      console.error('Error counting Measurements by date range', error);
      throw error;
    }
  }

  /**
   * Retrieves Measurements for a specific day.
   * @param {number} year - Year of the desired day.
   * @param {number} month - Month of the desired day (1-12).
   * @param {number} day - Day of the desired day.
   * @returns {Promise<Measurement[]>} List of Measurements on the specified day.
   */
  static async getMeasurementsByDay(
    year: number,
    month: number,
    day: number,
  ): Promise<Measurement[]> {
    try {
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

      return await this.getMeasurementsByDateRange(startOfDay, endOfDay);
    } catch (error) {
      console.error('Error fetching Measurements for a specific day', error);
      throw error;
    }
  }

  /**
   * Counts the number of Measurements for a specific day.
   * @param {number} year - Year of the desired day.
   * @param {number} month - Month of the desired day (1-12).
   * @param {number} day - Day of the desired day.
   * @returns {Promise<number>} The number of Measurements on the specified day.
   */
  static async countMeasurementsByDay(
    year: number,
    month: number,
    day: number,
  ): Promise<number> {
    try {
      const measurements = await this.getMeasurementsByDay(year, month, day);
      return measurements.length;
    } catch (error) {
      console.error('Error counting Measurements for a specific day', error);
      throw error;
    }
  }
}
