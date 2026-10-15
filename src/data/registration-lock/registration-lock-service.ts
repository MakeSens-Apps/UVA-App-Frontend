/**
 * RegistrationLockService (F4-05 #60 and F4-06 #61 — ADR-005).
 *
 * Evaluates, with the data already on the phone, whether the person can register
 * measurements:
 *   - the RACIMO of the UVA as last synced by DataStore (#61), with its current name;
 *   - the UVA as last synced by DataStore (offline it keeps using that state, decision 12);
 *   - the minimum-version policy (cached value; refreshed from S3 with refreshVersionPolicy).
 *
 * Side effects it owns:
 *   - Remembers the last station status (UVA + RACIMO) per UVA and raises the one-time
 *     reactivation notice.
 *   - Pauses the daily reminders while registering is blocked and reschedules them when it
 *     is allowed again, without touching the person's reminder preference.
 *
 * Measurements already queued in DataStore are never touched: they are sent when there is
 * connection, even if the UVA is disabled (ADR-005 decision 6).
 */

import { sessionService } from '@/data/session/session';
import { UvaDSService } from '@/data/datastore/uva-ds';
import { UserDSService } from '@/data/datastore/user-ds';
import { RacimoDSService } from '@/data/datastore/racimo-ds';
import { localRemindersService } from '@/native/notifications/LocalRemindersService';
import { getInstalledAppVersion } from '@/native/device/appVersion';
import {
  detectReactivation,
  getEffectiveRacimoStatus,
  getEffectiveUvaStatus,
  getStationStatus,
  isUpdateRequired,
  resolveRegistrationLock,
  shouldPauseReminders,
} from '@/domain/registration-lock/registration-lock';
import type {
  KnownUvaStatus,
  RacimoStatus,
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
  /** RACIMO of the UVA (null if it could not be resolved). */
  racimoId: string | null;
  racimoStatus: RacimoStatus;
  /** Current name of the RACIMO as synced (it can change from the dashboard). */
  racimoName: string | null;
  /**
   * UVA + RACIMO combined (getStationStatus): what decides streak recovery and the
   * reactivation notice, because an inactive RACIMO makes its UVAs behave as disabled.
   */
  stationStatus: UvaStatus;
  /** Why registering is blocked, or null if it is allowed. */
  reason: RegistrationLockReason | null;
  /** The "Tu estación fue reactivada" notice has not been shown yet. */
  reactivationPending: boolean;
}

export const UNLOCKED_STATE: RegistrationLockState = {
  uvaId: null,
  uvaStatus: 'unknown',
  racimoId: null,
  racimoStatus: 'unknown',
  racimoName: null,
  stationStatus: 'unknown',
  reason: null,
  reactivationPending: false,
};

interface RacimoRead {
  status: RacimoStatus;
  name: string | null;
  failed: boolean;
}

export class RegistrationLockService {
  /** undefined = not read yet; null = never known (no requirement). */
  private minimumVersion: string | null | undefined = undefined;
  /** undefined = no decision taken yet in this app session. */
  private remindersPaused: boolean | undefined = undefined;
  /** Last status read from DataStore in this app session, per UVA. */
  private lastKnown = new Map<string, KnownUvaStatus>();
  /** Last RACIMO read from DataStore in this app session, per RACIMO. */
  private lastKnownRacimo = new Map<
    string,
    { status: Exclude<RacimoStatus, 'unknown'>; name: string | null }
  >();
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

