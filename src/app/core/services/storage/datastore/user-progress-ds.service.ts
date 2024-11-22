import { DataStore } from '@aws-amplify/datastore';
import { UserProgress } from 'src/models';
import { SortDirection, Predicates } from '@aws-amplify/datastore';

/**
 * Service for managing UserProgress data.
 */
export class UserProgressDSService {
  /**
   * Adds a new UserProgress entry.
   * @param {string} ts - Timestamp of the progress.
   * @param {number} seed - Seed value.
   * @param {number} streak - Streak count.
   * @param {number} completedTasks - Number of completed tasks.
   * @param {string} userID - ID of the associated User.
   * @param {string} milestones - Milestones achieved.
   * @returns {Promise<UserProgress>} The newly created UserProgress.
   */
  static async addUserProgress(
    ts: string,
    seed: number,
    streak: number,
    completedTasks: number,
    userID: string,
    milestones?: string,
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
      return await DataStore.query(UserProgress, Predicates.ALL, {
        sort: (up) => up.ts(sortDirection),
        limit,
      });
    } catch (error) {
      console.error('Error fetching UserProgress', error);
      throw error;
    }
  }

  /**
   * Retrieves lastUser.
   * @param {string} userID - ID of the User.
   * @returns {Promise<UserProgress>} List of UserProgress entries.
   */
  static async getLastUserProgress(
    userID: string,
  ): Promise<UserProgress | null> {
    const progressEntries = await this.getUserProgress(
      userID,
      1,
      SortDirection.DESCENDING,
    );
    return progressEntries.length > 0 ? progressEntries[0] : null;
  }
}
