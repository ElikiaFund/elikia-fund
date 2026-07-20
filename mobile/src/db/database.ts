import * as SQLite from 'expo-sqlite';

export type LocalTransaction = {
  uuid: string;
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
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export async function insertTransaction(transaction: LocalTransaction) {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO transactions (uuid, type, amount, category, note, product_name, quantity, occurred_at, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.uuid,
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

export async function listTransactions(): Promise<LocalTransaction[]> {
  const db = await getDb();

  return db.getAllAsync<LocalTransaction>('SELECT * FROM transactions ORDER BY occurred_at DESC');
}

export type SyncQueueEntry = {
  id: number;
  transaction_uuid: string;
  payload: string;
  created_at: string;
};

/** The sync engine (`@/lib/sync`) reads this queue, POSTs batches to /sync, then clears synced rows. */
export async function getPendingSyncQueue(): Promise<SyncQueueEntry[]> {
  const db = await getDb();

  return db.getAllAsync<SyncQueueEntry>('SELECT * FROM sync_queue ORDER BY created_at ASC');
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue');

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
    'INSERT INTO sync_queue (transaction_uuid, payload, created_at) VALUES (?, ?, ?)',
    [transaction.uuid, JSON.stringify(transaction), new Date().toISOString()],
  );
}
