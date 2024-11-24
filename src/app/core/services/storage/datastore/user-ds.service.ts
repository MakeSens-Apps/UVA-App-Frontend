import { DataStore } from '@aws-amplify/datastore';
import { User } from 'src/models';

/**
 * Service for managing User data.
 */
export class UserDSService {
  /**
   * Retrieves a User by their ID.
   * @param {string} userID - ID of the User.
   * @returns {Promise<User | undefined>}The User object.
   */
  static async getUserByID(userID: string): Promise<User | undefined> {
    try {
      return await DataStore.query(User, userID);
    } catch (error) {
      console.error('Error fetching User', error);
      throw error;
    }
  }

  /**
   * Updates a User's data.
   * @param {string} userID - ID of the User.
   * @param {Partial<User>} updates - Partial object with updated fields.
   * @returns {Promise<User | undefined>}The updated User object.
   */
  static async updateUser(
    userID: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    try {
      const user = await DataStore.query(User, userID);
      if (user) {
        return await DataStore.save(
          User.copyOf(user, (updated) => {
            Object.assign(updated, updates);
          }),
        );
      }
      return undefined;
    } catch (error) {
      console.error('Error updating User', error);
      throw error;
    }
  }
}
