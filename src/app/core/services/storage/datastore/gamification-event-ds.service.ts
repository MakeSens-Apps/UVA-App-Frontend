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
  static mockEvents: GamificationEvent[] = [
    new GamificationEvent({
      ts: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      eventType: 'bonus',
      data: JSON.stringify({ subtype: 'streak_recovery', isUnread: true }),
      userID: '123d-adda-1234-5678-abcdef123456',
      racimoID: 'racimo-1234-5678-abcdef',
      isUnclean: true,
    }),
    new GamificationEvent({
      ts: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(), // 9 hours ago
      eventType: 'streak',
      data: JSON.stringify({
        subtype: 'streak_reward',
        days: 7,
        isUnread: true,
      }),
      userID: '123d-adda-1234-5678-abcdef123456',
      racimoID: 'racimo-1234-5678-abcdef',
      isUnclean: true,
    }),
    new GamificationEvent({
      ts: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
      eventType: 'seeds',
      data: JSON.stringify({ subtype: 'first_task', isUnread: false }),
      userID: '123d-adda-1234-5678-abcdef123456',
      racimoID: 'racimo-1234-5678-abcdef',
      isUnclean: true,
    }),
  ];

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

      // Mock data instead of saving to DataStore
      const mockEvent = new GamificationEvent({
        ts: ts ? ts : new Date().toISOString(),
        eventType,
        data,
        userID,
        racimoID: racimo,
        isUnclean: data ? JSON.parse(data).isUnclean : false,
      });
      // Add to global mock events
      GamificationEventDSService.mockEvents.push(mockEvent);
      return mockEvent;
      /*
      const newEvent = await DataStore.save(
        new GamificationEvent({
          ts: ts ? ts : new Date().toISOString(),
          eventType,
          data,
          userID,
          racimoID: racimo,
        }),
      );
      return newEvent;
      */
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
      const racimoID = (await this.session.getInfo()).racimoID ?? '';

      // Initialize mock events if empty

      // Filter to only return events where isUnclean is true
      const filteredEvents = GamificationEventDSService.mockEvents.filter(
        (event) => event.isUnclean === true,
      );

      // Sort by ts descending
      filteredEvents.sort(
        (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
      );

      return filteredEvents.slice(0, limit);
      /*
      const response = await DataStore.query(
        GamificationEvent,
        (c) => c.userID.eq(userID),
        {
          sort: (ge) => ge.ts(sortDirection),
          limit,
        },
      );
      return response;
      */
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
