const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { specialty, site, from, to } = req.query;

    const conditions = [];
    const params = [];

    if (specialty) {
      params.push(specialty);
      conditions.push(`specialty = $${params.length}`);
    }
    if (site) {
      params.push(site);
      conditions.push(`site = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`date <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM predictions ${where} ORDER BY date`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { predictions, modelVersion } = req.body || {};

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return res.status(400).json({ error: 'predictions must be a non-empty array' });
    }

    const version = modelVersion || 'v1';
    let imported = 0;

    for (const p of predictions) {
      await pool.query(
        `INSERT INTO predictions (date, specialty, site, time_slot, predicted_demand, confidence, model_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (date, specialty, site, time_slot, model_version)
         DO UPDATE SET predicted_demand = EXCLUDED.predicted_demand, confidence = EXCLUDED.confidence, created_at = CURRENT_TIMESTAMP`,
        [
          p.date,
          p.specialty,
          p.site,
          p.timeSlot,
          p.predictedDemand,
          p.confidence,
          version
        ]
      );
      imported += 1;
    }

    res.json({ imported, modelVersion: version });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
