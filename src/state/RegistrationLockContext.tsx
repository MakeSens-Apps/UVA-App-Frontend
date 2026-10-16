/**
 * RegistrationLockContext (F4-05 #60 and F4-06 #61 — ADR-005).
 *
 * Reactive wrapper of registrationLockService. Re-evaluates the lock:
 *   - on mount and whenever the app comes back to the foreground;
 *   - after every DataStore sync ('ready', or 'modelSynced' of UVA or RACIMO) and on local
 *     changes of the UVA or its RACIMO (DataStore.observe), so a deactivation or a
 *     reactivation applies on the next sync;
 *   - after reading the minimum-version policy, on mount and when the network comes back.
 * At sign-out it forgets the per-UVA memory, so another account never sees a foreign notice.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { DataStore } from '@aws-amplify/datastore';
import { Hub } from 'aws-amplify/utils';
import { useFocusEffect } from '@react-navigation/native';
import { RACIMO, UVA } from '@/data/models';
import {
  registrationLockService,
  UNLOCKED_STATE,
} from '@/data/registration-lock/registration-lock-service';
import type { RegistrationLockState } from '@/data/registration-lock/registration-lock-service';
import type { RegistrationLockReason } from '@/domain/registration-lock/registration-lock';

export interface RegistrationLockContextValue {
  /** Last evaluated state (unlocked until the first evaluation finishes). */
  state: RegistrationLockState;
  /** Re-evaluates now and returns the fresh state. */
  refresh: () => Promise<RegistrationLockState>;
  /** Marks the reactivation notice as shown. */
  consumeReactivationNotice: () => Promise<void>;
}

const RegistrationLockContext = createContext<
  RegistrationLockContextValue | undefined
>(undefined);

export function RegistrationLockProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [state, setState] = useState<RegistrationLockState>(UNLOCKED_STATE);
  const stateRef = useRef(state);

  const applyState = useCallback((next: RegistrationLockState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await registrationLockService.evaluate();
      applyState(next);
      return next;
    } catch (error) {
      console.error('Error evaluating the registration lock', error);
      return stateRef.current;
    }
  }, [applyState]);

  const refreshVersionPolicy = useCallback(async () => {
    try {
      await registrationLockService.refreshVersionPolicy();
    } catch (error) {
      console.error('Error reading the version policy', error);
    }
    await refresh();
  }, [refresh]);

  const consumeReactivationNotice = useCallback(async () => {
    const current = stateRef.current;
    if (!current.uvaId) return;
    applyState({ ...current, reactivationPending: false });
    try {
      await registrationLockService.consumeReactivationNotice(current.uvaId);
    } catch (error) {
      console.error('Error saving the reactivation notice', error);
    }
  }, [applyState]);

  useEffect(() => {
    void (async () => {
      await refreshVersionPolicy();
    })();

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshVersionPolicy();
    });

    const unsubscribeDatastore = Hub.listen('datastore', (hubData) => {
      const { event, data } = hubData.payload as {
        event: string;
        data?: { model?: { name?: string }; active?: boolean };
      };
      if (event === 'ready') {
        // DataStore.clear() at sign-out closes every observer: subscribe again after each
        // full sync, and read the policy now that there may be a session.
        observeStation();
        void refreshVersionPolicy();
      } else if (
        event === 'modelSynced' &&
        (data?.model?.name === 'UVA' || data?.model?.name === 'RACIMO')
      ) {
        void refresh();
      } else if (event === 'networkStatus' && data?.active) {
        void refreshVersionPolicy();
      }
    });

    const unsubscribeAuth = Hub.listen('auth', (hubData) => {
      if (hubData.payload.event === 'signedOut') {
        applyState(UNLOCKED_STATE);
        void registrationLockService.clearForSignOut();
      }
    });

    let uvaSubscription: { unsubscribe: () => void } | undefined;
    let racimoSubscription: { unsubscribe: () => void } | undefined;
    function observeStation(): void {
      uvaSubscription?.unsubscribe();
      racimoSubscription?.unsubscribe();
      try {
        uvaSubscription = DataStore.observe(UVA).subscribe({
          next: ({ element }) => {
            const current = stateRef.current.uvaId;
            if (!current || element?.id === current) void refresh();
          },
          error: (error: unknown) => {
            console.error('Error observing the UVA', error);
          },
        });
      } catch (error) {
        uvaSubscription = undefined;
        console.error('Error observing the UVA', error);
      }
      // F4-06 (#61): the dashboard deactivates or reactivates the RACIMO, or renames it.
      try {
        racimoSubscription = DataStore.observe(RACIMO).subscribe({
          next: ({ element }) => {
            const current = stateRef.current.racimoId;
            if (!current || element?.id === current) void refresh();
          },
          error: (error: unknown) => {
            console.error('Error observing the RACIMO', error);
          },
        });
      } catch (error) {
        racimoSubscription = undefined;
        console.error('Error observing the RACIMO', error);
      }
    }
    observeStation();

    return () => {
      appStateSub.remove();
      unsubscribeDatastore();
      unsubscribeAuth();
      uvaSubscription?.unsubscribe();
      racimoSubscription?.unsubscribe();
    };
  }, [applyState, refresh, refreshVersionPolicy]);

  const value = useMemo(
    () => ({ state, refresh, consumeReactivationNotice }),
    [state, refresh, consumeReactivationNotice],
  );

  return (
    <RegistrationLockContext.Provider value={value}>
      {children}
    </RegistrationLockContext.Provider>
  );
}

export function useRegistrationLock(): RegistrationLockContextValue {
  const ctx = useContext(RegistrationLockContext);
  if (!ctx) {
    throw new Error(
      'useRegistrationLock must be used inside <RegistrationLockProvider>',
    );
  }
  return ctx;
}

export interface RegistrationLockNotice {
  /** Lock shown at the top of the screen, or null. */
  reason: RegistrationLockReason | null;
  /** Current name of the RACIMO, for the "RACIMO not active" notice (#61). */
  racimoName: string | null;
  /** Green "Tu estación fue reactivada" notice, only on the first visit after it. */
  showReactivated: boolean;
}

/**
 * Notice for Home and Measurement. Re-evaluates the lock on every focus and, the first time
 * either screen is focused after a reactivation, shows the green notice and consumes it, so
 * it never appears again (decision in #60).
 * @param options.refreshOnFocus - false when the screen already re-evaluates on focus
 *   itself (Home does, to decide the streak), so the lock is not read twice.
 */
export function useRegistrationLockNotice(
  options: { refreshOnFocus?: boolean } = {},
): RegistrationLockNotice {
  const { refreshOnFocus = true } = options;
  const { state, refresh, consumeReactivationNotice } = useRegistrationLock();
  const [focused, setFocused] = useState(false);
  const [showReactivated, setShowReactivated] = useState(false);
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      setFocused(true);
      if (refreshOnFocus) void refresh();
      return () => {
        focusedRef.current = false;
        setFocused(false);
        setShowReactivated(false);
      };
    }, [refresh, refreshOnFocus]),
  );

  useEffect(() => {
    if (focused && state.reactivationPending && state.reason === null) {
      void (async () => {
        await consumeReactivationNotice();
        if (focusedRef.current) setShowReactivated(true);
      })();
    }
  }, [
    focused,
    state.reactivationPending,
    state.reason,
    consumeReactivationNotice,
  ]);

  return {
    reason: state.reason,
    racimoName: state.racimoName,
    showReactivated: showReactivated && state.reason === null,
  };
}
