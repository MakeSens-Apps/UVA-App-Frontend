import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  GamificationEventType,
  GamificationService,
} from '../../../core/services/view/gamification/gamification.service';
import { NotificationService } from '../../../core/services/view/gamification/notification.service';

interface GamificationAlerts {
  id: string;
  data: {
    title: string;
    description: string;
    isUnread: boolean;
  };
  isUnclean: boolean;
  timestamp: string;
  type?: GamificationEventType;
}

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class AlertsPage {
  notifications: GamificationAlerts[] = [];

  /**
   * @param {Router} router - Angular Router instance used for navigation.
   * @param {NotificationService} notificationService - Service for managing notification state.
   * @param {GamificationService} gamificationService - Service for gamification operations.
   */
  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private gamificationService: GamificationService,
  ) {}

  /**
   * Lifecycle hook that is called when the view is about to enter.
   */
  async ionViewWillEnter(): Promise<void> {
    // Load notifications from service
    this.notifications = await GamificationService.getNotifications();
    console.log('Notifications loaded:', this.notifications);
    this.updateUnreadCount();
  }

  /**
   * Marks a notification as read.
   * @param {GamificationAlerts} notification - The notification to mark as read.
   */
  markAsRead(notification: GamificationAlerts): void {
    notification.data.isUnread = false;
    this.updateUnreadCount();
  }

  /**
   * Navigates to the configuration page.
   */
  async openSettings(): Promise<void> {
    await this.router.navigate(['/configuration']);
  }

  /**
   * Navigates back to the specified URL.
   * @param {string} url - The URL to navigate back to.
   */
  async goBack(url: string): Promise<void> {
    await this.router.navigate([url]);
  }

  /**
   * Deletes all notifications.
   */
  deleteAllNotifications(): void {
    this.notifications = [];
    this.updateUnreadCount();
  }

  /**
   * Updates the unread notification count in the notification service.
   */
  private updateUnreadCount(): void {
    const unreadCount = this.notifications.filter(
      (n) => n.data.isUnread,
    ).length;
    this.notificationService.updateUnreadCount(unreadCount);
  }

  /**
   * Returns the icon type for the notification type.
   * @param {GamificationEventType} type - The notification type.
   * @returns {string} Icon type.
   */
  getIconType(type?: GamificationEventType): string {
    if (!type) {
      return 'default';
    }
    switch (type) {
      case 'first_task_completed':
      case 'all_tasks_completed':
        return 'achievement';
      case 'streak_bonus':
        return 'bonus';
      case 'surprise_reward':
        return 'surprise';
      case 'streak_recovered':
        return 'streak';
      default:
        return type; // 'seeds', 'streak', 'achievement', 'surprise', 'bonus'
    }
  }

  /**
   * Returns the appropriate icon for the notification type.
   * @param {GamificationAlerts} notification - The notification.
   * @returns {string} Icon name.
   */
  getNotificationIcon(notification: GamificationAlerts): string {
    const iconType = this.getIconType(notification.type);
    switch (iconType) {
      case 'seeds':
        return 'sparkles';
      case 'streak':
        return 'flame';
      case 'achievement':
        return 'trophy';
      case 'surprise':
        return 'gift';
      case 'bonus':
        return 'flash';
      default:
        return 'notifications-outline';
    }
  }

  /**
   * Returns the background color class for the notification icon.
   * @param {GamificationAlerts} notification - The notification.
   * @returns {string} CSS class for background color.
   */
  getNotificationIconBg(notification: GamificationAlerts): string {
    const iconType = this.getIconType(notification.type);
    switch (iconType) {
      case 'seeds':
        return 'icon-bg-accent';
      case 'streak':
        return 'icon-bg-orange';
      case 'achievement':
        return 'icon-bg-primary';
      case 'surprise':
        return 'icon-bg-pink';
      case 'bonus':
        return 'icon-bg-yellow';
      default:
        return 'icon-bg-muted';
    }
  }
}
