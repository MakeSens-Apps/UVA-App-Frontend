/**
 * B06 — SessionContext
 *
 * Wraps the SessionService singleton (portability-matrix §4.2, §4.1).
 * The singleton (src/data/session/session.ts) is used directly by DS services
 * (static session = new SessionService()). This Context exposes the session
 * state reactively to the UI, without duplicating storage logic.
 *
 * Portability matrix: "SessionContext" → replaces pull non-reactive SessionService (R-27)
 * Changes:
 *  - @Injectable removed → Context + hook
 *  - Reactive: UI observes session changes without polling
 *  - Singleton sessionService is used for all I/O (not duplicated here)
 *
 * Risks: R-27 (reactive state), R-09 (token storage)
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { sessionService } from '@/data/session/session';
import type { Session } from '@/data/models/session.model';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface SessionContextValue {
  /** Current session data (loaded on mount, updated on setSession/clearSession) */
  session: Session;
  /** Whether session has been loaded from storage (false while loading) */
  isLoaded: boolean;
  /**
   * Persists new session info and updates the reactive state.
   * Delegates to SessionService.setInfo().
   */
  setSession: (info: Session) => Promise<void>;
  /**
   * Updates a single session field and updates the reactive state.
   * Delegates to SessionService.setInfoField().
   */
  setSessionField: (
    key: keyof Session,
    value: string | undefined,
  ) => Promise<void>;
  /**
   * Clears all session data (key-by-key, R-37) and resets the reactive state.
   * Delegates to SessionService.clear().
   */
  clearSession: () => Promise<void>;
  /**
   * Re-loads session from storage and updates the reactive state.
   * Useful after external writes (e.g. from DS services) that bypass the context.
   */
  reloadSession: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({
  children,
}: SessionProviderProps): React.JSX.Element {
  const [session, setSessionState] = useState<Session>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session from storage on mount
  useEffect(() => {
    void sessionService.getInfo().then((loaded) => {
      setSessionState(loaded);
      setIsLoaded(true);
    });
  }, []);

  const setSession = useCallback(async (info: Session): Promise<void> => {
    await sessionService.setInfo(info);
    // Merge new info into existing session state
    setSessionState((prev) => ({ ...prev, ...info }));
  }, []);

  const setSessionField = useCallback(
    async (key: keyof Session, value: string | undefined): Promise<void> => {
      await sessionService.setInfoField(key, value);
      setSessionState((prev) => {
        if (value === undefined) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: value };
      });
    },
    [],
  );

  const clearSession = useCallback(async (): Promise<void> => {
    await sessionService.clear();
    setSessionState({});
  }, []);

  const reloadSession = useCallback(async (): Promise<void> => {
    const loaded = await sessionService.getInfo();
    setSessionState(loaded);
  }, []);

  const value: SessionContextValue = {
    session,
    isLoaded,
    setSession,
    setSessionField,
    clearSession,
    reloadSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to consume SessionContext.
 * Must be used within a <SessionProvider>.
 */
export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error(
      'useSessionContext must be used within a <SessionProvider>',
    );
  }
  return ctx;
}

export default SessionContext;
