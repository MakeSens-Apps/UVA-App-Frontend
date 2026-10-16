/**
 * App version reporter (MakeSens-Apps/UVA-App-Frontend#76, UVA-App#34).
 *
 * Writes the installed store version and the date on the person's UVA
 * (`appVersion` + `appVersionReportedAt`) when the app is connected:
 *   - after every sync with the backend (Hub 'syncQueriesReady', only emitted online: at
 *     start, and again each time the connection comes back), and
 *   - when the app returns to the foreground while DataStore reports a connection, and
 *   - when the UVA changes on the phone while connected (DataStore.observe, subscribed after
 *     each 'ready'): a UVA created during registration reaches the phone after the first sync.
 * The rules (new version, or at most once per local day) are in
 * src/domain/app-version-report. Without connection nothing is written: the report goes
 * out on the next sync. It is written even if the UVA is disabled or its RACIMO inactive
 * (decision in #76).
 *
 * The last report is kept on the phone under one AsyncStorage key, removed at sign-out,
 * so the next account reports on its first sync. The UVA write goes through the DataStore
 * outbox like any other change of the person.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Hub } from 'aws-amplify/utils';
import type { UVA } from '@/data/models';
import { sessionService } from '@/data/session/session';
import { UvaDSService } from '@/data/datastore/uva-ds';
import { UserDSService } from '@/data/datastore/user-ds';
import { getNetworkStatus } from '@/data/amplify-bootstrap/sync-monitor';
import { getInstalledAppVersion } from '@/native/device/appVersion';
import { onAppForeground } from '@/native/app-state/onAppForeground';
import {
  buildAppVersionReport,
  parseLastAppVersionReport,
  shouldReportAppVersion,
} from '@/domain/app-version-report/app-version-report';
import type {
  AppVersionReport,
  LastAppVersionReport,
} from '@/domain/app-version-report/app-version-report';

export const LAST_APP_VERSION_REPORT_KEY = 'lastAppVersionReport';

interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/** Signed-in person and their UVA (null when there is no session or no UVA yet). */
export interface ReportOwner {
  userId: string | null;
  uvaId: string | null;
}

export type AppVersionReportOutcome =
  | 'reported'
  | 'up-to-date'
  | 'no-version'
  | 'no-uva'
  | 'not-owner'
  | 'failed';

interface ReporterDeps {
  storage: KeyValueStorage;
  getInstalledVersion: () => string | null;
  getOwner: () => Promise<ReportOwner>;
  readUva: (uvaId: string) => Promise<UVA | undefined>;
  saveReport: (uva: UVA, report: AppVersionReport) => Promise<unknown>;
  /** Whether DataStore reports a connection (sync-monitor). */
  isOnline: () => boolean;
  /** Calls the listener each time the app comes back to the foreground. */
  onForeground: (listener: () => void) => void;
  /**
   * Calls the listener with the id of every changed UVA (local or synced). Returns the
   * unsubscribe function.
   */
  observeUvas: (listener: (uvaId: string) => void) => () => void;
  now?: () => Date;
}

export interface AppVersionReporter {
  /** Subscribes to Hub and to the app state. Idempotent. */
  start: () => void;
  /** Reports now if the rules ask for it. Serialized: concurrent calls run one by one. */
  report: () => Promise<AppVersionReportOutcome>;
}

