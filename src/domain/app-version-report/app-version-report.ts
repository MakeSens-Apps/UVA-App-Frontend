/**
 * App version report — pure rules (MakeSens-Apps/UVA-App-Frontend#76, UVA-App#34).
 *
 * The UVA keeps `appVersion` (store version, e.g. "2.3.1") and `appVersionReportedAt`
 * (UTC ISO 8601): the last day the app connected. The app writes both fields together:
 *   - when the installed version differs from the last one it reported, and
 *   - at most once per local day of the phone otherwise.
 * The last report is remembered on the phone; it is never deduced from the UVA record.
 * The report does not depend on the UVA or RACIMO being enabled (decision in #76).
 *
 * No React Native imports: tested in plain Jest.
 */

/** What the app reported last, as kept on the phone. */
export interface LastAppVersionReport {
  uvaId: string;
  appVersion: string;
  /** UTC ISO 8601 timestamp written to `appVersionReportedAt`. */
  reportedAt: string;
}

/** The two UVA fields, always written together. */
export interface AppVersionReport {
  appVersion: string;
  appVersionReportedAt: string;
}

/** Local calendar day of the phone (YYYY-MM-DD), not the UTC day. */
export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Whether the app must write its version to the UVA now.
 * @param last - Last report kept on the phone (null if there is none or it is unreadable).
 * @param uvaId - UVA of the signed-in person.
 * @param appVersion - Installed store version.
 * @param now - Current time.
 */
export function shouldReportAppVersion(
  last: LastAppVersionReport | null,
  uvaId: string,
  appVersion: string,
  now: Date,
): boolean {
  if (!last) return true;
  if (last.uvaId !== uvaId || last.appVersion !== appVersion) return true;
  const lastDate = new Date(last.reportedAt);
  if (Number.isNaN(lastDate.getTime())) return true;
  return localDayKey(lastDate) !== localDayKey(now);
}

/** The fields to write on the UVA for this report. */
export function buildAppVersionReport(
  appVersion: string,
  now: Date,
): AppVersionReport {
  return { appVersion, appVersionReportedAt: now.toISOString() };
}

/** Parses the stored last report; anything malformed counts as "no report". */
export function parseLastAppVersionReport(
  raw: string | null,
): LastAppVersionReport | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { uvaId, appVersion, reportedAt } = parsed as Record<string, unknown>;
    if (
      typeof uvaId !== 'string' ||
      typeof appVersion !== 'string' ||
      typeof reportedAt !== 'string'
    ) {
      return null;
    }
    return { uvaId, appVersion, reportedAt };
  } catch {
    return null;
  }
}
