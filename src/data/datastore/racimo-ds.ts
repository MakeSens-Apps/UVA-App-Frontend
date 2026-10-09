/**
 * B04 — RacimoDSService
 * Ported from: src/app/core/services/storage/datastore/racimo-ds.service.ts
 * Classification: Reusable as-is
 * Changes:
 *   - No @Injectable (already had none in original)
 *   - Import paths updated to mobile/ structure
 *   - Does NOT use SessionService (no static session = new SessionService())
 *
 * Static methods preserved as-is.
 */

import { DataStore } from '@aws-amplify/datastore';
import { RACIMO } from '@/data/models';

export class RacimoDSService {
  /**
   * Retrieves a RACIMO's LinkageCode by racimoID.
   * @param {string} racimoID - ID of the RACIMO.
   * @returns {Promise<string | undefined>} The LinkageCode.
   */
  static async getRacimoCode(racimoID: string): Promise<string | undefined> {
    try {
      const racimo = await DataStore.query(RACIMO, racimoID);
      return racimo?.LinkageCode;
    } catch (error) {
      console.error('Error fetching User', error);
      throw error;
    }
  }
}
