const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const windowDays = parseInt(req.query.window, 10);
    const window = Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 14;

    const thresholdRaw = parseFloat(req.query.threshold);
    const threshold = Number.isFinite(thresholdRaw) ? thresholdRaw : 2;

    const query = `
      WITH daily AS (
        SELECT date, specialty, SUM(total_demand) AS daily_demand
        FROM historical_turns
        GROUP BY date, specialty
      ),
      anchor AS ( SELECT MAX(date) AS max_date FROM historical_turns ),
      baseline AS (
        SELECT d.specialty, AVG(d.daily_demand) AS mean_demand, STDDEV_SAMP(d.daily_demand) AS stddev_demand
        FROM daily d, anchor a
        WHERE d.date < a.max_date - ($1 || ' days')::interval
        GROUP BY d.specialty
      ),
      recent AS (
        SELECT d.specialty, AVG(d.daily_demand) AS recent_avg_demand, COUNT(*) AS recent_days
        FROM daily d, anchor a
        WHERE d.date >= a.max_date - ($1 || ' days')::interval
        GROUP BY d.specialty
      ),
      scored AS (
        SELECT
          b.specialty,
          b.mean_demand,
          b.stddev_demand,
          r.recent_avg_demand,
          r.recent_days,
          -- Comparamos un PROMEDIO de recent_days muestras contra la media
          -- poblacional: el desvío correcto para ese test es el error
          -- estándar de la media (stddev / sqrt(n)), no el desvío diario
          -- crudo. Sin este ajuste, un promedio de 14 días casi nunca se
          -- aleja más de un desvío diario y el detector no dispara nunca.
          (b.stddev_demand / NULLIF(SQRT(r.recent_days), 0)) AS standard_error
        FROM baseline b JOIN recent r ON r.specialty = b.specialty
      )
      SELECT
        specialty,
        ROUND(mean_demand::numeric, 2) AS baseline_mean,
        ROUND(stddev_demand::numeric, 2) AS baseline_stddev,
        ROUND(recent_avg_demand::numeric, 2) AS recent_avg,
        ROUND(((recent_avg_demand - mean_demand) / NULLIF(standard_error, 0))::numeric, 2) AS z_score,
        CASE
          WHEN (recent_avg_demand - mean_demand) / NULLIF(standard_error, 0) >= $2 THEN 'high'
          WHEN (recent_avg_demand - mean_demand) / NULLIF(standard_error, 0) <= -$2 THEN 'low'
          ELSE 'normal'
        END AS anomaly_status
      FROM scored
      ORDER BY ABS((recent_avg_demand - mean_demand) / NULLIF(standard_error, 0)) DESC NULLS LAST;
    `;

    const result = await pool.query(query, [String(window), threshold]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
