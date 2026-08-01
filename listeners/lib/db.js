import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'lunch.db');

export const createLunchDb = (dbPath = DEFAULT_DB_PATH) => {
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      category TEXT NOT NULL,
      restaurant_id TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      shown_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      restaurant_id TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      rating TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Single-row table (workspace-wide setting, not per-user).
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      range_code TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const recordShownStmt = db.prepare(
    'INSERT INTO history (channel_id, category, restaurant_id, restaurant_name, shown_at) VALUES (?, ?, ?, ?, ?)',
  );
  const recentlyShownStmt = db.prepare(
    'SELECT restaurant_id FROM history WHERE channel_id = ? ORDER BY id DESC LIMIT ?',
  );
  const recordFeedbackStmt = db.prepare(
    'INSERT INTO feedback (channel_id, restaurant_id, restaurant_name, rating, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );

  const saveSettingsStmt = db.prepare(`
    INSERT INTO settings (id, address, lat, lng, range_code, updated_by, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      address = excluded.address,
      lat = excluded.lat,
      lng = excluded.lng,
      range_code = excluded.range_code,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `);
  const getSettingsStmt = db.prepare(
    'SELECT address, lat, lng, range_code, updated_by, updated_at FROM settings WHERE id = 1',
  );

  return {
    recordShown(channelId, category, restaurants) {
      const shownAt = new Date().toISOString();
      for (const restaurant of restaurants) {
        recordShownStmt.run(channelId, category, restaurant.id, restaurant.name, shownAt);
      }
    },

    getRecentlyShownIds(channelId, limit = 15) {
      return recentlyShownStmt.all(channelId, limit).map((row) => row.restaurant_id);
    },

    recordFeedback(channelId, restaurantId, restaurantName, rating, userId) {
      recordFeedbackStmt.run(channelId, restaurantId, restaurantName, rating, userId, new Date().toISOString());
    },

    saveSettings({ address, lat, lng, rangeCode, updatedBy }) {
      saveSettingsStmt.run(address, lat, lng, rangeCode, updatedBy, new Date().toISOString());
    },

    getSettings() {
      const row = getSettingsStmt.get();
      if (!row) return null;

      return {
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        rangeCode: row.range_code,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at,
      };
    },
  };
};

export const lunchDb = createLunchDb();