  /**
   * Reads the minimum-version policy from S3 (falls back to the last known value).
   * Only with a signed-in person: registering needs a session, and before signing in the
   * read has no credentials.
   */
  async refreshVersionPolicy(): Promise<void> {
    if (!(await sessionService.getInfo()).userID) return;
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
      this.lastKnown.clear();
      this.lastKnownRacimo.clear();
      this.remindersPaused = undefined;
      localRemindersService.setRemindersPaused(false);
    });
  }

  private async resolveUvaId(): Promise<string | null> {
    const info = await sessionService.getInfo();
    if (info.uvaID) return info.uvaID;
    // The session can lose uvaID while staying signed in (session.ts:27): repair it from the
    // local User, as the auth gate does, instead of treating the UVA as unknown all session.
    if (!info.userID) return null;
    return (await UserDSService.ensureSessionUvaID()) ?? null;
  }

  private async doEvaluate(now: Date): Promise<RegistrationLockState> {
    const uvaId = await this.resolveUvaId();

    let uvaStatus: UvaStatus = 'unknown';
    let uvaRacimoId: string | null = null;
    let readFailed = false;
    if (uvaId) {
      try {
        const uva = await UvaDSService.getUVA(uvaId);
        uvaStatus = getEffectiveUvaStatus(uva, now);
        uvaRacimoId = uva?.racimoID ?? null;
      } catch (error) {
        // A read error is not "not synced yet" (decision 12): keep the last known status
        // so a transient failure neither lifts the lock nor reschedules reminders.
        console.error('Error reading the UVA for the registration lock', error);
        readFailed = true;
        uvaStatus = await this.lastKnownStatus(uvaId);
      }
    }
    if (uvaId && uvaStatus !== 'unknown' && !readFailed) {
      this.lastKnown.set(uvaId, uvaStatus);
    }

    if (this.minimumVersion === undefined) {
      this.minimumVersion = await getCachedMinimumVersion();
    }
    const updateRequired = isUpdateRequired(
      getInstalledAppVersion(),
      this.minimumVersion,
    );
    // The UVA's own racimoID is the source of truth; the session one covers a UVA that has
    // not reached the phone yet.
    const racimoId =
      uvaRacimoId ?? (await sessionService.getInfo()).racimoID ?? null;
    const racimo = racimoId
      ? await this.readRacimo(racimoId, uvaId)
      : { status: 'unknown' as const, name: null, failed: false };

    const reason = resolveRegistrationLock({
      racimoStatus: racimo.status,
      uvaStatus,
      updateRequired,
    });
    const stationStatus = getStationStatus(uvaStatus, racimo.status);

    const reactivationPending = uvaId
      ? await this.trackReactivation(
          uvaId,
          readFailed || racimo.failed ? 'unknown' : stationStatus,
        )
      : false;

    await this.applyReminders(reason);

    return {
      uvaId,
      uvaStatus,
      racimoId,
      racimoStatus: racimo.status,
      racimoName: racimo.name,
      stationStatus,
      reason,
      reactivationPending,
    };
  }

  /**
   * Reads the RACIMO from DataStore. A read error keeps the last status seen in this app
   * session, else the one remembered for this UVA (else unknown), so a transient failure
   * does not lift the lock — the same rule as for the UVA (B2 in #60).
   */
  private async readRacimo(
    racimoId: string,
    uvaId: string | null,
  ): Promise<RacimoRead> {
    try {
      const racimo = await RacimoDSService.getRACIMO(racimoId);
      const status = getEffectiveRacimoStatus(racimo);
      const name = racimo?.Name?.trim() || null;
      if (status !== 'unknown') {
        this.lastKnownRacimo.set(racimoId, { status, name });
        if (uvaId) await this.rememberRacimo(uvaId, racimoId, status, name);
      }
      return { status, name, failed: false };
    } catch (error) {
      console.error(
        'Error reading the RACIMO for the registration lock',
        error,
      );
      const known =
        this.lastKnownRacimo.get(racimoId) ??
        (uvaId ? await this.rememberedRacimo(uvaId, racimoId) : undefined);
      return {
        status: known?.status ?? 'unknown',
        name: known?.name ?? null,
        failed: true,
      };
    }
  }

  /** Saves the RACIMO status for this UVA, only when it changed. */
  private async rememberRacimo(
    uvaId: string,
    racimoId: string,
    status: Exclude<RacimoStatus, 'unknown'>,
    name: string | null,
  ): Promise<void> {
    try {
      const record = await uvaStatusStore.get(uvaId);
      if (
        record.racimoId !== racimoId ||
        record.racimoStatus !== status ||
        (record.racimoName ?? null) !== name
      ) {
        await uvaStatusStore.update(uvaId, {
          racimoId,
          racimoStatus: status,
          racimoName: name,
        });
      }
    } catch (error) {
      console.error('Error remembering the RACIMO status', error);
    }
  }

  /** RACIMO status remembered for this UVA, if it is the same RACIMO. */
  private async rememberedRacimo(
    uvaId: string,
    racimoId: string,
  ): Promise<
    | { status: Exclude<RacimoStatus, 'unknown'>; name: string | null }
    | undefined
  > {
    try {
      const record = await uvaStatusStore.get(uvaId);
      if (record.racimoId !== racimoId || !record.racimoStatus)
        return undefined;
      return { status: record.racimoStatus, name: record.racimoName ?? null };
    } catch {
      return undefined;
    }
  }

  /** Last status seen in this app session, else the one remembered for this UVA. */
  private async lastKnownStatus(uvaId: string): Promise<UvaStatus> {
    const inMemory = this.lastKnown.get(uvaId);
    if (inMemory) return inMemory;
    try {
      return (await uvaStatusStore.get(uvaId)).lastStatus ?? 'unknown';
    } catch {
      return 'unknown';
    }
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
