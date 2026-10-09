/**
 * B06 — AppUsageService module
 *
 * Ported from: src/app/core/services/view/app-usage.service.ts
 * Classification: Minor adaptation
 *
 * Changes from original:
 *  - @Injectable removed → module with singleton init (portability-matrix §4.1)
 *  - Constructor replaced with initAppUsage() call at startup
 *  - syncExpression outbox-only: id.eq('') — preserved IDENTICALLY from original
 *    (outbox-only because AppUsageEvent is telemetry; no need to sync FROM cloud)
 *  - cleanupSyncedRecord() is exported and called by SyncContext (B06) on
 *    outboxMutationProcessed events (decoupled from DI chain)
 *  - authService / sessionService imported as singletons (not constructor injection)
 *
 * NOTE: syncExpression is declared here but APPLIED in App.tsx (DataStore.configure).
 * See mobile/App.tsx where syncExpressions are passed to DataStore.configure().
 *
 * Portability matrix: "view/app-usage.service.ts" → Minor → B06
 * Risks: R-21 (type guard fixed in SyncContext), R-04, R-09
 */

import { DataStore, syncExpression } from '@aws-amplify/datastore';
import { AppUsageEvent } from '@/data/models';
import { authService } from '@/data/auth/auth';
import { sessionService } from '@/data/session/session';

// ─── Session ID (generated once per app session) ─────────────────────────────

let currentSessionId: string | null = null;

/**
 * Initializes the session ID. Called at app startup.
 * Mirrors the original constructor logic (initializeSessionId).
 */
function initializeSessionId(): void {
  currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─── syncExpression — outbox-only (id.eq('')) ─────────────────────────────────

/**
 * syncExpression for AppUsageEvent: outbox-only.
 * id.eq('') means no records are synced FROM the cloud — only outbox mutations
 * (device→cloud telemetry) are processed.
 *
 * PRESERVED IDENTICALLY from original app-usage.service.ts.
 * Applied in DataStore.configure({ syncExpressions: [..., appUsageSyncExpression] })
 */
export const appUsageSyncExpression = syncExpression(AppUsageEvent, () => {
  // outbox-only: never pull from cloud
  return (appUsage) => appUsage.id.eq('');
});

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Initialize the AppUsage module.
 * Call once at startup (replaces constructor initialization).
 */
export function initAppUsage(): void {
  initializeSessionId();
}

/**
 * Cleans up a single synchronized AppUsage record from local DataStore.
 * Called by SyncContext when outboxMutationProcessed fires for an AppUsageEvent.
 * Mirrors original cleanupSyncedRecord() logic.
 *
 * @param {string} recordId - ID of the record to delete
 */
export async function cleanupSyncedRecord(recordId: string): Promise<void> {
  try {
    const record = await DataStore.query(AppUsageEvent, recordId);
    if (record) {
      await DataStore.delete(record);
    }
  } catch (error) {
    console.warn(`Failed to delete synced AppUsage record ${recordId}:`, error);
  }
}

/**
 * Tracks a navigation event.
 * Mirrors original trackNavigation() method.
 *
 * @param {string} screenName - Screen being navigated to
 */
export async function trackNavigation(screenName: string): Promise<void> {
  try {
    const session = await sessionService.getInfo();
    const currentUser = await authService.CurrentAuthenticatedUser();

    if (!currentUser.success || !session.userID || !session.racimoID) {
      return;
    }

    const usageEvent = new AppUsageEvent({
      userID: session.userID,
      racimoID: session.racimoID,
      sessionID: currentSessionId || '',
      screenName,
      ts: new Date().toISOString(),
      action: 'navigate',
    });

    await DataStore.save(usageEvent);
  } catch (error) {
    console.error('Error tracking navigation:', error);
  }
}

/**
 * Tracks a custom action event.
 * Mirrors original trackAction() method.
 *
 * @param {string} screenName - Current screen name
 * @param {string} action - Action performed
 * @param {number} [duration] - Optional duration in milliseconds
 */
export async function trackAction(
  screenName: string,
  action: string,
  duration?: number,
): Promise<void> {
  try {
    const session = await sessionService.getInfo();
    const currentUser = await authService.CurrentAuthenticatedUser();

    if (!currentUser.success || !session.userID || !session.racimoID) {
      return;
    }

    const usageEvent = new AppUsageEvent({
      userID: session.userID,
      racimoID: session.racimoID,
      sessionID: currentSessionId || '',
      screenName,
      ts: new Date().toISOString(),
      action,
      duration,
    });

    await DataStore.save(usageEvent);
  } catch (error) {
    console.error('Error tracking action:', error);
  }
}

/**
 * Returns the current session ID.
 * Mirrors original getCurrentSessionId() method.
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Resets the session ID (useful on logout/login).
 * Mirrors original resetSession() method.
 */
export function resetSession(): void {
  initializeSessionId();
}

/**
 * Manually cleans up all local AppUsage records.
 * Mirrors original manualCleanupAll() method.
 */
export async function manualCleanupAll(): Promise<void> {
  try {
    const allRecords = await DataStore.query(AppUsageEvent);
    for (const record of allRecords) {
      await DataStore.delete(record);
    }
  } catch (error) {
    console.error('Error during manual AppUsage cleanup:', error);
  }
}

/**
 * Returns statistics about local AppUsage records.
 * Mirrors original getLocalUsageStats() method.
 */
export async function getLocalUsageStats(): Promise<{ totalRecords: number }> {
  try {
    const allRecords = await DataStore.query(AppUsageEvent);
    return { totalRecords: allRecords.length };
  } catch (error) {
    console.error('Error getting AppUsage stats:', error);
    return { totalRecords: 0 };
  }
}
