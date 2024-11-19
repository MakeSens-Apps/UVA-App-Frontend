import { DataStore } from '@aws-amplify/datastore';
import { UserProgress } from 'src/models';
import { SortDirection } from '@aws-amplify/datastore';

/**
 * Service for managing UserProgress data.
 */
export class UserProgressDSService {
  /**
   * Adds a new UserProgress entry.
   * @param {string} ts - Timestamp of the progress.
   * @param {number} seed - Seed value.
   * @param {number} streak - Streak count.
   * @param {string} milestones - Milestones achieved.
   * @param {number} completedTasks - Number of completed tasks.
   * @param {string} userID - ID of the associated User.
   * @returns {Promise<UserProgress>} The newly created UserProgress.
   */
  static async addUserProgress(
    ts: string,
    seed: number,
    streak: number,
    milestones: string,
    completedTasks: number,
    userID: string,
  ): Promise<UserProgress> {
    try {
      return await DataStore.save(
        new UserProgress({
          ts,
          Seed: seed,
          Streak: streak,
          Milestones: milestones,
          completedTasks,
          userID,
        }),
      );
    } catch (error) {
      console.error('Error adding UserProgress', error);
      throw error;
    }
  }

  /**
   * Retrieves all progress entries for a specific user.
   * @param {string} userID - ID of the User.
   * @param {number} [limit] - Maximum number of entries to retrieve.
   * @param {SortDirection} [sortDirection] - Sorting direction: SortDirection.ASCENDING or SortDirection.DESCENDING.
   * @returns {Promise<UserProgress[]>} List of UserProgress entries.
   */
  static async getUserProgress(
    userID: string,
    limit?: number,
    sortDirection: SortDirection = SortDirection.DESCENDING,
  ): Promise<UserProgress[]> {
    try {
      return await DataStore.query(UserProgress, (up) => up.userID.eq(userID), {
        sort: (up) => up.ts(sortDirection),
        limit,
      });
    } catch (error) {
      console.error('Error fetching UserProgress', error);
      throw error;
    }
  }
}
