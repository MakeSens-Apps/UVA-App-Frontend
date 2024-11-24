import { DataStore } from '@aws-amplify/datastore';
import { UserProgress } from 'src/models';
import { SortDirection, Predicates } from '@aws-amplify/datastore';
import { SessionService } from '../../session/session.service';
/**
 * Service for managing UserProgress data.
 */
export class UserProgressDSService {
  static session = new SessionService();
  /**
   * Adds a new UserProgress entry.
   * @param {number} seed - Seed value.
   * @param {number} streak - Streak count.
   * @param {number} completedTasks - Number of completed tasks.
   * @param {string} milestones - Milestones achieved.
   * @returns {Promise<UserProgress>} The newly created UserProgress.
   */
  static async addUserProgress(
    seed?: number,
    streak?: number,
    completedTasks?: number,
    milestones?: string,
  ): Promise<UserProgress> {
    try {
      let userID = (await this.session.getInfo()).userID ?? '';
      let ts = new Date().toISOString();

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
   * @param {number} [limit] - Maximum number of entries to retrieve.
   * @param {SortDirection} [sortDirection] - Sorting direction: SortDirection.ASCENDING or SortDirection.DESCENDING.
   * @returns {Promise<UserProgress[]>} List of UserProgress entries.
   */
  static async getUserProgress(
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
   * @returns {Promise<UserProgress>} List of UserProgress entries.
   */
  static async getLastUserProgress(): Promise<UserProgress | null> {
    const progressEntries = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
    );
    return progressEntries.length > 0 ? progressEntries[0] : null;
  }

  static async getMilestones(): Promise<string[]> {
    const userID = (await this.session.getInfo()).userID ?? '';

    const milestonesRecords = await DataStore.query(UserProgress, (c) =>
      c.and((c) => [
        c.userID.eq(userID),
        c.Milestones.ne(null),
        c.Milestones.ne(undefined),
      ]),
    );
    return milestonesRecords
      .map((record) => record.Milestones)
      .filter(
        (milestone): milestone is string =>
          !!milestone && milestone.trim() !== '',
      );
  }
}
