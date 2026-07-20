import { clearSyncQueueEntries, getPendingSyncQueue, markTransactionsSynced, type LocalTransaction } from '@/db/database';
import { syncService, type SyncTransactionPayload } from '@/services/syncService';

/**
 * Flushes the local sync_queue to POST /sync in one batch, for the given (currently
 * authenticated) user only — the queue is shared device storage across whoever has logged in on
 * this device, so scoping by user_id here is what keeps one account from syncing another's
 * queued entries. Idempotent: a queue entry only clears once the server confirms it in
 * `accepted`, so a failed/partial batch just gets retried in full next time.
 */
export async function flushSyncQueue(userId: number): Promise<{ synced: number }> {
  const queue = await getPendingSyncQueue(userId);

  if (queue.length === 0) {
    return { synced: 0 };
  }

  const transactions = queue.map((entry) => {
    const { created_at: _createdAt, synced: _synced, user_id: _userId, ...payload } = JSON.parse(entry.payload) as LocalTransaction;
    return payload satisfies SyncTransactionPayload;
  });

  const { accepted } = await syncService.push(transactions);
  const acceptedSet = new Set(accepted);
  const acceptedQueueIds = queue.filter((entry) => acceptedSet.has(entry.transaction_uuid)).map((entry) => entry.id);

  await markTransactionsSynced(accepted);
  await clearSyncQueueEntries(acceptedQueueIds);

  return { synced: accepted.length };
}
