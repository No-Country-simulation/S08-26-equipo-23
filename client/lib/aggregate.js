// Agrupa filas crudas de /api/historical o /api/predictions por especialidad
// y fecha, sumando el campo indicado a través de sedes y franjas horarias.
export function groupBySpecialtyDate(rows = [], valueKey) {
  const bySpecialty = new Map();
  for (const row of rows) {
    const specialty = row.specialty;
    if (!bySpecialty.has(specialty)) bySpecialty.set(specialty, new Map());
    const byDate = bySpecialty.get(specialty);
    const date = row.date;
    byDate.set(date, (byDate.get(date) || 0) + Number(row[valueKey] || 0));
  }
  return bySpecialty;
}

// Serie ordenada por fecha para una especialidad, últimos `days` puntos.
export function seriesFor(byDate, days = 30) {
  if (!byDate) return [];
  const points = Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  return points.slice(-days);
}
