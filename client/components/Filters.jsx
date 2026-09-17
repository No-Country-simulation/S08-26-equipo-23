'use client';

export default function Filters({ neighborhoods, neighborhood, onNeighborhoodChange }) {
  return (
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
  );
}
