# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a **responsable de planificación** (planning/operations manager) at a multi-site medical network, managing turnos (appointments) across several specialties, sites, and time slots. Their job is to look at expected demand for an upcoming period, spot demand/capacity imbalances, and decide on staffing/schedule adjustments before saturation or underutilization happens — moving from reactive to preventive planning.

Secondary context (affects presentation, not product function): this MVP is being evaluated as part of a job-simulation program (NoCountry-style), where a real company will compare it against other competing MVPs. That audience judges credibility and polish, but the product itself is still built for the planning-manager user above — no separate "evaluator" feature set.

## Product Purpose

HealthDemand turns historical turno data (specialty, site, time slot, cancellations, no-shows, utilisation) into two complementary signals — a working statistical anomaly detector and a slot for real ML-driven demand forecasts — so a planning manager can act before a demand imbalance becomes a problem, instead of only ever seeing what already happened.

## Positioning

Most tools available to this role show historical counts only ("¿cuántos turnos tuvimos?"). HealthDemand adds two things a plain historical report can't: (1) an anomaly signal computed today, with no dependency on a data-science team, that flags when a specialty's recent demand statistically diverges from its own baseline; and (2) a documented ingestion contract ready to receive a separate ML team's real forecasts the moment they're available, without requiring dashboard rework. The two signals are shown as distinct, not blended, so the manager always knows whether they're looking at a statistical observation about the past or a genuine forecast of the future.

## Operating Context

- Multi-site medical network: 3 sedes (Sede Centro, Sede Norte, Sede Sur), 7 especialidades (Cardiología, Oftalmología, Dermatología, Neurología, Traumatología, Pediatría, Ginecología), 4 franjas horarias/día, Mon–Fri.
- Current dataset is synthetic (10,752 historical records over 180 days) — realistic in shape (peak days, seasonality, no-show rates, site capacity) but not real production data.
- Built as a 1-month MVP by a solo full-stack developer (Node/Express + React), with a separate team delivering ML predictions later; the two workstreams integrate through one HTTP contract (`POST /api/predictions/import`), not shared code or a shared database role.
- Presentation context: desktop-first. It will be judged live/via demo, screenshots, or a pitch rather than used on a phone in the field — polish should target a real desktop working session, not a responsive-everywhere build.

## Capabilities and Constraints

- Backend: Express API, raw `pg` (no ORM), PostgreSQL (Railway). Endpoints live today: `GET /api/historical` (+`/specialties`, `/sites`), `GET/POST /api/predictions` (ML ingestion, currently empty pending the ML team's delivery), `GET /api/alerts` (z-score anomaly detection over historical demand, tunable `?window=`/`?threshold=`).
- Frontend: Next.js, App Router, plain JavaScript (no TypeScript — team preference, not a hard technical constraint).
- No auth, no real-time/websocket updates, no migration framework — deliberate MVP scope cuts, not gaps to silently fix.
- No ML/forecasting logic lives in this codebase; it is explicitly out of scope for this app and owned by a separate team.

## Brand Commitments

None yet. "HealthDemand" is the working product name; no logo, palette, or prior visual identity exists — this redesign is free to establish one from scratch, subject to feeling credible for a healthcare operations context (not playful/consumer-facing).

## Evidence on Hand

- `data/historical_turns.json` / `.csv` — 10,752 synthetic records, fields: `date, dayOfWeek, weekNumber, month, specialty, site, timeSlot, timeSlotName, totalDemand, assignedTurns, unmetDemand, cancelledTurns, noShowTurns, rescheduledTurns, attendedTurns, noShowRate, occupancyRate, siteCapacity, utilisationPercent`. `unmetDemand` (solicitudes sin disponibilidad), `noShowTurns` (ausencias, separado de `cancelledTurns`) y `rescheduledTurns` se sumaron a pedido del equipo, sobre una lista de variables más amplia que todavía es solo una visión — el resto (profesional, consultorio, disponibilidad granular, intento de reserva) queda documentado pero no implementado hasta que se confirme.
- No real customer testimonials, logos, case studies, or production usage data exist — none should be fabricated or implied in the UI copy.

## Product Principles

1. **Prevención, no reporte.** Cada vista debe ayudar a decidir algo antes de que pase, no solo mostrar historia.
2. **Nunca mezclar señales.** Alertas estadísticas (hoy) y predicciones de ML (a futuro) se muestran como fuentes distintas y explícitamente rotuladas — jamás fusionadas o indistinguibles.
3. **Transparencia estadística.** Ninguna alerta es una caja negra: siempre se puede ver el baseline, el desvío y el z-score detrás del estado "alto/bajo/normal".
4. **Los ejes que importan son especialidad, sede y franja horaria.** Cualquier vista nueva debe poder cortarse por esas tres dimensiones, porque son las que la organización realmente planifica.
5. **Credibilidad a primera vista.** Es un MVP evaluado por una empresa real en minutos — la primera impresión debe leerse como producto operativo serio, no como prototipo de bootcamp.
