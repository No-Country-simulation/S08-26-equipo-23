'use client';

// Panel de detalle: el cálculo detrás del estado de UNA especialidad — nunca
// una caja negra. baseline, promedio reciente y z-score quedan siempre a la
// vista de quien mira el panel.
export default function AlertsTable({ alert }) {
  if (!alert) {
    return <p className="empty-note">Sin datos de alerta para esta especialidad.</p>;
  }

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-cell">
          <span className="label">Baseline histórico</span>
          <span className="value num">
            {alert.baseline_mean} ± {alert.baseline_stddev}
          </span>
        </div>
        <div className="stat-cell">
          <span className="label">Promedio últimos 14d</span>
          <span className="value num">{alert.recent_avg}</span>
        </div>
        <div className="stat-cell">
          <span className="label">Z-score</span>
          <span className="value num">{alert.z_score}</span>
        </div>
      </div>
      <p className="stat-note">
        El baseline es la media diaria histórica de la especialidad (excluyendo los últimos 14 días); el z-score mide
        cuántos errores estándar se aleja el promedio reciente de esa media. |z| ≥ 2 se marca como estado anómalo.
      </p>
    </div>
  );
}
