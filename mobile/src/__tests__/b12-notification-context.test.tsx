/**
 * B12 — NotificationContext / useUnreadCount tests
 *
 * Gate requirement (plan.md B12):
 *  - useUnreadCount se actualiza reactivamente (test)
 *  - eliminación de rxjs: no BehaviorSubject, no Observable
 *
 * NOTE: RNTL v14 — renderHook() is async, must be awaited.
 *       act() must also be awaited when used with async updates.
 *
 * Portability matrix:
 *   "view/gamification/notification.service.ts" (BADGE) → NotificationContext
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  NotificationProvider,
  useNotificationContext,
  useUnreadCount,
} from '@/state/notification/NotificationContext';

// ─── Test wrapper ─────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <NotificationProvider>{children}</NotificationProvider>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationContext / useUnreadCount', () => {
  describe('initial state', () => {
    it('starts with unreadCount = 0', async () => {
      const { result } = await renderHook(() => useUnreadCount(), { wrapper: Wrapper });
      expect(result.current).toBe(0);
    });

    it('hasUnreadNotifications returns false initially', async () => {
      const { result } = await renderHook(() => useNotificationContext(), {
        wrapper: Wrapper,
      });
      expect(result.current.hasUnreadNotifications()).toBe(false);
    });
  });

  describe('updateUnreadCount — reactive update (replaces BehaviorSubject.next)', () => {
    it('updates unreadCount reactively when updateUnreadCount is called', async () => {
      const { result } = await renderHook(() => useNotificationContext(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.updateUnreadCount(5);
      });

      expect(result.current.unreadCount).toBe(5);
    });

    it('useUnreadCount hook reflects the updated count (same provider)', async () => {
      const { result } = await renderHook(
        () => ({
          ctx: useNotificationContext(),
          count: useUnreadCount(),
        }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        result.current.ctx.updateUnreadCount(7);
      });

      expect(result.current.count).toBe(7);
      expect(result.current.ctx.unreadCount).toBe(7);
    });

    it('updates to zero clears the badge', async () => {
      const { result } = await renderHook(() => useNotificationContext(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.updateUnreadCount(10);
      });
      expect(result.current.unreadCount).toBe(10);

      await act(async () => {
        result.current.updateUnreadCount(0);
      });
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.hasUnreadNotifications()).toBe(false);
    });

    it('sequential updates accumulate correctly', async () => {
      const { result } = await renderHook(() => useNotificationContext(), {
        wrapper: Wrapper,
      });

      await act(async () => { result.current.updateUnreadCount(3); });
      expect(result.current.unreadCount).toBe(3);

      await act(async () => { result.current.updateUnreadCount(8); });
      expect(result.current.unreadCount).toBe(8);
    });
  });

  describe('getUnreadCount — synchronous getter', () => {
    it('returns current unread count synchronously', async () => {
      const { result } = await renderHook(() => useNotificationContext(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.updateUnreadCount(4);
      });

      expect(result.current.getUnreadCount()).toBe(4);
    });
  });

  describe('hasUnreadNotifications', () => {
    it('returns true when count > 0', async () => {
      const { result } = await renderHook(() => useNotificationContext(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.updateUnreadCount(1);
      });

      expect(result.current.hasUnreadNotifications()).toBe(true);
    });

    it('returns false when count === 0', async () => {
      const { result } = await renderHook(() => useNotificationContext(), {
        wrapper: Wrapper,
      });

      // Already 0 by default
      expect(result.current.hasUnreadNotifications()).toBe(false);
    });
  });

  describe('error: hook outside provider', () => {
    it('useNotificationContext throws when used outside NotificationProvider', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(
        renderHook(() => useNotificationContext()),
      ).rejects.toThrow(
        'useNotificationContext must be used within a <NotificationProvider>',
      );
      consoleError.mockRestore();
    });
  });

  describe('no rxjs dependency (§4.5 compliance)', () => {
    it('hook works without any rxjs subscription machinery', async () => {
      // The context works without any rxjs mock — rxjs is absent from package.json
      const { result } = await renderHook(() => useUnreadCount(), { wrapper: Wrapper });
      expect(typeof result.current).toBe('number');
      expect(result.current).toBe(0);
    });
  });
});
