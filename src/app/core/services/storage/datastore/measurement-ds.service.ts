import { DataStore } from '@aws-amplify/datastore';
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
   * @param {string} uvaID - ID of the UVA.
   * @returns {Promise<Measurement[]>} List of Measurements.
   */
  static async getMeasurementsByUVA(uvaID: string): Promise<Measurement[]> {
    try {
      return await DataStore.query(Measurement, (m) => m.uvaID.eq(uvaID));
    } catch (error) {
      console.error('Error fetching Measurements', error);
      throw error;
    }
  }
}
