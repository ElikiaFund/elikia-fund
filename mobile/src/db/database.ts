import * as SQLite from 'expo-sqlite';

export type LocalTransaction = {
  uuid: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string | null;
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
    `INSERT INTO transactions (uuid, type, amount, category, note, occurred_at, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.uuid,
      transaction.type,
      transaction.amount,
      transaction.category,
      transaction.note,
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

// TODO (Day 4): the sync engine reads this queue, POSTs batches to /sync, then clears synced rows.
async function enqueueSync(db: SQLite.SQLiteDatabase, transaction: LocalTransaction) {
  await db.runAsync(
    'INSERT INTO sync_queue (transaction_uuid, payload, created_at) VALUES (?, ?, ?)',
    [transaction.uuid, JSON.stringify(transaction), new Date().toISOString()],
  );
}
