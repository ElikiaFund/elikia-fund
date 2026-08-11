import { clearCashSessionSyncQueueEntries, getPendingCashSessionSyncQueue, markCashSessionsSynced, type LocalCashSession } from '@/db/database';
import { cashSessionService, type CloseCashSessionPayload } from '@/services/cashSessionService';

/**
 * Flushes offline-closed sessions to POST /cash-sessions/close, one at a time (unlike
 * lib/sync.ts's batched /sync, there's no batch endpoint here — closings are rare enough, at most
 * once per cadence period, that this doesn't need one). Each close is idempotent server-side
 * (upsert by uuid — see CashSessionController::store()), so retrying a partially-flushed queue on
 * the next reconnect is always safe.
 */
export async function flushCashSessionSyncQueue(companyId: number): Promise<{ synced: number }> {
  const queue = await getPendingCashSessionSyncQueue(companyId);

  if (queue.length === 0) {
    return { synced: 0 };
  }

  let synced = 0;

  for (const entry of queue) {
    const {
      synced: _synced,
      user_id: _userId,
      company_id: _companyId,
      variance: _variance,
      ...payload
    } = JSON.parse(entry.payload) as LocalCashSession;

    try {
      await cashSessionService.close(payload satisfies CloseCashSessionPayload);
      await markCashSessionsSynced([entry.session_uuid]);
      await clearCashSessionSyncQueueEntries([entry.id]);
      synced++;
    } catch {
      // Leave this entry queued — retried on the next flush.
    }
  }

  return { synced };
}
