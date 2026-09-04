'use client';

import { useEffect, useMemo, useState } from 'react';
import Filters from '../components/Filters';
import DemandChart from '../components/DemandChart';
import AlertsTable from '../components/AlertsTable';
import SpecialtyWatchlist from '../components/SpecialtyWatchlist';
import { getHistorical, getSites, getPredictions, getAlerts } from '../lib/api';
import { groupBySpecialtyDate, seriesFor } from '../lib/aggregate';

const DIRECTION_CONTRACT = `
THESIS: El dashboard es una consola de guardia, no una vitrina — cada especialidad
es una fila que se vigila, no una tarjeta que se admira; nunca vuelve al SaaS de
tarjetas redondeadas.
OWN-WORLD: Terminal de mercado adaptado a monitoreo clínico — grilla densa,
hairlines en vez de sombras, numérico en IBM Plex Mono, IBM Plex Sans para texto,
paleta clara restringida (papel #F6F7F9, tinta #14181F, acento navy #1F3A5F,
alto #A2440F, bajo #1D5A9E, normal #3E6F4A).
STORY: El responsable de planificación entra, ve las especialidades en fila con
su lectura y estado, identifica la anómala de un vistazo, y hace clic para ver
el detalle estadístico y la proyección.
FIRST VIEWPORT: Header angosto (marca + selector de sede) seguido de inmediato
por la grilla de especialidades a ancho completo — sin hero, sin tarjetas.
FORM: Consola de Guardia — dirección asignada #5/7 (terminal de mercado);
staging: filas continuas tipo watchlist, la selección expande el detalle al lado.
`;

export default function Page() {
  const [sites, setSites] = useState([]);
  const [site, setSite] = useState('');
  const [historical, setHistorical] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    getSites().then(setSites).catch(() => setSites([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    Promise.all([
      getHistorical({ site }).then(setHistorical),
      getPredictions({ site }).then(setPredictions),
      getAlerts().then(setAlerts)
    ])
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [site, retryKey]);

  const historicalBySpecialty = useMemo(() => groupBySpecialtyDate(historical, 'total_demand'), [historical]);

  const watchlistRows = useMemo(() => {
    return alerts
      .map((alert) => ({
        specialty: alert.specialty,
        recentAvg: alert.recent_avg,
        zScore: alert.z_score,
        status: alert.anomaly_status,
        trend: seriesFor(historicalBySpecialty.get(alert.specialty), 30)
      }))
      .sort((a, b) => Math.abs(Number(b.zScore) || 0) - Math.abs(Number(a.zScore) || 0));
  }, [alerts, historicalBySpecialty]);

  useEffect(() => {
    if (!selected && watchlistRows.length > 0) {
      setSelected(watchlistRows[0].specialty);
    }
  }, [watchlistRows, selected]);

  const selectedAlert = alerts.find((a) => a.specialty === selected);
  const selectedHistorical = historical.filter((row) => row.specialty === selected);
  const selectedPredictions = predictions.filter((row) => row.specialty === selected);

  const alertCount = watchlistRows.filter((row) => row.status !== 'normal').length;

  return (
    <div className="console">
      {/* Contrato de dirección: sobrevive al build como comentario HTML real */}
      <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: `<!--${DIRECTION_CONTRACT}-->` }} />

      <header className="console-header">
        <div className="console-header-inner">
          <div className="console-brand">
            <span className="mark" aria-hidden="true" />
            <h1>HealthDemand</h1>
            <span className="tagline">Consola de guardia — demanda por especialidad</span>
          </div>

          {watchlistRows.length > 0 && (
            <div className="console-status">
              <span className="num">{watchlistRows.length}</span> especialidades monitoreadas ·{' '}
              {alertCount > 0 ? (
                <span className="num status-alert">{alertCount} en alerta</span>
              ) : (
                'sin alertas activas'
              )}
            </div>
          )}

          <Filters sites={sites} site={site} onSiteChange={setSite} />
        </div>
      </header>

      {loadError ? (
        <div className="load-error">
          <p>No se pudo conectar con la API. Verificá que el servidor esté disponible e intentá de nuevo.</p>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="console-body">
          <SpecialtyWatchlist rows={watchlistRows} selected={selected} onSelect={setSelected} />

          <div className="detail-panel">
            {selected ? (
              <>
                <div className="detail-head">
                  <h2>{selected}</h2>
                  <span className="site-context">{site || 'Todas las sedes'}</span>
                </div>
                <DemandChart historical={selectedHistorical} predictions={selectedPredictions} />
                <AlertsTable alert={selectedAlert} />
              </>
            ) : (
              <p className="empty-note">{loading ? 'Cargando demanda…' : 'Sin datos disponibles.'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
