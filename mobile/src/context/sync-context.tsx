import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/context/company-context';
import { getPendingSyncCount } from '@/db/database';
import { flushSyncQueue } from '@/lib/sync';

type SyncContextValue = {
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const { activeCompany } = useCompany();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(() => {
    if (!user || !activeCompany) {
      setPendingCount(0);
      return;
    }

    getPendingSyncCount(activeCompany.id)
      .then(setPendingCount)
      .catch(() => {});
  }, [user, activeCompany]);

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current || !isAuthenticated || !user || !activeCompany) {
      return;
    }

    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      await flushSyncQueue(activeCompany.id);
    } catch {
      // Offline mid-flush or the API rejected the batch — the queue is untouched, next trigger retries.
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [isAuthenticated, user, activeCompany, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (!isAuthenticated || !activeCompany) {
      return;
    }

    syncNow();

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncNow();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncNow();
      }
    });

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, activeCompany, syncNow]);

  return (
    <SyncContext.Provider value={{ pendingCount, isSyncing, syncNow, refreshPendingCount }}>{children}</SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }

  return context;
}
