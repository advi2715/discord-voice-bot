const Database = require('better-sqlite3');
const path = require('path');

// Use DB_PATH from environment or default to local file
const dbPath = process.env.DB_PATH || path.join(__dirname, '../voicebot.db');

const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        generator_channel_id TEXT,
        category_id TEXT
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS active_channels (
        channel_id TEXT PRIMARY KEY,
        owner_id TEXT,
        guild_id TEXT
    );
`);

module.exports = db;
