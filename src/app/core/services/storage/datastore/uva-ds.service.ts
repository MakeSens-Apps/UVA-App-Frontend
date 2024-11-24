import { DataStore } from '@aws-amplify/datastore';
import { UVA } from 'src/models/index';

/**
 * Service for managing UVA data.
 */
export class UvaDSService {
  /**
   * Retrieves a UVA by its ID.
   * @param {string} uvaID - ID of the UVA.
   * @returns {Promise<UVA | undefined>} The UVA object.
   */
  static async getUVAByID(uvaID: string): Promise<UVA | undefined> {
    try {
      return await DataStore.query(UVA, uvaID);
    } catch (error) {
      console.error('Error fetching UVA', error);
      throw error;
    }
  }

  /**
   * Retrieves a UVA by its userID.
   * @param {string} userID - ID of the User.
   * @returns {Promise<UVA | undefined>} The UVA object.
   */
  static async getUVAByuserID(userID: string): Promise<UVA | undefined> {
    try {
      const uvas = await DataStore.query(UVA, (c) => c.userID.eq(userID));
      if (uvas && uvas.length > 0) {
        return uvas[0];
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching UVA', error);
      throw error;
    }
  }

  /**
   * Updates a UVA's data.
   * @param {string} uvaID - ID of the UVA.
   * @param {Partial<UVA>} updates - Partial object with updated fields.
   * @returns {Promise<UVA | undefined>} The updated UVA object.
   */
  static async updateUVA(
    uvaID: string,
    updates: Partial<UVA>,
  ): Promise<UVA | undefined> {
    try {
      const uva = await DataStore.query(UVA, uvaID);
      if (uva) {
        return await DataStore.save(
          UVA.copyOf(uva, (updated) => {
            Object.assign(updated, updates);
          }),
        );
      }
      return undefined;
    } catch (error) {
      console.error('Error updating UVA', error);
      throw error;
    }
  }
}
