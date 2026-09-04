'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Postgres serializa DATE como timestamp ISO completo ("2026-03-07T00:00:00.000Z"),
// no como "2026-03-07" — hay que normalizar antes de usar la fecha como clave o
// de recortarla para el eje, si no las mismas fechas terminan repartidas en
// claves distintas y el eje muestra basura.
function isoDate(value) {
  return String(value).slice(0, 10);
}

function mergeSeries(historical = [], predictions = []) {
  const byDate = new Map();

  historical.forEach((row) => {
    const date = isoDate(row.date);
    const existing = byDate.get(date) || { date };
    existing.historical = (existing.historical || 0) + Number(row.total_demand || 0);
    byDate.set(date, existing);
  });

  predictions.forEach((row) => {
    const date = isoDate(row.date);
    const existing = byDate.get(date) || { date };
    existing.predicted = (existing.predicted || 0) + Number(row.predicted_demand || 0);
    byDate.set(date, existing);
  });

  return Array.from(byDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
}

function TickLabel({ x, y, payload }) {
  return (
    <text x={x} y={y + 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill="var(--color-ink-faint)">
      {isoDate(payload.value).slice(5)}
    </text>
  );
}

export default function DemandChart({ historical, predictions }) {
  const data = mergeSeries(historical, predictions);
  const hasPredictions = predictions && predictions.length > 0;
  const tickInterval = Math.max(0, Math.ceil(data.length / 6) - 1);

  return (
    <div className="chart-frame">
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tick={<TickLabel />} axisLine={{ stroke: 'var(--color-border-strong)' }} tickLine={false} interval={tickInterval} />
            <YAxis
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-ink-faint)' }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip
              contentStyle={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                border: '1px solid var(--color-border-strong)',
                borderRadius: 0
              }}
            />
            <Line type="monotone" dataKey="historical" name="Histórica" stroke="var(--color-accent)" strokeWidth={1.75} dot={false} />
            {hasPredictions && (
              <Line
                type="monotone"
                dataKey="predicted"
                name="Proyectada"
                stroke="var(--color-state-low)"
                strokeWidth={1.75}
                strokeDasharray="4 3"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span>
          <span className="swatch" style={{ background: 'var(--color-accent)' }} />
          Histórica
        </span>
        {hasPredictions ? (
          <span>
            <span className="swatch" style={{ background: 'var(--color-state-low)', borderTop: '2px dashed var(--color-state-low)' }} />
            Proyectada
          </span>
        ) : (
          <span>Proyectada — sin datos disponibles todavía</span>
        )}
      </div>
    </div>
  );
}
