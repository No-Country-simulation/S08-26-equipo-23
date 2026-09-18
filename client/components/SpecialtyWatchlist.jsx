'use client';

import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

function stateInfo(status) {
  if (status === 'high') return { cls: 'is-high', label: 'Alto' };
  if (status === 'low') return { cls: 'is-low', label: 'Bajo' };
  return { cls: 'is-normal', label: 'Normal' };
}

function Sparkline({ points }) {
  if (!points || points.length < 2) return <div className="sparkline" aria-hidden="true" />;
  return (
    <div className="sparkline" aria-hidden="true">
      <ResponsiveContainer>
        <LineChart data={points}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Una fila por especialidad: lectura reciente, tendencia real (no decorativa —
// mismos 30 días que alimentan el gráfico de detalle), z-score y estado.
export default function SpecialtyWatchlist({ rows, selected, onSelect }) {
  if (!rows || rows.length === 0) {
    return <p className="empty-note">Sin datos de demanda todavía.</p>;
  }

  return (
    <div className="watchlist">
      <div className="watchlist-head">
        <span>Especialidad</span>
        <span>Lectura 14d</span>
        <span>Tendencia</span>
        <span>Z-score</span>
        <span>Estado</span>
      </div>
      {rows.map((row) => {
        const state = stateInfo(row.status);
        const isSelected = row.specialty === selected;
        return (
          <button
            key={row.specialty}
            type="button"
            className="watchlist-row"
            aria-current={isSelected}
            onClick={() => onSelect(row.specialty)}
          >
            <span className="specialty-name">{row.specialty}</span>
            <span className="reading num">
              {row.recentAvg ?? '—'}
              <span className="reading-unit">turnos/día</span>
            </span>
            <Sparkline points={row.trend} />
            <span className="zscore num">{row.zScore ?? '—'}</span>
            <span className={`state-badge ${state.cls}`}>{state.label}</span>
          </button>
        );
      })}
    </div>
  );
}
