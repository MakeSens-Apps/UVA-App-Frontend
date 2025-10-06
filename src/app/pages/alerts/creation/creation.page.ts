import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {
  GamificationEventSubtype,
  GamificationEventType,
} from '../../../core/services/view/gamification/gamification-alerts-types.service';
import { GamificationAlertsService } from '../../../core/services/view/gamification/gamification-alerts.service';

interface AlertConfig {
  subtype: GamificationEventSubtype;
  type: GamificationEventType;
  data: any;
}

@Component({
  selector: 'app-creation',
  templateUrl: './creation.page.html',
  styleUrls: ['./creation.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class CreationPage {
  alerts: AlertConfig[] = [
    {
      subtype: 'first_task',
      type: 'seeds',
      data: { subtype: 'first_task', isUnread: true, messageIndex: 1 },
    },
    {
      subtype: 'all_tasks',
      type: 'seeds',
      data: { subtype: 'all_tasks', isUnread: true, messageIndex: 1 },
    },
    {
      subtype: 'streak_reward',
      type: 'streak',
      data: {
        subtype: 'streak_reward',
        days: 14,
        isUnread: true,
        messageIndex: 1,
      },
    },
    {
      subtype: 'germination_success',
      type: 'achievement',
      data: {
        subtype: 'germination_success',
        stage: 'planta',
        isUnread: true,
        messageIndex: 1,
      },
    },
    {
      subtype: 'germination_fail',
      type: 'achievement',
      data: { subtype: 'germination_fail', isUnread: true, messageIndex: 1 },
    },
    {
      subtype: 'streak_recovery',
      type: 'bonus',
      data: { subtype: 'streak_recovery', isUnread: true, messageIndex: 1 },
    },
    {
      subtype: 'streak_lost',
      type: 'streak',
      data: { subtype: 'streak_lost', isUnread: true, messageIndex: 1 },
    },
    {
      subtype: 'streak_progress',
      type: 'streak',
      data: {
        subtype: 'streak_progress',
        days: 7,
        isUnread: true,
        messageIndex: 1,
      },
    },
  ];

  /**
   *
   * @param alert
   */
  async createAlert(alert: AlertConfig): Promise<void> {
    try {
      switch (alert.subtype) {
        case 'first_task':
          await GamificationAlertsService.createFirstTaskAlert();
          break;
        case 'all_tasks':
          await GamificationAlertsService.createAllTasksAlert();
          break;
        case 'streak_reward':
          await GamificationAlertsService.createStreakRewardAlert(
            alert.data.days,
          );
          break;
        case 'germination_success':
          await GamificationAlertsService.createGerminationSuccessAlert(
            alert.data.stage,
          );
          break;
        case 'germination_fail':
          await GamificationAlertsService.createGerminationFailAlert();
          break;
        case 'streak_recovery':
          await GamificationAlertsService.createStreakRecoveryAlert();
          break;
        case 'streak_lost':
          await GamificationAlertsService.createStreakLostAlert();
          break;
        case 'streak_progress':
          await GamificationAlertsService.createStreakProgressAlert(
            alert.data.days,
          );
          break;
        default:
          throw new Error(`Unknown subtype: ${alert.subtype}`);
      }
      console.log(`Created ${alert.subtype} alert`);
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }
}
