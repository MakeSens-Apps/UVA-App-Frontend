/**
 * Per-UVA memory for the reactivation notice (F4-05, #60 — ADR-005).
 *
 * Stores, for each UVA, the last effective status the app saw and whether the
 * "Tu estación fue reactivada" notice is still pending. Everything lives under one
 * AsyncStorage key that is removed at sign-out, so another account on the same phone
 * never sees someone else's notice.
 */

import { Preferences } from '@/data/storage/preferences';
import type {
  KnownRacimoStatus,
  KnownUvaStatus,
} from '@/domain/registration-lock/registration-lock';

export const UVA_STATUS_STORE_KEY = 'registrationLockUvaStatus';

export interface UvaStatusRecord {
  /** Last station status (UVA + RACIMO since #61): decides the reactivation notice. */
  lastStatus?: KnownUvaStatus;
  reactivationPending?: boolean;
  /** Last status of the UVA itself, kept for read errors (F4-06, #61). */
  lastUvaStatus?: KnownUvaStatus;
  /** Last RACIMO read for this UVA, kept for read errors (F4-06, #61). */
  racimoId?: string;
  racimoStatus?: KnownRacimoStatus;
  racimoName?: string | null;
}

type UvaStatusMap = Record<string, UvaStatusRecord>;

async function readAll(): Promise<UvaStatusMap> {
  try {
    const { value } = await Preferences.get({ key: UVA_STATUS_STORE_KEY });
    if (!value) return {};
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as UvaStatusMap)
      : {};
  } catch (error) {
    console.error('Error reading the UVA status store', error);
    return {};
  }
}

async function writeAll(map: UvaStatusMap): Promise<void> {
  await Preferences.set({
    key: UVA_STATUS_STORE_KEY,
    value: JSON.stringify(map),
  });
}

export const uvaStatusStore = {
  async get(uvaId: string): Promise<UvaStatusRecord> {
    return (await readAll())[uvaId] ?? {};
  },

  async update(uvaId: string, patch: UvaStatusRecord): Promise<void> {
    const map = await readAll();
    map[uvaId] = { ...map[uvaId], ...patch };
    await writeAll(map);
  },

  /** Removes the memory of every UVA. Called at sign-out. */
  async clear(): Promise<void> {
    await Preferences.remove({ key: UVA_STATUS_STORE_KEY });
  },
};
