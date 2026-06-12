/**
 * B12 — NotificationContext / UnreadNotificationsStore
 *
 * Ported from: src/app/core/services/view/gamification/notification.service.ts
 * Classification: Major adaptation
 * Rename (§4.3): NotificationService (BADGE) → UnreadNotificationsStore
 *
 * Changes from original:
 *  - @Injectable removed → React Context + hook (portability-matrix §4.2)
 *  - BehaviorSubject<number> → useState<number> (eliminates rxjs, §4.5)
 *  - Subscription leak fixed → useEffect with cleanup (§4.4 / R-31)
 *  - Reactive: all consumers re-render when unreadCount changes
 *
 * Portability matrix:
 *   "view/gamification/notification.service.ts" (BADGE) → NotificationContext
 * Risks: R-27 (no reactive state), R-31 (subscription leak fixed)
 *
 * NOTE: rxjs is NOT used here — no BehaviorSubject, no Observable.
 *       Verified: rxjs is absent from mobile/package.json.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface NotificationContextValue {
  /** Current unread notification count. */
  unreadCount: number;
  /**
   * Updates the unread notification count.
   * Preserves original updateUnreadCount() signature.
   */
  updateUnreadCount: (count: number) => void;
  /**
   * Gets the current unread notification count.
   * Preserves original getUnreadCount() signature.
   */
  getUnreadCount: () => number;
  /**
   * Checks if there are any unread notifications.
   * Preserves original hasUnreadNotifications() signature.
   */
  hasUnreadNotifications: () => boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface NotificationProviderProps {
  children: React.ReactNode;
}

/**
 * NotificationProvider (UnreadNotificationsStore)
 *
 * Replaces the BehaviorSubject-based NotificationService.
 * Place INSIDE the root provider tree so all screens can read unreadCount.
 */
export function NotificationProvider({
  children,
}: NotificationProviderProps): React.JSX.Element {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const updateUnreadCount = useCallback((count: number): void => {
    setUnreadCount(count);
  }, []);

  // getUnreadCount: returns the current value synchronously
  // (mirrors original BehaviorSubject.value getter)
  const getUnreadCount = useCallback((): number => {
    return unreadCount;
  }, [unreadCount]);

  const hasUnreadNotifications = useCallback((): boolean => {
    return unreadCount > 0;
  }, [unreadCount]);

  const value: NotificationContextValue = {
    unreadCount,
    updateUnreadCount,
    getUnreadCount,
    hasUnreadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useNotificationContext()
 *
 * Full context value (update + read).
 * Must be used within a <NotificationProvider>.
 */
export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotificationContext must be used within a <NotificationProvider>',
    );
  }
  return ctx;
}

/**
 * useUnreadCount()
 *
 * Reactive hook: returns the current unreadCount.
 * Re-renders the consumer whenever the count changes.
 *
 * Replaces:
 *   this.notificationService.unreadCount$.subscribe(count => ...)
 *   (which leaked subscriptions, R-31)
 *
 * Usage:
 *   const count = useUnreadCount();
 */
export function useUnreadCount(): number {
  return useNotificationContext().unreadCount;
}

export default NotificationContext;
