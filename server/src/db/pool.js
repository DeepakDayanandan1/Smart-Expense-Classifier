const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let dbClient = null;
let dbType = 'sqlite'; // 'postgres' or 'sqlite'

const DB_URL = process.env.DATABASE_URL;
const SQLITE_FILE = path.join(__dirname, '../../database.sqlite');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

// SQLite Wrapper conforming to pg-style query interface: { rows, rowCount }
class SQLiteAdapter {
  constructor(filePath) {
    const sqlite3 = require('sqlite3').verbose();
    this.db = new sqlite3.Database(filePath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database:', err.message);
      } else {
        console.log(`[Database] Connected to SQLite database at ${filePath}`);
        this.initSchema();
      }
    });
  }

  initSchema() {
    try {
      if (fs.existsSync(SCHEMA_FILE)) {
        const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');
        this.db.exec(schema, (err) => {
          if (err) {
            console.error('[Database] Error initializing schema:', err.message);
          } else {
            console.log('[Database] Schema verified and initial seed loaded.');
          }
        });
      }
    } catch (e) {
      console.error('[Database] Schema read failed:', e.message);
    }
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      const trimmed = sql.trim().toUpperCase();

      // Convert PostgreSQL $1, $2, $3 placeholders to SQLite ?
      const convertedSql = sql.replace(/\$\d+/g, '?');

      if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
        this.db.all(convertedSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: rows || [], rowCount: (rows || []).length });
        });
      } else if (trimmed.startsWith('INSERT')) {
        this.db.run(convertedSql, params, function (err) {
          if (err) return reject(err);
          // If query has RETURNING *
          if (sql.toUpperCase().includes('RETURNING')) {
            // Fetch newly inserted row
            const lastId = this.lastID;
            dbClient.query('SELECT * FROM expenses WHERE id = ?', [lastId])
              .then(res => resolve({ rows: res.rows, rowCount: 1, lastID: lastId }))
              .catch(() => resolve({ rows: [{ id: lastId }], rowCount: 1, lastID: lastId }));
          } else {
            resolve({ rows: [{ id: this.lastID }], rowCount: this.changes, lastID: this.lastID });
          }
        });
      } else {
        this.db.run(convertedSql, params, function (err) {
          if (err) return reject(err);
          resolve({ rows: [], rowCount: this.changes });
        });
      }
    });
  }
}

// PostgreSQL Wrapper
class PostgresAdapter {
  constructor(connectionString) {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async query(sql, params = []) {
    return await this.pool.query(sql, params);
  }
}

// Initialize Adapter
if (DB_URL && (DB_URL.startsWith('postgres://') || DB_URL.startsWith('postgresql://'))) {
  try {
    console.log('[Database] Attempting PostgreSQL connection...');
    dbClient = new PostgresAdapter(DB_URL);
    dbType = 'postgres';
  } catch (err) {
    console.warn('[Database] PostgreSQL connection failed, falling back to SQLite:', err.message);
    dbClient = new SQLiteAdapter(SQLITE_FILE);
    dbType = 'sqlite';
  }
} else {
  console.log('[Database] Using zero-config local SQLite adapter.');
  dbClient = new SQLiteAdapter(SQLITE_FILE);
  dbType = 'sqlite';
}

module.exports = {
  query: (sql, params) => dbClient.query(sql, params),
  getDbType: () => dbType,
  pool: dbClient
};

