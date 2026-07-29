import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { getActiveCashSession, setActiveCashSession, clearActiveCashSession, type LocalActiveCashSession, type LocalCashSession } from '@/db/database';
import { flushCashSessionSyncQueue } from '@/lib/cash-session-sync';
import { loadCashSessions } from '@/lib/cash-sessions';
import { scheduleCashSessionReminder } from '@/lib/cash-session-schedule';

type CashSessionContextValue = {
  lastClosedSession: LocalCashSession | null;
  /** Non-null while a session is "in progress" — see db/database.ts#getActiveCashSession. */
  activeSession: LocalActiveCashSession | null;
  isRefreshing: boolean;
  refreshSessions: () => Promise<void>;
  recordClosedSession: (session: LocalCashSession) => void;
  markSessionStarted: (startedAt: string) => void;
  markSessionClosed: () => void;
};

const CashSessionContext = createContext<CashSessionContextValue | null>(null);

/**
 * Closed sessions change far less often than transactions, so unlike lib/transactions.ts (which
 * every cash-flow screen re-fetches on its own focus), this refreshes on a slower shared cadence —
 * mount/login, NetInfo reconnect, and app-foreground — and every screen reads the one already-fetched
 * `lastClosedSession` instead of independently calling loadCashSessions().
 */
export function CashSessionProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const [lastClosedSession, setLastClosedSession] = useState<LocalCashSession | null>(null);
  const [activeSession, setActiveSession] = useState<LocalActiveCashSession | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  const refreshSessions = useCallback(async () => {
    if (isRefreshingRef.current || !user) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    try {
      // Purely local, no network involved — safe to read even offline or mid-refresh-failure below.
      setActiveSession(await getActiveCashSession(user.id));

      await flushCashSessionSyncQueue(user.id).catch(() => {});
      const sessions = await loadCashSessions(user.id);
      setLastClosedSession(sessions[0] ?? null);
    } catch {
      // Offline or the request failed — keep whatever was already in state.
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [user]);

  const recordClosedSession = useCallback((session: LocalCashSession) => {
    setLastClosedSession((current) => (current && current.closed_at > session.closed_at ? current : session));
  }, []);

  const markSessionStarted = useCallback(
    (startedAt: string) => {
      if (!user) {
        return;
      }

      setActiveSession({ user_id: user.id, started_at: startedAt });
      setActiveCashSession(user.id, startedAt).catch(() => {});
    },
    [user],
  );

  const markSessionClosed = useCallback(() => {
    setActiveSession(null);

    if (user) {
      clearActiveCashSession(user.id).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLastClosedSession(null);
      setActiveSession(null);
      return;
    }

    refreshSessions();
    scheduleCashSessionReminder(user).catch(() => {});

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        refreshSessions();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshSessions();
      }
    });

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, user, refreshSessions]);

  return (
    <CashSessionContext.Provider
      value={{ lastClosedSession, activeSession, isRefreshing, refreshSessions, recordClosedSession, markSessionStarted, markSessionClosed }}
    >
      {children}
    </CashSessionContext.Provider>
  );
}

export function useCashSession() {
  const context = useContext(CashSessionContext);

  if (!context) {
    throw new Error('useCashSession must be used within a CashSessionProvider');
  }

  return context;
}
