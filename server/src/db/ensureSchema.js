const { pool } = require('./pool');

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      specialty VARCHAR(100) NOT NULL,
      site VARCHAR(100) NOT NULL,
      time_slot VARCHAR(20),
      predicted_demand NUMERIC(8,2) NOT NULL,
      confidence DECIMAL(5,2),
      model_version VARCHAR(50) NOT NULL DEFAULT 'v1',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (date, specialty, site, time_slot, model_version)
    );
    CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(date);
    CREATE INDEX IF NOT EXISTS idx_predictions_specialty ON predictions(specialty);
  `);
}

module.exports = { ensureSchema };
