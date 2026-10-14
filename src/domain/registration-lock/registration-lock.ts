/**
 * Registration lock — pure rules (F4-05, MakeSens-Apps/UVA-App-Frontend#60).
 *
 * Applies ADR-005 (Racimo-Dashboard docs/adr/ADR-005-deshabilitar-uvas-y-racimos.md) on the
 * phone with the LAST SYNCED state:
 *   - Decision 1: a UVA is enabled if `enabled === true`. Until 2026-11-25 00:00 Colombia
 *     (2026-11-25T05:00:00Z) an unset `enabled` also counts as enabled; from then on it
 *     counts as disabled.
 *   - Decision 12: if the UVA is not on the phone yet (first sync pending, or data cleared
 *     at sign-out) the state is UNKNOWN: it does not lock and does not count as a change.
 *   - Decision 13: a global minimum version (public/app/version-policy.json). An empty
 *     minimum means no requirement.
 *   - Notice order when several apply: RACIMO inactive (#61), UVA disabled, update required.
 *
 * No React Native imports: this module is shared with #61 and tested in plain Jest.
 */

/** ADR-005 decision 1: cut-off for UVAs whose `enabled` was never set. */
export const UVA_UNSET_ENABLED_CUTOFF = new Date('2026-11-25T05:00:00Z');

export type UvaStatus = 'enabled' | 'disabled' | 'unknown';

/**
 * Why registering is blocked. Ordered by priority (ADR-005: RACIMO inactive, UVA disabled,
 * update required). #61 adds 'racimo-inactive' at the head of LOCK_REASON_PRIORITY.
 */
export type RegistrationLockReason = 'uva-disabled' | 'update-required';

export const LOCK_REASON_PRIORITY: readonly RegistrationLockReason[] = [
  'uva-disabled',
  'update-required',
];

export interface UvaEnabledSnapshot {
  enabled?: boolean | null;
}

/**
 * Effective status of the UVA (ADR-005 decision 1 + decision 12).
 * @param uva - The UVA as stored on the phone, or undefined/null if it has not synced yet.
 * @param now - Current instant (injected so the cut-off is testable).
 */
export function getEffectiveUvaStatus(
  uva: UvaEnabledSnapshot | null | undefined,
  now: Date,
): UvaStatus {
  if (!uva) return 'unknown';
  if (uva.enabled === true) return 'enabled';
  if (uva.enabled === false) return 'disabled';
  return now.getTime() < UVA_UNSET_ENABLED_CUTOFF.getTime()
    ? 'enabled'
    : 'disabled';
}

// ─── Minimum version ─────────────────────────────────────────────────────────

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/** Parses a strict `MAJOR.MINOR.PATCH` version. Returns null for anything else. */
export function parseVersion(
  version: string | null | undefined,
): [number, number, number] | null {
  if (typeof version !== 'string') return null;
  const match = VERSION_PATTERN.exec(version.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Compares two parsed versions: negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(
  a: [number, number, number],
  b: [number, number, number],
): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Validates the content of public/app/version-policy.json
 * (`{ "minimumVersion": "MAJOR.MINOR.PATCH" | "" }`, decision O4 in #60).
 * @returns The minimum version ('' = no requirement), or null if the file is malformed.
 */
export function parseVersionPolicy(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const minimumVersion = (raw as { minimumVersion?: unknown }).minimumVersion;
  if (typeof minimumVersion !== 'string') return null;
  const trimmed = minimumVersion.trim();
  if (trimmed === '') return '';
  return parseVersion(trimmed) ? trimmed : null;
}

/**
 * True when the installed version is lower than the minimum.
 * An empty or missing minimum, or an installed version that cannot be read, never blocks.
 */
export function isUpdateRequired(
  installedVersion: string | null | undefined,
  minimumVersion: string | null | undefined,
): boolean {
  const minimum = parseVersion(minimumVersion);
  const installed = parseVersion(installedVersion);
  if (!minimum || !installed) return false;
  return compareVersions(installed, minimum) < 0;
}

// ─── Combined lock ───────────────────────────────────────────────────────────

export interface RegistrationLockInput {
  uvaStatus: UvaStatus;
  updateRequired: boolean;
}

/**
 * The single reason shown to the person, or null if registering is allowed.
 * Unknown UVA status never locks (decision 12).
 */
export function resolveRegistrationLock(
  input: RegistrationLockInput,
): RegistrationLockReason | null {
  const active: Record<RegistrationLockReason, boolean> = {
    'uva-disabled': input.uvaStatus === 'disabled',
    'update-required': input.updateRequired,
  };
  return LOCK_REASON_PRIORITY.find((reason) => active[reason]) ?? null;
}

/** Reminders pause with any lock (decision O6 in #60). */
export function shouldPauseReminders(
  reason: RegistrationLockReason | null,
): boolean {
  return reason !== null;
}

/**
 * Streak recovery is hidden only while the station is disabled (P34, decision O6).
 * Decided on the UVA status, not on the prioritized reason, so it still holds when #61
 * puts 'racimo-inactive' ahead of 'uva-disabled'.
 */
export function canProposeStreakRecovery(uvaStatus: UvaStatus): boolean {
  return uvaStatus !== 'disabled';
}

/**
 * Hides the "Recupera tu racha" alerts created before the station was disabled, so the
 * alert list does not propose it either (P34). They come back if the station is re-enabled.
 */
export function withoutStreakRecoveryProposals<T extends { subtype?: string }>(
  alerts: T[],
  uvaStatus: UvaStatus,
): T[] {
  if (canProposeStreakRecovery(uvaStatus)) return alerts;
  return alerts.filter((alert) => alert.subtype !== 'streak_recovery');
}

// ─── Reactivation notice ─────────────────────────────────────────────────────

export type KnownUvaStatus = Exclude<UvaStatus, 'unknown'>;

export interface ReactivationTransition {
  /** Status to remember for this UVA (undefined = keep what is stored). */
  remember: KnownUvaStatus | undefined;
  /** True only on a synced disabled → enabled change. */
  reactivated: boolean;
}

/**
 * Decides whether a reactivation happened between two synced states of the same UVA.
 * - Unknown current status: nothing changes (decision 12).
 * - No previous status (first open on this phone/account): remember it, no notice.
 * - disabled → enabled: notice once.
 */
export function detectReactivation(
  previous: KnownUvaStatus | undefined,
  current: UvaStatus,
): ReactivationTransition {
  if (current === 'unknown') return { remember: undefined, reactivated: false };
  return {
    remember: current,
    reactivated: previous === 'disabled' && current === 'enabled',
  };
}
