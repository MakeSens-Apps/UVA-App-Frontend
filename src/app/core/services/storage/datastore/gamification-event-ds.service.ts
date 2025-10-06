import { DataStore, SortDirection } from '@aws-amplify/datastore';
import { GamificationEvent } from 'src/models';
import { SessionService } from '../../session/session.service';

type GamificationEventFields = Partial<
  Omit<GamificationEvent, 'id' | 'userID' | 'racimoID'>
>;

/**
 * Service for managing GamificationEvent data.
 */
export class GamificationEventDSService {
  static session = new SessionService();

  /**
   * Adds a new GamificationEvent entry.
   * @param {string} eventType - Type of the event.
   * @param {string} data - JSON data for the event.
   * @param {string} racimoID - Racimo ID (optional, defaults to session).
   * @param {string} ts - Timestamp.
   * @returns {Promise<GamificationEvent>} The newly created GamificationEvent.
   */
  static async createGamificationEvent(
    eventType: string,
    data: string,
    racimoID?: string,
    ts?: string,
  ): Promise<GamificationEvent | undefined> {
    try {
      const sessionInfo = await this.session.getInfo();
      const userID = sessionInfo.userID ?? '';
      const racimo = racimoID || sessionInfo.racimoID || '';

      const newEvent = await DataStore.save(
        new GamificationEvent({
          ts: ts ? ts : new Date().toISOString(),
          eventType,
          data,
          userID,
          racimoID: racimo,
          isUnclean: true,
        }),
      );
      return newEvent;
    } catch (error) {
      console.error('Error creating GamificationEvent:', error);
      throw error;
    }
  }

  /**
   * Retrieves GamificationEvents for the current user.
   * @param {number} limit - Maximum number of entries to retrieve.
   * @param {SortDirection} sortDirection - Sorting direction.
   * @returns {Promise<GamificationEvent[]>} List of GamificationEvents.
   */
  static async getGamificationEvents(
    limit = 50,
    sortDirection: SortDirection = SortDirection.DESCENDING,
  ): Promise<GamificationEvent[]> {
    try {
      const userID = (await this.session.getInfo()).userID ?? '';
      console.log('Fetching GamificationEvents for userID:', userID);
      const response = await DataStore.query(
        GamificationEvent,
        (c) => c.userID.eq(userID) && c.isUnclean.eq(true),
        {
          sort: (ge) => ge.ts(sortDirection),
          limit,
        },
      );
      console.log('Fetched GamificationEvents:', response);
      return response;
    } catch (error) {
      console.error('Error fetching GamificationEvents', error);
      throw error;
    }
  }

  /**
   * Retrieves GamificationEvents by racimoID.
   * @param {string} racimoID - Racimo ID.
   * @param {number} limit - Maximum number of entries.
   * @param {SortDirection} sortDirection - Sorting direction.
   * @returns {Promise<GamificationEvent[]>} List of GamificationEvents.
   */
  static async getGamificationEventsByRacimo(
    racimoID: string,
    limit = 50,
    sortDirection: SortDirection = SortDirection.DESCENDING,
  ): Promise<GamificationEvent[]> {
    try {
      const response = await DataStore.query(
        GamificationEvent,
        (c) => c.racimoID.eq(racimoID),
        {
          sort: (ge) => ge.ts(sortDirection),
          limit,
        },
      );
      return response;
    } catch (error) {
      console.error('Error fetching GamificationEvents by racimo', error);
      throw error;
    }
  }
}
