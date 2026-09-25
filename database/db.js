import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'voice_times.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);
let writeQueue = Promise.resolve();

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function enqueueWrite(task) {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

export async function initDatabase() {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA busy_timeout = 5000');

  await run(`
    CREATE TABLE IF NOT EXISTS voice_time (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      total_seconds INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bot_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export async function startVoiceSession(guildId, userId, channelId, startedAt = Date.now()) {
  return enqueueWrite(() =>
    run(
      `INSERT INTO active_sessions (guild_id, user_id, channel_id, started_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id)
       DO UPDATE SET channel_id = excluded.channel_id, started_at = excluded.started_at`,
      [guildId, userId, channelId, startedAt],
    ),
  );
}

export async function moveVoiceSession(guildId, userId, channelId) {
  return enqueueWrite(async () => {
    const session = await get(
      'SELECT started_at FROM active_sessions WHERE guild_id = ? AND user_id = ?',
      [guildId, userId],
    );

    if (!session) {
      await run(
        'INSERT INTO active_sessions (guild_id, user_id, channel_id, started_at) VALUES (?, ?, ?, ?)',
        [guildId, userId, channelId, Date.now()],
      );
      return 0;
    }

    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - session.started_at) / 1000));

    await run('BEGIN IMMEDIATE');
    try {
      await run(
        `INSERT INTO voice_time (guild_id, user_id, total_seconds)
         VALUES (?, ?, ?)
         ON CONFLICT(guild_id, user_id)
         DO UPDATE SET total_seconds = total_seconds + excluded.total_seconds`,
        [guildId, userId, seconds],
      );

      await run(
        `UPDATE active_sessions
         SET channel_id = ?, started_at = ?
         WHERE guild_id = ? AND user_id = ?`,
        [channelId, now, guildId, userId],
      );

      await run('COMMIT');
      return seconds;
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  });
}

export async function finishVoiceSession(guildId, userId) {
  return enqueueWrite(async () => {
    const session = await get(
      'SELECT started_at FROM active_sessions WHERE guild_id = ? AND user_id = ?',
      [guildId, userId],
    );

    if (!session) return 0;

    const seconds = Math.max(0, Math.floor((Date.now() - session.started_at) / 1000));

    await run('BEGIN IMMEDIATE');
    try {
      await run(
        `INSERT INTO voice_time (guild_id, user_id, total_seconds)
         VALUES (?, ?, ?)
         ON CONFLICT(guild_id, user_id)
         DO UPDATE SET total_seconds = total_seconds + excluded.total_seconds`,
        [guildId, userId, seconds],
      );

      await run(
        'DELETE FROM active_sessions WHERE guild_id = ? AND user_id = ?',
        [guildId, userId],
      );

      await run('COMMIT');
      return seconds;
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  });
}

export async function reconcileVoiceSession(
  guildId,
  userId,
  channelId,
  now = Date.now(),
) {
  return enqueueWrite(async () => {
    const session = await get(
      'SELECT channel_id, started_at FROM active_sessions WHERE guild_id = ? AND user_id = ?',
      [guildId, userId],
    );

    if (!session) {
      await run(
        'INSERT INTO active_sessions (guild_id, user_id, channel_id, started_at) VALUES (?, ?, ?, ?)',
        [guildId, userId, channelId, now],
      );
      return;
    }

    if (session.channel_id !== channelId) {
      const seconds = Math.max(0, Math.floor((now - session.started_at) / 1000));

      await run('BEGIN IMMEDIATE');
      try {
        await run(
          `INSERT INTO voice_time (guild_id, user_id, total_seconds)
           VALUES (?, ?, ?)
           ON CONFLICT(guild_id, user_id)
           DO UPDATE SET total_seconds = total_seconds + excluded.total_seconds`,
          [guildId, userId, seconds],
        );

        await run(
          `UPDATE active_sessions
           SET channel_id = ?, started_at = ?
           WHERE guild_id = ? AND user_id = ?`,
          [channelId, now, guildId, userId],
        );

        await run('COMMIT');
      } catch (error) {
        await run('ROLLBACK');
        throw error;
      }
    }
  });
}

export async function listActiveSessions() {
  return all(
    'SELECT guild_id, user_id, channel_id, started_at FROM active_sessions',
  );
}

export async function deleteVoiceSession(guildId, userId) {
  return enqueueWrite(() =>
    run(
      'DELETE FROM active_sessions WHERE guild_id = ? AND user_id = ?',
      [guildId, userId],
    ),
  );
}

export async function getLeaderboard(guildId) {
  return all(
    `SELECT vt.user_id,
            vt.total_seconds +
            COALESCE(
              CASE
                WHEN s.started_at IS NOT NULL THEN CAST((? - s.started_at) / 1000 AS INTEGER)
                ELSE 0
              END,
              0
            ) AS total_seconds
     FROM voice_time vt
     LEFT JOIN active_sessions s
       ON s.guild_id = vt.guild_id
      AND s.user_id = vt.user_id
     WHERE vt.guild_id = ?

     UNION

     SELECT s.user_id,
            CAST((? - s.started_at) / 1000 AS INTEGER) AS total_seconds
     FROM active_sessions s
     LEFT JOIN voice_time vt
       ON vt.guild_id = s.guild_id
      AND vt.user_id = s.user_id
     WHERE s.guild_id = ?
       AND vt.user_id IS NULL

     ORDER BY total_seconds DESC`,
    [Date.now(), guildId, Date.now(), guildId],
  );
}

export async function resetWeeklyData(now = Date.now()) {
  return enqueueWrite(async () => {
    await run('BEGIN IMMEDIATE');
    try {
      await run('DELETE FROM voice_time');
      await run('UPDATE active_sessions SET started_at = ?', [now]);
      await run(
        `INSERT INTO bot_meta (key, value)
         VALUES ('last_weekly_reset', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(now)],
      );
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  });
}

function startOfCurrentWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(diff);
  return d.getTime();
}

export async function ensureWeeklyReset() {
  const row = await get(
    "SELECT value FROM bot_meta WHERE key = 'last_weekly_reset'",
  );

  const weekStart = startOfCurrentWeek(new Date());
  const lastReset = Number(row?.value || 0);

  if (lastReset < weekStart) {
    await resetWeeklyData(Date.now());
    return true;
  }

  return false;
}
