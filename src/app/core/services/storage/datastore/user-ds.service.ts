import { DataStore } from '@aws-amplify/datastore';
import { User } from 'src/models';
import { SessionService } from '../../session/session.service';

interface UserUpdateData {
  name?: string;
  lastName?: string;
  email?: string;
}
/**
 * Service for managing User data.
 */
export class UserDSService {
  static session = new SessionService();
  /**
   * Retrieves a User by logged
   * @returns {Promise<User | undefined>}The User object.
   */
  static async getUser(): Promise<User | undefined> {
    try {
      const userID = (await this.session.getInfo()).userID ?? '';
      return await DataStore.query(User, userID);
    } catch (error) {
      console.error('Error fetching User', error);
      throw error;
    }
  }

  /**
   * Updates a User's data.
   * @param {UserUpdateData} update - Partial object with updated fields.
   * @returns {Promise<User | undefined>}The updated User object.
   */
  static async updateUser(update: UserUpdateData): Promise<User | undefined> {
    try {
      const userID = (await this.session.getInfo()).userID ?? '';
      const uvaID = (await this.session.getInfo()).uvaID ?? '';
      const user = await DataStore.query(User, userID);
      if (user) {
        return await DataStore.save(
          User.copyOf(user, (updated) => {
            updated.Name = update.name ?? '';
            updated.LastName = update.lastName ?? '';
            updated.Email = update.email;
            updated.uvaID = uvaID;
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
