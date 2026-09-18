require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env.local') });

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PORT = process.env.PORT || 4000;

module.exports = { pool, PORT };
