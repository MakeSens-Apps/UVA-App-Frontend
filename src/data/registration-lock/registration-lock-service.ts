/**
 * RegistrationLockService (F4-05, #60 — ADR-005). Shared with #61.
 *
 * Evaluates, with the data already on the phone, whether the person can register
 * measurements:
 *   - the UVA as last synced by DataStore (offline it keeps using that state, decision 12);
 *   - the minimum-version policy (cached value; refreshed from S3 with refreshVersionPolicy).
 *
 * Side effects it owns:
 *   - Remembers the last status per UVA and raises the one-time reactivation notice.
 *   - Pauses the daily reminders while registering is blocked and reschedules them when it
 *     is allowed again, without touching the person's reminder preference.
 *
 * Measurements already queued in DataStore are never touched: they are sent when there is
 * connection, even if the UVA is disabled (ADR-005 decision 6).
 */

import { DataStore } from '@aws-amplify/datastore';
import { UVA } from '@/data/models';
import { sessionService } from '@/data/session/session';
import { localRemindersService } from '@/native/notifications/LocalRemindersService';
import { getInstalledAppVersion } from '@/native/device/appVersion';
import {
  detectReactivation,
  getEffectiveUvaStatus,
  isUpdateRequired,
  resolveRegistrationLock,
  shouldPauseReminders,
} from '@/domain/registration-lock/registration-lock';
import type {
  RegistrationLockReason,
  UvaStatus,
} from '@/domain/registration-lock/registration-lock';
import {
  getCachedMinimumVersion,
  refreshMinimumVersion,
} from './version-policy';
import { uvaStatusStore } from './uva-status-store';

export interface RegistrationLockState {
  uvaId: string | null;
  uvaStatus: UvaStatus;
  /** Why registering is blocked, or null if it is allowed. */
  reason: RegistrationLockReason | null;
  /** The "Tu estación fue reactivada" notice has not been shown yet. */
  reactivationPending: boolean;
}

export const UNLOCKED_STATE: RegistrationLockState = {
  uvaId: null,
  uvaStatus: 'unknown',
  reason: null,
  reactivationPending: false,
};

export class RegistrationLockService {
  /** undefined = not read yet; null = never known (no requirement). */
  private minimumVersion: string | null | undefined = undefined;
  /** undefined = no decision taken yet in this app session. */
  private remindersPaused: boolean | undefined = undefined;
  /** Serializes evaluations so concurrent callers do not race on storage and reminders. */
  private queue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /**
   * Evaluates the lock now. Call it on entering Home, Measurement and the register screen,
   * before saving a measurement, and after every sync.
   */
  evaluate(now: Date = new Date()): Promise<RegistrationLockState> {
    return this.enqueue(() => this.doEvaluate(now));
  }

  /** Reads the minimum-version policy from S3 (falls back to the last known value). */
  async refreshVersionPolicy(): Promise<void> {
    const minimumVersion = await refreshMinimumVersion();
    await this.enqueue(async () => {
      this.minimumVersion = minimumVersion;
    });
  }

  /** Marks the reactivation notice of this UVA as shown, so it never appears again. */
  consumeReactivationNotice(uvaId: string): Promise<void> {
    return this.enqueue(() =>
      uvaStatusStore.update(uvaId, { reactivationPending: false }),
    );
  }

  /** Forgets every per-UVA memory (sign-out) and lifts the reminder pause. */
  clearForSignOut(): Promise<void> {
    return this.enqueue(async () => {
      await uvaStatusStore.clear();
      this.remindersPaused = undefined;
      localRemindersService.setRemindersPaused(false);
    });
  }

  private async doEvaluate(now: Date): Promise<RegistrationLockState> {
    const uvaId = (await sessionService.getInfo()).uvaID || null;

    let uva: UVA | undefined;
    if (uvaId) {
      try {
        uva = await DataStore.query(UVA, uvaId);
      } catch (error) {
        console.error('Error reading the UVA for the registration lock', error);
      }
    }
    const uvaStatus = getEffectiveUvaStatus(uva, now);

    if (this.minimumVersion === undefined) {
      this.minimumVersion = await getCachedMinimumVersion();
    }
    const updateRequired = isUpdateRequired(
      getInstalledAppVersion(),
      this.minimumVersion,
    );
    const reason = resolveRegistrationLock({ uvaStatus, updateRequired });

    const reactivationPending = uvaId
      ? await this.trackReactivation(uvaId, uvaStatus)
      : false;

    await this.applyReminders(reason);

    return { uvaId, uvaStatus, reason, reactivationPending };
  }

  private async trackReactivation(
    uvaId: string,
    uvaStatus: UvaStatus,
  ): Promise<boolean> {
    try {
      const record = await uvaStatusStore.get(uvaId);
      const transition = detectReactivation(record.lastStatus, uvaStatus);
      if (!transition.remember) return record.reactivationPending ?? false;

      // A pending notice is dropped if the UVA is disabled again before it was shown.
      const pending = transition.reactivated
        ? true
        : uvaStatus === 'disabled'
          ? false
          : (record.reactivationPending ?? false);

      if (
        record.lastStatus !== transition.remember ||
        (record.reactivationPending ?? false) !== pending
      ) {
        await uvaStatusStore.update(uvaId, {
          lastStatus: transition.remember,
          reactivationPending: pending,
        });
      }
      return pending;
    } catch (error) {
      console.error('Error tracking the UVA reactivation', error);
      return false;
    }
  }

  /**
   * Pauses reminders while blocked; when the block is lifted in this app session,
   * reschedules them if the person has them enabled. The initial scheduling on app start
   * stays in HomeScreen (port of home.page.ts), which now honours the pause.
   */
  private async applyReminders(
    reason: RegistrationLockReason | null,
  ): Promise<void> {
    const pause = shouldPauseReminders(reason);
    const previous = this.remindersPaused;
    this.remindersPaused = pause;
    localRemindersService.setRemindersPaused(pause);
    if (previous === pause) return;
    try {
      if (pause) {
        await localRemindersService.cancelAllNotifications();
      } else if (
        previous === true &&
        (await localRemindersService.getEnableNotifications())
      ) {
        await localRemindersService.scheduleDailyNotifications();
      }
    } catch (error) {
      console.error('Error applying the reminder pause', error);
    }
  }
}

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const registrationLockService = new RegistrationLockService();