export function createAppVersionReporter(
  deps: ReporterDeps,
): AppVersionReporter {
  const now = deps.now ?? (() => new Date());
  let started = false;
  /** Incremented at sign-out: a report requested before it must not write anything. */
  let generation = 0;
  /** A report already queued and not started yet: new triggers join it. */
  let pending: Promise<AppVersionReportOutcome> | null = null;
  /**
   * Last report written in this app session. Checked before AsyncStorage so that, if the
   * storage fails, the echo of our own UVA write never triggers another write.
   */
  let lastInMemory: LastAppVersionReport | null = null;
  /** UVA of the last report attempt: UVA changes of other people are ignored. */
  let knownUvaId: string | null = null;
  let stopObserving: (() => void) | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function readLast(): Promise<LastAppVersionReport | null> {
    try {
      return parseLastAppVersionReport(
        await deps.storage.getItem(LAST_APP_VERSION_REPORT_KEY),
      );
    } catch (error) {
      console.error('Error reading the last app version report', error);
      return null;
    }
  }

  async function doReport(
    requestedIn: number,
  ): Promise<AppVersionReportOutcome> {
    // Requested before a sign-out: never write the previous person's UVA.
    if (generation !== requestedIn) return 'no-uva';
    try {
      const appVersion = deps.getInstalledVersion();
      if (!appVersion) return 'no-version';

      const { userId, uvaId } = await deps.getOwner();
      if (!userId || !uvaId) return 'no-uva';
      knownUvaId = uvaId;

      const at = now();
      const last = lastInMemory ?? (await readLast());
      if (!shouldReportAppVersion(last, uvaId, appVersion, at)) {
        return 'up-to-date';
      }

      const uva = await deps.readUva(uvaId);
      if (!uva) return 'no-uva';
      // Only the owner writes these fields (UVA-App#34).
      if (uva.userID !== userId) return 'not-owner';

      // Signed out while reading: never write the previous person's UVA.
      if (generation !== requestedIn) return 'no-uva';
      const report = buildAppVersionReport(appVersion, at);
      await deps.saveReport(uva, report);
      if (generation !== requestedIn) return 'reported';

      const record: LastAppVersionReport = {
        uvaId,
        appVersion,
        reportedAt: report.appVersionReportedAt,
      };
      lastInMemory = record;
      try {
        await deps.storage.setItem(
          LAST_APP_VERSION_REPORT_KEY,
          JSON.stringify(record),
        );
      } catch (error) {
        // The UVA is already written: the in-memory record avoids writing it again.
        console.error('Error saving the last app version report', error);
      }
      return 'reported';
    } catch (error) {
      console.error('Error reporting the app version', error);
      return 'failed';
    }
  }

  function report(): Promise<AppVersionReportOutcome> {
    if (pending) return pending;
    const requestedIn = generation;
    const run = enqueue(() => {
      if (pending === run) pending = null;
      return doReport(requestedIn);
    });
    pending = run;
    return run;
  }

  function observeUvas(): void {
    stopObserving?.();
    try {
      stopObserving = deps.observeUvas((uvaId) => {
        // Unknown UVA yet (just registered): any UVA may be ours.
        if (knownUvaId !== null && uvaId !== knownUvaId) return;
        if (deps.isOnline()) void report();
      });
    } catch (error) {
      stopObserving = undefined;
      console.error('Error observing the UVA for the version report', error);
    }
  }

  function forget(): Promise<void> {
    return enqueue(async () => {
      try {
        await deps.storage.removeItem(LAST_APP_VERSION_REPORT_KEY);
      } catch (error) {
        console.error('Error removing the last app version report', error);
      }
    });
  }

  return {
    start() {
      if (started) return;
      started = true;
      Hub.listen('datastore', (hubData) => {
        const { event } = hubData.payload;
        if (event === 'syncQueriesReady') {
          // Sync queries only run with a connection.
          void report();
        } else if (event === 'ready') {
          // DataStore.clear() at sign-out closes every observer: subscribe again.
          observeUvas();
        }
      });
      Hub.listen('auth', (hubData) => {
        if (hubData.payload.event === 'signedOut') {
          generation += 1;
          pending = null;
          lastInMemory = null;
          knownUvaId = null;
          void forget();
        }
      });
      deps.onForeground(() => {
        if (deps.isOnline()) void report();
      });
    },
    report,
  };
}

async function getSessionOwner(): Promise<ReportOwner> {
  const info = await sessionService.getInfo();
  if (!info.userID) return { userId: null, uvaId: null };
  // The session can lose uvaID while staying signed in (session.ts): repair it from the
  // local User, as the registration lock does.
  const uvaId =
    info.uvaID ?? (await UserDSService.ensureSessionUvaID()) ?? null;
  return { userId: info.userID, uvaId };
}

/** App-wide reporter. Started from App.tsx, next to subscribeToSync(). */
export const appVersionReporter = createAppVersionReporter({
  storage: AsyncStorage,
  getInstalledVersion: getInstalledAppVersion,
  getOwner: getSessionOwner,
  readUva: (uvaId) => UvaDSService.getUVA(uvaId),
  saveReport: (uva, report) => UvaDSService.saveAppVersionReport(uva, report),
  isOnline: getNetworkStatus,
  onForeground: (listener) => {
    onAppForeground(listener);
  },
  observeUvas: (listener) => UvaDSService.observeUVAs(listener),
});
