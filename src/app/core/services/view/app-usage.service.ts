import { Injectable } from '@angular/core';
import { DataStore } from '@aws-amplify/datastore';
import { AppUsageEvent } from 'src/models';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../session/session.service';

@Injectable({
  providedIn: 'root',
})
export class AppUsageService {
  private currentSessionId: string | null = null;

  /**
   *
   * @param authService
   * @param sessionService
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
   * Track navigation event
   * @param screenName The name of the screen/page being navigated to
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
   * @param screenName Current screen name
   * @param action Action performed
   * @param duration Optional duration in milliseconds
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
}
