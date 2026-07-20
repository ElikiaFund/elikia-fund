import NetInfo from '@react-native-community/netinfo';

import { cacheSyncedTransactions, listTransactions, listUnsyncedTransactions, type LocalTransaction } from '@/db/database';
import { transactionService } from '@/services/transactionService';

/**
 * Cash flow relies on SQLite only when offline: while connected, this reads straight from the
 * server (accurate across devices, not just whatever synced to this one) and mirrors the result
 * into SQLite so the same data is still there the next time the device has no connection. Any
 * transaction created offline and not yet pushed up is merged back in so it doesn't momentarily
 * vanish from the list the moment the app comes back online but before the sync flush lands.
 * Falls back to the local cache whenever the network fetch itself fails.
 */
export async function loadTransactions(userId: number): Promise<LocalTransaction[]> {
  const netState = await NetInfo.fetch();

  if (netState.isConnected) {
    try {
      const remote = await transactionService.list();
      const remoteAsLocal: LocalTransaction[] = remote.map((t) => ({
        uuid: t.uuid,
        user_id: userId,
        type: t.type,
        amount: Number(t.amount),
        category: t.category,
        note: t.note,
        product_name: t.product_name,
        quantity: t.quantity,
        occurred_at: t.occurred_at,
        created_at: t.created_at,
        synced: 1,
      }));

      await cacheSyncedTransactions(remoteAsLocal);

      const pending = await listUnsyncedTransactions(userId);
      const remoteUuids = new Set(remoteAsLocal.map((t) => t.uuid));
      const merged = [...remoteAsLocal, ...pending.filter((t) => !remoteUuids.has(t.uuid))];

      return merged.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
    } catch {
      // Reachable network but the request itself failed — fall back to the local cache below.
    }
  }

  return listTransactions(userId);
}
