const { pool } = require('./pool');

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      specialty VARCHAR(100) NOT NULL,
      neighborhood VARCHAR(100) NOT NULL,
      predicted_demand NUMERIC(8,2) NOT NULL,
      confidence DECIMAL(5,2),
      model_version VARCHAR(50) NOT NULL DEFAULT 'v1',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (date, specialty, neighborhood, model_version)
    );
    CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(date);
    CREATE INDEX IF NOT EXISTS idx_predictions_specialty ON predictions(specialty);
  `);
}

module.exports = { ensureSchema };
