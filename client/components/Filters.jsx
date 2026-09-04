'use client';

export default function Filters({ sites, site, onSiteChange }) {
  return (
    <label className="site-select">
      Sede
      <select value={site} onChange={(e) => onSiteChange(e.target.value)}>
        <option value="">Todas</option>
        {sites.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
