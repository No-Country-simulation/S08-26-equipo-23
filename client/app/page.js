'use client';

import { useEffect, useMemo, useState } from 'react';
import Filters from '../components/Filters';
import DemandChart from '../components/DemandChart';
import AlertsTable from '../components/AlertsTable';
import SpecialtyWatchlist from '../components/SpecialtyWatchlist';
import { getHistorical, getNeighborhoods, getPredictions, getAlerts, getDateRange } from '../lib/api';
import { groupBySpecialtyDate, seriesFor } from '../lib/aggregate';

// Suma/resta días a una fecha 'YYYY-MM-DD' en UTC, sin depender del huso
// horario del navegador (evita que new Date('2025-12-31') + setDate local
// corra la fecha un día para atrás/adelante según la zona).
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [neighborhood, setNeighborhood] = useState('');
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [historical, setHistorical] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    getNeighborhoods().then(setNeighborhoods).catch(() => setNeighborhoods([]));
    getDateRange()
      .then(({ minDate: min, maxDate: max }) => {
        setMinDate(min || '');
        setMaxDate(max || '');
      })
      .catch(() => {});
  }, []);

  // Default de rango: acota el payload inicial a los últimos 90 días en vez
  // de las 69.100 filas sin filtrar. Solo se aplica una vez, cuando llega
  // maxDate y el usuario todavía no tocó los inputs de fecha — no vuelve a
  // pisar una selección manual en renders posteriores.
  useEffect(() => {
    if (maxDate && !from && !to) {
      setTo(maxDate);
      setFrom(addDays(maxDate, -90));
    }
  }, [maxDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    Promise.all([
      getHistorical({ neighborhood, from, to }).then(setHistorical),
      getPredictions({ neighborhood, from, to }).then(setPredictions),
      getAlerts({ neighborhood }).then(setAlerts)
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
  }, [neighborhood, from, to, retryKey]);

  // Ancla real de la ventana de alertas: alerts.js NO usa "hoy" del reloj,
  // usa MAX(date) de historical_turns — este cálculo debe reflejar el mismo
  // default de 14 días (`window`) que ese endpoint. Si ese default cambia,
  // actualizar también acá.
  const alertWindowStart = maxDate ? addDays(maxDate, -13) : '';

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

          <Filters
            neighborhoods={neighborhoods}
            neighborhood={neighborhood}
            onNeighborhoodChange={setNeighborhood}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>

        {maxDate && (
          <div className="console-meta">
            <span>
              Mostrando datos: <span className="num">{from}</span> – <span className="num">{to}</span>
            </span>
            <span>
              Ventana de alerta: <span className="num">{alertWindowStart}</span> – <span className="num">{maxDate}</span>{' '}
              (no es relativa a hoy — se ancla al último dato cargado)
            </span>
          </div>
        )}
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
                  <span className="site-context">{neighborhood || 'Todos los barrios'}</span>
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
