const pg = require('pg')
const dotenv = require('dotenv')
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

module.exports = pool;

