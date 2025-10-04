import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface GamificationAlerts {
  id: string;
  data: {
    title: string;
    description: string;
    isUnread: boolean;
  };
  isUnclean: boolean;
  timestamp: string;
  type?: 'seeds' | 'streak' | 'achievement' | 'surprise' | 'bonus';
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
   */
  constructor(private router: Router) {}

  /**
   * Lifecycle hook that is called when the view is about to enter.
   */
  async ionViewWillEnter(): Promise<void> {
    // Load mock notifications for now
    this.notifications = this.getMockNotifications();
  }

  /**
   * Marks a notification as read.
   * @param {GamificationAlerts} notification - The notification to mark as read.
   */
  markAsRead(notification: GamificationAlerts): void {
    notification.data.isUnread = false;
  }

  /**
   * Opens settings menu (placeholder for now).
   */
  openSettings(): void {
    // TODO: Implement settings menu
    console.log('Settings clicked');
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
  }

  /**
   * Returns the appropriate icon for the notification type.
   * @param {GamificationAlerts} notification - The notification.
   * @returns {string} Icon name.
   */
  getNotificationIcon(notification: GamificationAlerts): string {
    switch (notification.type) {
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
    switch (notification.type) {
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

  /**
   * Returns mock notifications for testing purposes.
   * @returns {GamificationAlerts[]} Array of mock notifications.
   */
  private getMockNotifications(): GamificationAlerts[] {
    return [
      {
        id: '1',
        data: {
          title: '¡Recompensa sorpresa!',
          description:
            'Has ganado 50 semillas extras por tu dedicación esta semana. ¡Sigue así!',
          isUnread: true,
        },
        isUnclean: false,
        timestamp: 'Hoy • 14:30',
        type: 'surprise',
      },
      {
        id: '2',
        data: {
          title: 'Racha de 7 días completada',
          description:
            'Has completado todas tus tareas durante 7 días consecutivos. ¡Increíble constancia!',
          isUnread: true,
        },
        isUnclean: false,
        timestamp: 'Hoy • 09:15',
        type: 'streak',
      },
      {
        id: '3',
        data: {
          title: 'Primera tarea completada',
          description:
            'Completaste tu primera tarea del día. Has ganado 10 semillas.',
          isUnread: false,
        },
        isUnclean: true,
        timestamp: 'Ayer • 18:45',
        type: 'achievement',
      },
      {
        id: '4',
        data: {
          title: 'Bono de racha semanal',
          description:
            'Por mantener tu racha de 7 días, has recibido 100 semillas de bonificación.',
          isUnread: false,
        },
        isUnclean: true,
        timestamp: 'Ayer • 16:20',
        type: 'bonus',
      },
      {
        id: '5',
        data: {
          title: 'Semillas ganadas',
          description:
            'Has completado 3 tareas hoy y ganado 30 semillas en total.',
          isUnread: false,
        },
        isUnclean: false,
        timestamp: 'Ayer • 12:00',
        type: 'seeds',
      },
      {
        id: '6',
        data: {
          title: 'Todas las tareas completadas',
          description:
            'Completaste todas las tareas del día. ¡Excelente trabajo! +25 semillas.',
          isUnread: false,
        },
        isUnclean: true,
        timestamp: 'Hace 2 días • 20:30',
        type: 'achievement',
      },
      {
        id: '7',
        data: {
          title: 'Racha recuperada',
          description:
            'Has usado 20 semillas para recuperar tu racha. ¡No pierdas el ritmo!',
          isUnread: false,
        },
        isUnclean: false,
        timestamp: 'Hace 3 días • 15:10',
        type: 'streak',
      },
    ];
  }
}
