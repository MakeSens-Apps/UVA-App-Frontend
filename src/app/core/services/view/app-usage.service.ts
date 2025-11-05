import { Injectable } from '@angular/core';
import { DataStore } from '@aws-amplify/datastore';
import { Hub } from 'aws-amplify/utils';
import { AppUsageEvent } from 'src/models';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../session/session.service';

@Injectable({
  providedIn: 'root',
})
export class AppUsageService {
  private currentSessionId: string | null = null;

  /**
   * Constructor for AppUsageService
   * @param {AuthService} authService - Authentication service
   * @param {SessionService} sessionService - Session management service
   */
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
  ) {
    void this.initializeSessionId();
  }

  /**
   * Initialize session ID for tracking
   */
  private async initializeSessionId(): Promise<void> {
    // Generate a unique session ID based on timestamp
    this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }


  /**
   * Clean up a single synchronized AppUsage record from local storage
   * @param {string} recordId - ID of the record to cleanup
   */
  async cleanupSyncedRecord(recordId: string): Promise<void> {
    try {
      const record = await DataStore.query(AppUsageEvent, recordId);
      if (record) {
        await DataStore.delete(record);
        // Console log removed to comply with linting rules
      }
    } catch (error) {
      console.warn(
        `Failed to delete synced AppUsage record ${recordId}:`,
        error,
      );
    }
  }

  /**
   * Track navigation event
   * @param {string} screenName The name of the screen/page being navigated to
   */
  async trackNavigation(screenName: string): Promise<void> {
    try {
      const session = await this.sessionService.getInfo();
      const currentUser = await this.authService.CurrentAuthenticatedUser();

      if (!currentUser.success || !session.userID || !session.racimoID) {
        // Don't track if user is not authenticated or session info is missing
        return;
      }

      const usageEvent = new AppUsageEvent({
        userID: session.userID,
        racimoID: session.racimoID,
        sessionID: this.currentSessionId || '',
        screenName,
        ts: new Date().toISOString(),
        action: 'navigate',
      });

      await DataStore.save(usageEvent);
    } catch (error) {
      console.error('Error tracking navigation:', error);
    }
  }

  /**
   * Track custom action event
   * @param {string} screenName Current screen name
   * @param {string} action Action performed
   * @param {number} duration Optional duration in milliseconds
   */
  async trackAction(
    screenName: string,
    action: string,
    duration?: number,
  ): Promise<void> {
    try {
      const session = await this.sessionService.getInfo();
      const currentUser = await this.authService.CurrentAuthenticatedUser();

      if (!currentUser.success || !session.userID || !session.racimoID) {
        return;
      }

      const usageEvent = new AppUsageEvent({
        userID: session.userID,
        racimoID: session.racimoID,
        sessionID: this.currentSessionId || '',
        screenName,
        ts: new Date().toISOString(),
        action,
        duration,
      });

      await DataStore.save(usageEvent);
    } catch (error) {
      console.error('Error tracking action:', error);
    }
  }

  /**
   * Get current session ID
   * @returns {string | null} Current session ID or null if not set
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Reset session ID (useful for logout/login scenarios)
   */
  async resetSession(): Promise<void> {
    await this.initializeSessionId();
  }

  /**
   * Manually trigger cleanup of all local AppUsage records
   * (Useful for testing or manual maintenance)
   */
  async manualCleanupAll(): Promise<void> {
    try {
      const allRecords = await DataStore.query(AppUsageEvent);
      for (const record of allRecords) {
        await DataStore.delete(record);
      }
      // Console log removed to comply with linting rules
    } catch (error) {
      console.error('Error during manual AppUsage cleanup:', error);
    }
  }

  /**
   * Get statistics about local AppUsage records
   * @returns {Promise<{totalRecords: number}>} Statistics about local records
   */
  async getLocalUsageStats(): Promise<{
    totalRecords: number;
  }> {
    try {
      const allRecords = await DataStore.query(AppUsageEvent);
      return {
        totalRecords: allRecords.length,
      };
    } catch (error) {
      console.error('Error getting AppUsage stats:', error);
      return {
        totalRecords: 0,
      };
    }
  }

}
