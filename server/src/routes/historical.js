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

router.get('/sites', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT site FROM historical_turns ORDER BY site'
    );
    res.json(result.rows.map((row) => row.site));
  } catch (err) {
    next(err);
  }
});

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
    const query = `SELECT * FROM historical_turns ${where} ORDER BY date`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
