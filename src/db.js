const Database = require('better-sqlite3');
const path = require('path');

// Use DB_PATH from environment or default to local file
const dbPath = process.env.DB_PATH || path.join(__dirname, '../voicebot.db');

const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        generator_channel_id TEXT,
        category_id TEXT,
        allowed_role_id TEXT
    );
`);

// Migration: Add allowed_role_id if it doesn't exist
try {
    db.exec('ALTER TABLE guild_settings ADD COLUMN allowed_role_id TEXT');
} catch (error) {
    // Column likely already exists
}

db.exec(`
    CREATE TABLE IF NOT EXISTS active_channels (
        channel_id TEXT PRIMARY KEY,
        owner_id TEXT,
        guild_id TEXT
    );
`);

module.exports = db;
