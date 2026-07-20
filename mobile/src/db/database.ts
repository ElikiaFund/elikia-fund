import * as SQLite from 'expo-sqlite';

export type LocalTransaction = {
  uuid: string;
  user_id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string | null;
  product_name: string | null;
  quantity: number | null;
  occurred_at: string;
  created_at: string;
  synced: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('elikia_fund.db');
  }
  return dbPromise;
}

export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      uuid TEXT PRIMARY KEY NOT NULL,
      user_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      product_name TEXT,
      quantity INTEGER,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_uuid TEXT NOT NULL,
      user_id INTEGER,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // The device DB predates per-user scoping — on an existing install these columns won't exist
  // yet. `CREATE TABLE IF NOT EXISTS` above is a no-op on those, so add them by hand. Rows left
  // with a NULL user_id are attributed to whoever logs in next via backfillLegacyUserId() —
  // there's no way to know for certain who they belonged to, but on a personal device "whoever
  // opens the app next" is the best available guess, and it beats silently losing the data.
  await addColumnIfMissing(db, 'transactions', 'user_id', 'INTEGER');
  await addColumnIfMissing(db, 'sync_queue', 'user_id', 'INTEGER');
}

async function addColumnIfMissing(db: SQLite.SQLiteDatabase, table: string, column: string, type: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);

  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

/**
 * Attributes any locally-stored rows with no owner yet to `userId` — a one-time backfill for
 * data written before per-user scoping existed. Safe to call on every login: once every row has
 * a user_id, the WHERE clause matches nothing and this is a no-op.
 */
export async function backfillLegacyUserId(userId: number): Promise<void> {
  const db = await getDb();

  await db.runAsync('UPDATE transactions SET user_id = ? WHERE user_id IS NULL', [userId]);
  await db.runAsync('UPDATE sync_queue SET user_id = ? WHERE user_id IS NULL', [userId]);
}

export async function insertTransaction(transaction: LocalTransaction) {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO transactions (uuid, user_id, type, amount, category, note, product_name, quantity, occurred_at, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.uuid,
      transaction.user_id,
      transaction.type,
      transaction.amount,
      transaction.category,
      transaction.note,
      transaction.product_name,
      transaction.quantity,
      transaction.occurred_at,
      transaction.created_at,
      transaction.synced,
    ],
  );

  await enqueueSync(db, transaction);
}

export async function listTransactions(userId: number): Promise<LocalTransaction[]> {
  const db = await getDb();

  return db.getAllAsync<LocalTransaction>('SELECT * FROM transactions WHERE user_id = ? ORDER BY occurred_at DESC', [userId]);
}

/** Local rows not yet confirmed on the server — created while offline, still queued for sync. */
export async function listUnsyncedTransactions(userId: number): Promise<LocalTransaction[]> {
  const db = await getDb();

  return db.getAllAsync<LocalTransaction>(
    'SELECT * FROM transactions WHERE user_id = ? AND synced = 0 ORDER BY occurred_at DESC',
    [userId],
  );
}

/**
 * Writes a transaction already confirmed on the server straight into the local cache — no
 * sync_queue entry, since there's nothing left to push. Used both when a write succeeds online
 * and when mirroring a server-fetched list, so the offline fallback always has the latest data.
 */
export async function cacheSyncedTransaction(transaction: Omit<LocalTransaction, 'synced'>) {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO transactions (uuid, user_id, type, amount, category, note, product_name, quantity, occurred_at, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(uuid) DO UPDATE SET
       type = excluded.type, amount = excluded.amount, category = excluded.category, note = excluded.note,
       product_name = excluded.product_name, quantity = excluded.quantity, occurred_at = excluded.occurred_at,
       synced = 1`,
    [
      transaction.uuid,
      transaction.user_id,
      transaction.type,
      transaction.amount,
      transaction.category,
      transaction.note,
      transaction.product_name,
      transaction.quantity,
      transaction.occurred_at,
      transaction.created_at,
    ],
  );
}

/** Bulk version of cacheSyncedTransaction — mirrors a server-fetched list into the local cache. */
export async function cacheSyncedTransactions(transactions: Omit<LocalTransaction, 'synced'>[]) {
  for (const transaction of transactions) {
    await cacheSyncedTransaction(transaction);
  }
}

export type SyncQueueEntry = {
  id: number;
  transaction_uuid: string;
  user_id: number;
  payload: string;
  created_at: string;
};

/** The sync engine (`@/lib/sync`) reads this queue, POSTs batches to /sync, then clears synced rows. */
export async function getPendingSyncQueue(userId: number): Promise<SyncQueueEntry[]> {
  const db = await getDb();

  return db.getAllAsync<SyncQueueEntry>('SELECT * FROM sync_queue WHERE user_id = ? ORDER BY created_at ASC', [userId]);
}

export async function getPendingSyncCount(userId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ?', [userId]);

  return row?.count ?? 0;
}

export async function markTransactionsSynced(uuids: string[]): Promise<void> {
  if (uuids.length === 0) {
    return;
  }

  const db = await getDb();
  const placeholders = uuids.map(() => '?').join(',');

  await db.runAsync(`UPDATE transactions SET synced = 1 WHERE uuid IN (${placeholders})`, uuids);
}

export async function clearSyncQueueEntries(ids: number[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');

  await db.runAsync(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ids);
}

async function enqueueSync(db: SQLite.SQLiteDatabase, transaction: LocalTransaction) {
  await db.runAsync(
    'INSERT INTO sync_queue (transaction_uuid, user_id, payload, created_at) VALUES (?, ?, ?, ?)',
    [transaction.uuid, transaction.user_id, JSON.stringify(transaction), new Date().toISOString()],
  );
}
