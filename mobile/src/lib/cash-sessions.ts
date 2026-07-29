import NetInfo from '@react-native-community/netinfo';

import { cacheSyncedCashSessions, listCashSessions, listUnsyncedCashSessions, type LocalCashSession } from '@/db/database';
import { cashSessionService } from '@/services/cashSessionService';

/**
 * Same online/offline pattern as lib/transactions.ts#loadTransactions() — while connected, reads
 * straight from the server and mirrors the result into SQLite; falls back to the local cache
 * offline or on a failed request. Closed sessions change far less often than transactions, so
 * this is only called on a slower cadence (mount/reconnect/foreground — see CashSessionProvider),
 * never on every screen focus.
 */
export async function loadCashSessions(userId: number): Promise<LocalCashSession[]> {
  const netState = await NetInfo.fetch();

  if (netState.isConnected) {
    try {
      const remote = await cashSessionService.list();
      const remoteAsLocal: LocalCashSession[] = remote.map((s) => ({
        uuid: s.uuid,
        user_id: userId,
        period_start: s.period_start,
        closed_at: s.closed_at,
        expected_balance: Number(s.expected_balance),
        counted_balance: Number(s.counted_balance),
        variance: Number(s.variance),
        notes: s.notes,
        synced: 1,
      }));

      await cacheSyncedCashSessions(remoteAsLocal);

      const pending = await listUnsyncedCashSessions(userId);
      const remoteUuids = new Set(remoteAsLocal.map((s) => s.uuid));
      const merged = [...remoteAsLocal, ...pending.filter((s) => !remoteUuids.has(s.uuid))];

      return merged.sort((a, b) => (a.closed_at < b.closed_at ? 1 : -1));
    } catch {
      // Reachable network but the request itself failed — fall back to the local cache below.
    }
  }

  return listCashSessions(userId);
}
