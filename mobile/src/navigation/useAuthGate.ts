/**
 * B12 — useAuthGate()
 *
 * Ported from: src/app/pages/splash-animation/splash-animation.page.ts
 *   - checkUserAuthentication()
 *   - continueWithAuthenticatedFlow()
 *
 * Classification: Rewrite (UI logic extracted to hook)
 *
 * Changes from original:
 *  - AnimationController / Ionic Router removed → hook returns destination state
 *  - Router.navigate calls → destination state string consumed by RootNavigator
 *  - SyncMonitorDSService.waitForSyncDataStore() → useSyncContext().waitForSync()
 *  - SyncMonitorDSService.networkStatus → useSyncContext().networkStatus
 *  - SessionService.getInfo() → useSessionContext().session / reloadSession()
 *  - setInfoField (fire-and-forget) → setSessionField (async, called in hook)
 *  - All redirectToPage() → destination state (RootNavigator decides the screen)
 *  - setTimeout/setInterval polling → useEffect with cleanup (R-30)
 *  - waitForAnimationToEnd polling → removed (SplashScreen handles animation separately)
 *  - console.log/error kept (verbatim from original for parity) – dev only
 *
 * Auth logic preserved verbatim from original checkUserAuthentication /
 * continueWithAuthenticatedFlow (no behavior changes).
 *
 * Portability matrix: SplashAnimationPage → B12 → hook useAuthGate()
 * Risks: R-04, R-15, R-30, R-27
 */

import { useState, useCallback, useRef } from 'react';
import { authService } from '@/data/auth/auth';
import { UserDSService } from '@/data/datastore/user-ds';
import { UvaDSService } from '@/data/datastore/uva-ds';
import { RacimoDSService } from '@/data/datastore/racimo-ds';
import { sessionService } from '@/data/session/session';
import { useSessionContext } from '@/state/SessionContext';
import { useSyncContext } from '@/state/SyncContext';

// ─── Destination enum ─────────────────────────────────────────────────────────

export type AuthGateDestination = 'login' | 'app' | 'validate-project';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAuthGateResult {
  /**
   * Current destination after auth check. Null while checking.
   * RootNavigator reads this to decide which stack to show.
   */
  destination: AuthGateDestination | null;
  /**
   * Whether the auth check is in progress.
   */
  isChecking: boolean;
  /**
   * Starts the authentication check. Idempotent (ignores re-calls while checking).
   * Call from useEffect on mount.
   */
  startAuthCheck: () => Promise<void>;
}

/* eslint-disable no-console */
export function useAuthGate(): UseAuthGateResult {
  const [destination, setDestination] = useState<AuthGateDestination | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkingRef = useRef(false); // prevent double-invoke

  const { session, setSessionField, reloadSession } = useSessionContext();
  const { waitForSync, networkStatus } = useSyncContext();

  // ─── continueWithAuthenticatedFlow ──────────────────────────────────────

  const continueWithAuthenticatedFlow = useCallback(
    async (userID: string): Promise<void> => {
      try {
        console.log('🚀 Continuing with authenticated flow for user:', userID);

        await setSessionField('userID', userID);

        // Check if the user has an assigned UVA
        console.log('🍇 Checking UVA assignment...');
        const uva = await UvaDSService.getUVAByuserID(userID);
        if (!uva) {
          console.log('❌ No UVA found, redirecting to project validation');
          setDestination('validate-project');
          return;
        }

        // Check if the UVA has an associated racimo ID
        const racimoID = uva.racimoID ?? '';
        if (!racimoID) {
          console.log('❌ No racimo ID found, redirecting to project validation');
          setDestination('validate-project');
          return;
        }

        // Verify user still exists (redundant check but kept for safety — original)
        const user = await UserDSService.getUser();
        if (!user) {
          console.log('❌ User data inconsistency detected');
          setDestination('login');
          return;
        }

        // Check if the racimo has a valid code
        console.log('🔗 Checking racimo code...');
        const racimoCode = await RacimoDSService.getRacimoCode(racimoID);
        if (racimoCode) {
          console.log('✅ All validations passed, navigating to home');

          await setSessionField('uvaID', uva.id);
          await setSessionField('racimoID', racimoID);
          await setSessionField('racimoLinkCode', racimoCode);

          setDestination('app');
        } else {
          console.log(
            '❌ No valid racimo code, redirecting to project validation',
          );
          setDestination('validate-project');
        }
      } catch (err) {
        console.error('💥 Error in authenticated flow:', err);
        setDestination('login');
      }
    },
    [setSessionField],
  );

  // ─── checkUserAuthentication ─────────────────────────────────────────────

  const startAuthCheck = useCallback(async (): Promise<void> => {
    if (checkingRef.current) return; // already running
    checkingRef.current = true;
    setIsChecking(true);

    try {
      console.log('🔍 Starting authentication check...');

      // Wait for DataStore to be ready (offline-first — R-04)
      console.log('📊 Checking DataStore sync status...');
      await waitForSync();

      console.log('👤 Checking for local user data...');
      const localUser = await UserDSService.getUser();

      if (localUser) {
        console.log('✅ Local user found, attempting offline-first flow...');

        // Reload session from storage to ensure we have the latest
        await reloadSession();

        if (networkStatus) {
          console.log('🌐 Network available, validating authentication...');

          try {
            const response = await authService.CurrentAuthenticatedUser();
            if (!response.success) {
              console.log(
                '❌ Auth validation failed with internet, redirecting to login',
              );
              setDestination('login');
              return;
            }

            console.log(
              '✅ Auth validation successful, continuing with online flow',
            );
            await continueWithAuthenticatedFlow(response.data.userId);
          } catch (authError) {
            console.error('⚠️ Auth validation error with internet:', authError);
            setDestination('login');
          }
        } else {
          console.log(
            '📱 No network, continuing with offline flow using local data',
          );
          // Use session userID from already-reloaded session
          // Re-read the session in case reloadSession updated it
          const sessionInfo = await sessionService.getInfo();
          const userID = sessionInfo.userID ?? session.userID;
          if (userID) {
            await continueWithAuthenticatedFlow(userID);
          } else {
            console.log('❌ No userID in session, redirecting to login');
            setDestination('login');
          }
        }
      } else {
        console.log(
          '❌ No local user data found, requiring fresh authentication',
        );

        const response = await authService.CurrentAuthenticatedUser();
        if (!response.success) {
          console.log('❌ Fresh authentication failed, redirecting to login');
          setDestination('login');
          return;
        }

        console.log('✅ Fresh authentication successful');
        await continueWithAuthenticatedFlow(response.data.userId);
      }
    } catch (err) {
      console.error('💥 Authentication check failed:', err);
      setDestination('login');
    } finally {
      setIsChecking(false);
      checkingRef.current = false;
    }
  }, [waitForSync, networkStatus, continueWithAuthenticatedFlow, reloadSession, session.userID]);

  return { destination, isChecking, startAuthCheck };
}
/* eslint-enable no-console */
