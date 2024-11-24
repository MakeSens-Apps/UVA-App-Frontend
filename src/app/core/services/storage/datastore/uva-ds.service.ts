import { DataStore } from '@aws-amplify/datastore';
import { UVA } from 'src/models/index';
import { SessionService } from '../../session/session.service';

interface UVAUpdateDate {
  latitude?: string;
  longitude?: string;
  altitud?: string;
  fields?: string;
}

/**
 * Service for managing UVA data.
 */
export class UvaDSService {
  static session = new SessionService();
  /**
   * Retrieves a UVA by its ID.
   * @returns {Promise<UVA | undefined>} The UVA object.
   */
  static async getUVAByID(): Promise<UVA | undefined> {
    try {
      const uvaID = (await this.session.getInfo()).uvaID ?? '';
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
   * @param {UVAUpdateDate} updates - Partial object with updated fields.
   * @returns {Promise<UVA | undefined>} The updated UVA object.
   */
  static async updateUVA(updates: UVAUpdateDate): Promise<UVA | undefined> {
    try {
      const uvaID = (await this.session.getInfo()).uvaID ?? '';
      const original = await DataStore.query(UVA, uvaID);
      if (original) {
        return await DataStore.save(
          UVA.copyOf(original, (updated) => {
            updated.latitude = updates.latitude;
            updated.longitude = updates.longitude;
            updated.altitude = updates.altitud;
            updated.fields = updates.fields;
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
