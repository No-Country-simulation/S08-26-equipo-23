'use client';

export default function Filters({
  neighborhoods,
  neighborhood,
  onNeighborhoodChange,
  from,
  to,
  onFromChange,
  onToChange,
  minDate,
  maxDate
}) {
  return (
    <div className="filters">
      <label className="site-select">
        Barrio
        <select value={neighborhood} onChange={(e) => onNeighborhoodChange(e.target.value)}>
          <option value="">Todas</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="site-select">
        Desde
        <input
          type="date"
          className="num"
          value={from || ''}
          min={minDate}
          max={maxDate}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </label>

      <label className="site-select">
        Hasta
        <input
          type="date"
          className="num"
          value={to || ''}
          min={minDate}
          max={maxDate}
          onChange={(e) => onToChange(e.target.value)}
        />
      </label>
    </div>
  );
}
