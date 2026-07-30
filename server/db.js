'use strict';

require('dotenv').config();

const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    '[db] DATABASE_URL is required. Copy .env.example to .env and set your Neon connection string.',
  );
  process.exit(1);
}

// Neon pooler + node-pg: prefer libpq-compatible sslmode semantics.
const connectionString = DATABASE_URL.includes('uselibpqcompat=')
  ? DATABASE_URL
  : DATABASE_URL.includes('?')
    ? `${DATABASE_URL}&uselibpqcompat=true`
    : `${DATABASE_URL}?uselibpqcompat=true`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

/** Convert SQLite-style `?` placeholders to Postgres `$1, $2, …`. */
function toPg(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/** Bind prepare/exec helpers to a Pool or a Client (for transactions). */
function bind(client) {
  return {
    prepare(sql) {
      const text = toPg(sql);
      return {
        async get(...params) {
          const r = await client.query(text, params);
          return r.rows[0];
        },
        async all(...params) {
          const r = await client.query(text, params);
          return r.rows;
        },
        async run(...params) {
          const r = await client.query(text, params);
          return { changes: r.rowCount ?? 0 };
        },
      };
    },
    async exec(sql) {
      await client.query(sql);
    },
  };
}

const db = bind(pool);

/**
 * Run `fn` inside a transaction, rolling back on any throw.
 * `fn` receives a db-like handle bound to the same client.
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(bind(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Apply schema.sql (idempotent CREATE IF NOT EXISTS). */
async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

module.exports = { db, transaction, init, pool };
