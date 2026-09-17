const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/specialties', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT specialty FROM historical_turns ORDER BY specialty'
    );
    res.json(result.rows.map((row) => row.specialty));
  } catch (err) {
    next(err);
  }
});

router.get('/neighborhoods', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT neighborhood FROM historical_turns ORDER BY neighborhood'
    );
    res.json(result.rows.map((row) => row.neighborhood));
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { specialty, neighborhood, from, to } = req.query;

    const conditions = [];
    const params = [];

    if (specialty) {
      params.push(specialty);
      conditions.push(`specialty ILIKE $${params.length}`);
    }
    if (neighborhood) {
      params.push(neighborhood);
      conditions.push(`neighborhood ILIKE $${params.length}`);
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
    const query = `SELECT *, (assigned_turns + unmet_demand) AS total_demand FROM historical_turns ${where} ORDER BY date`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
