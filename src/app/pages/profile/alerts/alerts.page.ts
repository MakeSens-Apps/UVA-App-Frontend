import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GamificationEventDSService } from '@app/core/services/storage/datastore/gamification-event-ds.service';
import { IonicModule } from '@ionic/angular';
import { GamificationEvent } from 'src/models';

interface MockGamificationEvent {
  id: string;
  userID: string;
  racimoID: string;
  eventType: string;
  ts: string;
  data: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class AlertsPage {
  events: (GamificationEvent | MockGamificationEvent)[] = [];

  /**
   * @param {Router} router - Angular Router instance used for navigation.
   */
  constructor(private router: Router) {}

  /**
   * Lifecycle hook that is called when the view is about to enter.
   */
  async ionViewWillEnter(): Promise<void> {
    try {
      this.events = await GamificationEventDSService.getGamificationEvents();
      // Add mock data if no events exist
      if (this.events.length === 0) {
        this.events = this.getMockEvents();
      }
    } catch (error) {
      console.error('Error loading gamification events:', error);
      // Fallback to mock data on error
      this.events = this.getMockEvents();
    }
  }

  /**
   * Navigates back to the specified URL.
   * @param {string} url - The URL to navigate back to.
   */
  async goBack(url: string): Promise<void> {
    await this.router.navigate([url]);
  }

  /**
   * Formats the event data for display.
   * @param {GamificationEvent | MockGamificationEvent} event - The event to format.
   * @returns {string} Formatted data string.
   */
  formatEventData(event: GamificationEvent | MockGamificationEvent): string {
    try {
      const data = JSON.parse(event.data || '{}');
      switch (event.eventType) {
        case 'first_task_completed':
          return `First task completed! Earned ${data.seed} seed(s).`;
        case 'all_tasks_completed':
          return `All tasks completed! Earned ${data.seed} seed(s) and increased streak to ${data.streak}.`;
        case 'streak_recovered':
          return `Streak recovered! New streak: ${data.newStreak}. Cost: ${data.cost} seeds.`;
        case 'streak_bonus':
          return `Streak bonus! Earned ${data.bonusSeeds} extra seed(s) for streak of ${data.streak} days.`;
        default:
          return event.data || 'No details available.';
      }
    } catch {
      return event.data || 'No details available.';
    }
  }

  /**
   * Formats the timestamp for display.
   * @param {string} ts - The timestamp string.
   * @returns {string} Formatted date string.
   */
  formatTimestamp(ts: string): string {
    return new Date(ts).toLocaleString();
  }

  /**
   * Returns mock gamification events for testing purposes.
   * @returns {(GamificationEvent | MockGamificationEvent)[]} Array of mock events.
   */
  private getMockEvents(): (GamificationEvent | MockGamificationEvent)[] {
    const now = new Date();
    return [
      {
        id: 'mock-1',
        userID: 'user123',
        racimoID: 'racimo123',
        eventType: 'first_task_completed',
        ts: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        data: JSON.stringify({ seed: 1 }),
        createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'mock-2',
        userID: 'user123',
        racimoID: 'racimo123',
        eventType: 'all_tasks_completed',
        ts: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        data: JSON.stringify({ seed: 2, streak: 3 }),
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mock-3',
        userID: 'user123',
        racimoID: 'racimo123',
        eventType: 'streak_recovered',
        ts: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        data: JSON.stringify({ newStreak: 5, cost: 5 }),
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mock-4',
        userID: 'user123',
        racimoID: 'racimo123',
        eventType: 'streak_bonus',
        ts: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        data: JSON.stringify({ bonusSeeds: 3, streak: 7 }),
        createdAt: new Date(
          now.getTime() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updatedAt: new Date(
          now.getTime() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    ];
  }
}
