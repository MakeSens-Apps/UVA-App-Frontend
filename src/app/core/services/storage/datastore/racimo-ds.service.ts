import { DataStore } from '@aws-amplify/datastore';
import { RACIMO } from 'src/models';

export class RacimoDSService {
  /**
   * Retrieves a User by their ID.
   * @param {string} racimoID - ID of the User.
   * @returns {Promise<string | undefined>}The User object.
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
