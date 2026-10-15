/**
 * Minimum-version policy (F4-05, #60 — ADR-005 decision 13, decision O4 in #60).
 *
 * Global MakeSens file in the configuration bucket of each environment, under `public/` and
 * outside `public/racimos/`:
 *
 *   public/app/version-policy.json   →   { "minimumVersion": "MAJOR.MINOR.PATCH" | "" }
 *
 * - A valid file with an empty minimum means no requirement.
 * - If the file cannot be read (offline, network or permission error, missing file) or is
 *   malformed, the last known value is used; if there never was one, there is no requirement.
 * - App users only have READ access to the bucket (backend UVA-App, storage `authAccess` and
 *   `guestAccess` = READ), so they cannot write or delete the file.
 */

import { s3Service } from '@/data/storage/s3';
import { Preferences } from '@/data/storage/preferences';
import { parseVersionPolicy } from '@/domain/registration-lock/registration-lock';

export const VERSION_POLICY_PATH = 'public/app/version-policy.json';

/** Last valid minimum version read from S3 ('' = no requirement). Global, not per account. */
export const VERSION_POLICY_CACHE_KEY = 'appVersionPolicyMinimumVersion';

/** Last known minimum version, or null if it was never read. */
export async function getCachedMinimumVersion(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: VERSION_POLICY_CACHE_KEY });
    if (value === null) return null;
    return parseVersionPolicy({ minimumVersion: value });
  } catch (error) {
    console.error('Error reading the cached version policy', error);
    return null;
  }
}

/**
 * Reads the policy from S3 and caches it when valid.
 * @returns The minimum version to apply: the fresh one, or the last known one on failure.
 */
export async function refreshMinimumVersion(): Promise<string | null> {
  const response = await s3Service.getFile(VERSION_POLICY_PATH);
  if (response.success && response.data.type === 'JSON') {
    const minimumVersion = parseVersionPolicy(response.data.content);
    if (minimumVersion !== null) {
      try {
        await Preferences.set({
          key: VERSION_POLICY_CACHE_KEY,
          value: minimumVersion,
        });
      } catch (error) {
        console.error('Error caching the version policy', error);
      }
      return minimumVersion;
    }
    console.warn(
      'version-policy.json is malformed; using the last known value',
    );
  }
  return getCachedMinimumVersion();
}
