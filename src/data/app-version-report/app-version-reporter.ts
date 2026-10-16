/**
 * App version reporter (MakeSens-Apps/UVA-App-Frontend#76, UVA-App#34).
 *
 * Writes the installed store version and the date on the person's UVA
 * (`appVersion` + `appVersionReportedAt`) when the app is connected:
 *   - after every sync with the backend (Hub 'syncQueriesReady', only emitted online: at
 *     start, and again each time the connection comes back), and
 *   - when the app returns to the foreground while DataStore reports a connection.
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
import { AppState } from 'react-native';
import { Hub } from 'aws-amplify/utils';
import type { UVA } from '@/data/models';
import { sessionService } from '@/data/session/session';
import { UvaDSService } from '@/data/datastore/uva-ds';
import { UserDSService } from '@/data/datastore/user-ds';
import { getInstalledAppVersion } from '@/native/device/appVersion';
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
  /** Calls the listener each time the app comes back to the foreground. */
  onForeground: (listener: () => void) => void;
  now?: () => Date;
}

export interface AppVersionReporter {
  /** Subscribes to Hub and to the app state. Idempotent. */
  start: () => void;
  /** Reports now if the rules ask for it. Serialized: concurrent calls run one by one. */
  report: () => Promise<AppVersionReportOutcome>;
}

function isNetworkStatusData(data: unknown): data is { active: boolean } {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).active === 'boolean'
  );
}

export function createAppVersionReporter(
  deps: ReporterDeps,
): AppVersionReporter {
  const now = deps.now ?? (() => new Date());
  let started = false;
  let online = false;
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

  async function doReport(): Promise<AppVersionReportOutcome> {
    try {
      const appVersion = deps.getInstalledVersion();
      if (!appVersion) return 'no-version';

      const { userId, uvaId } = await deps.getOwner();
      if (!userId || !uvaId) return 'no-uva';

      const at = now();
      const last = await readLast();
      if (!shouldReportAppVersion(last, uvaId, appVersion, at)) {
        return 'up-to-date';
      }

      const uva = await deps.readUva(uvaId);
      if (!uva) return 'no-uva';
      // Only the owner writes these fields (UVA-App#34).
      if (uva.userID !== userId) return 'not-owner';

      const report = buildAppVersionReport(appVersion, at);
      await deps.saveReport(uva, report);

      // A sign-out during this report enqueues forget() behind it, so the record below
      // never outlives the session.
      const record: LastAppVersionReport = {
        uvaId,
        appVersion,
        reportedAt: report.appVersionReportedAt,
      };
      await deps.storage.setItem(
        LAST_APP_VERSION_REPORT_KEY,
        JSON.stringify(record),
      );
      return 'reported';
    } catch (error) {
      console.error('Error reporting the app version', error);
      return 'failed';
    }
  }

  function report(): Promise<AppVersionReportOutcome> {
    return enqueue(doReport);
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
        const { event, data } = hubData.payload;
        if (event === 'networkStatus' && isNetworkStatusData(data)) {
          online = data.active;
        } else if (event === 'syncQueriesReady') {
          // Sync queries only run with a connection.
          online = true;
          void report();
        }
      });
      Hub.listen('auth', (hubData) => {
        if (hubData.payload.event === 'signedOut') {
          online = false;
          void forget();
        }
      });
      deps.onForeground(() => {
        if (online) void report();
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
  onForeground: (listener) => {
    AppState.addEventListener('change', (next) => {
      if (next === 'active') listener();
    });
  },
});
