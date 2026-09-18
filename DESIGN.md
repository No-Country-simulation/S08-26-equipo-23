---
name: HealthDemand
description: Consola de guardia para monitoreo de demanda de turnos médicos por especialidad
colors:
  ground: "#F6F7F9"
  panel: "#ECECF1"
  panel-strong: "#E1E4EA"
  border: "#D7DBE3"
  border-strong: "#B9BFCB"
  ink: "#14181F"
  ink-muted: "#545E6E"
  ink-faint: "#7A8494"
  accent: "#1F3A5F"
  accent-soft: "#E2E8F1"
  state-high: "#A2440F"
  state-high-bg: "#F6E3D4"
  state-low: "#1D5A9E"
  state-low-bg: "#DCE9F5"
  state-normal: "#3E6F4A"
  state-normal-bg: "#E2ECE3"
typography:
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  heading:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
  numeric:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontVariation: "tabular-nums"
spacing:
  row: "0.65rem 1.75rem"
  header: "0.85rem 1.75rem"
components:
  watchlist-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "{spacing.row}"
  watchlist-row-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  state-badge-high:
    backgroundColor: "{colors.state-high-bg}"
    textColor: "{colors.state-high}"
  state-badge-low:
    backgroundColor: "{colors.state-low-bg}"
    textColor: "{colors.state-low}"
  state-badge-normal:
    backgroundColor: "{colors.state-normal-bg}"
    textColor: "{colors.state-normal}"
---

# Design System: HealthDemand

## Overview

**Creative North Star: "Consola de Guardia"**

HealthDemand no es una vitrina de métricas, es una consola de guardia: una superficie que se consulta de pie, entre reuniones, para saber en segundos si algo necesita atención. El sistema toma prestada la gramática de una terminal de mercado — filas densas, numérico monoespaciado, hairlines en vez de sombras, estado por color estrictamente semántico — y la doma para un contexto clínico diurno: papel claro, no la sala de operaciones oscura con acentos neón que domina el imaginario "dashboard con IA".

El rechazo explícito es doble: ni el SaaS admin genérico (tarjetas blancas redondeadas, sidebar de hamburguesa, azul de acento) ni su opuesto predecible (terminal negra con acentos neón brillantes). Ninguno de los dos transmite la vigilancia calma que pide un responsable de planificación revisando esto a la luz del día.

**Key Characteristics:**
- Filas, no tarjetas — la especialidad es una entidad vigilada, no un objeto exhibido.
- Todo número que representa una medición vive en monoespaciado; el texto de apoyo nunca.
- Tres colores de estado, y solo tres, cargan significado semántico en toda la interfaz.
- Densidad sobre aire: el sistema prioriza que las 7 especialidades quepan en un vistazo.

## Colors

Paleta restringida (Restrained): neutros de papel/tinta + un acento navy para selección/marca, más un vocabulario semántico de tres colores exclusivo para estado.

### Primary
- **Azul de Guardia** (#1F3A5F): acento de marca, fila seleccionada, foco de teclado. Nunca se usa para estado — esa es la frontera que evita que "seleccionado" y "anómalo" se confundan.

### Neutral
- **Papel Instrumento** (#F6F7F9): fondo de página y del panel de detalle.
- **Panel Frío** (#ECECF1): cabecera, filas en hover, marco del gráfico — una capa apenas más fría que el papel, nunca por saturación de color.
- **Tinta Consola** (#14181F): texto primario.
- **Tinta Atenuada** (#545E6E): metadatos, notas, etiquetas de eje.
- **Tinta Débil** (#7A8494): encabezados de columna, texto terciario.
- **Hairline** (#D7DBE3) / **Hairline Fuerte** (#B9BFCB): todas las divisiones — nunca sombra.

### Named Rules
**La Regla del Semáforo Cerrado.** Solo tres colores llevan carga de estado en todo el sistema — ámbar (alto), azul frío (bajo), verde (normal). Ningún otro elemento de la interfaz, decorativo o no, reutiliza estos tonos.

## Typography

**Body/Heading Font:** IBM Plex Sans (system-ui, sans-serif)
**Numeric Font:** IBM Plex Mono (ui-monospace, monospace)

**Character:** una familia técnica pensada como superfamilia (Plex fue diseñada explícitamente para convivir sans + mono) — Sans para todo lo que se lee, Mono exclusivamente para todo lo que se mide.

### Hierarchy
- **Heading** (600, 1.125–1.35rem, tracking -0.02em): nombre de especialidad, título de sección.
- **Body** (400, 0.875rem): texto de apoyo, notas metodológicas, etiquetas.
- **Numeric** (Mono, tabular-nums): lectura de demanda, z-score, baseline, ejes del gráfico — cualquier cifra que representa una medición real.
- **Label** (0.7–0.75rem, uppercase, tracking 0.03–0.05em): encabezados de columna del watchlist, "SEDE".

### Named Rules
**La Regla del Monoespaciado Honesto.** Mono se usa exclusivamente para código, dato o medición — nunca como disfraz de "esto es técnico". Un párrafo de ayuda jamás va en Mono.

## Layout

Grilla de dos columnas a nivel página: watchlist (1.5fr) + panel de detalle (1fr), colapsando a una columna por debajo de 920px. El watchlist en sí es una grilla de 5 columnas de ancho fijo (especialidad 1.6fr / lectura 0.9fr / tendencia 1.1fr / z-score 0.7fr / estado 0.9fr); en vez de romper esa grilla en pantallas angostas, el componente scrollea horizontalmente dentro de su propio contenedor (`overflow-x: auto`, `min-width: 560px`) — la página nunca scrollea horizontalmente, solo esa pieza.

El encabezado (`console-header`) usa `flex-wrap` para acomodar marca + selector de sede sin recortarse en viewports angostos.

## Elevation & Depth

Sistema completamente plano. Sin sombras en ningún componente — toda separación se resuelve con hairlines (1px, `--color-border` / `--color-border-strong`) o con cambio de fondo entre `--color-ground` y `--color-panel`.

### Named Rules
**La Regla de la Sombra Cero.** Ningún `box-shadow` en el sistema. La jerarquía se lee por línea divisoria y contraste de fondo, no por elevación simulada.

## Shapes

Sin radios de borde. Todo elemento — botones de fila, badges, celdas de estadística, selects — es rectangular. Los únicos elementos circulares son el punto de 0.4rem dentro del badge de estado (`state-badge::before`) y el cuadrado de 0.6rem de la marca en el header, ambos deliberadamente geométricos, no decorativos.

## Components

### Watchlist row (signature component)
Fila-botón (`<button class="watchlist-row">`) de ancho completo: nombre de especialidad en Sans 600, lectura de 14 días en Mono grande, sparkline real (últimos 30 días agregados, no decorativo), z-score en Mono atenuado, badge de estado. Hover cambia el fondo a `--color-panel`; seleccionada usa `--color-accent-soft` de fondo y tiñe el nombre de especialidad en `--color-accent`. Foco de teclado: outline de 2px en `--color-accent`, offset negativo (queda dentro de la fila).

### State badge
Pastilla rectangular (no pill) con un punto de 0.4rem antes del texto, texto en mayúsculas 0.72rem. Tres variantes exclusivamente: `is-high` (ámbar), `is-low` (azul frío), `is-normal` (verde) — fondo suave + texto e indicador en el tono saturado correspondiente.

### Chart frame
Marco con fondo `--color-panel` y borde hairline conteniendo el `LineChart` de Recharts. Eje X e Y en Mono 10px, sin línea de eje decorativa (`axisLine={false}` en Y). Línea histórica en `--color-accent` sólida; línea proyectada en `--color-state-low` punteada (`strokeDasharray`) — nunca reutiliza los colores de alerta ámbar/verde, que están reservados al semáforo de estado.

### Stat grid
Tres celdas iguales separadas por hairline de 1px (fondo del grid = `--color-border`, celdas = `--color-ground`), mostrando baseline, promedio reciente y z-score — la transparencia estadística de cada alerta queda siempre visible, nunca oculta detrás de un solo badge.

### Site select
`<select>` nativo sin estilizar más allá de borde hairline y padding — no se reinventa el control nativo.

## Do's and Don'ts

### Do:
- **Do** usar IBM Plex Mono para toda cifra que mida algo (demanda, z-score, fechas de eje).
- **Do** mantener el watchlist como filas continuas con hairlines — es la gramática central del sistema.
- **Do** dejar que el `overflow-x` del watchlist absorba el ancho angosto en vez de reflowear sus columnas.

### Don't:
- **Don't** introducir tarjetas redondeadas ni sombras — rompe la Regla de la Sombra Cero.
- **Don't** usar ámbar, azul frío o verde para nada que no sea el estado de una alerta.
- **Don't** agregar un eyebrow/kicker sobre los títulos de sección.
- **Don't** usar sparklines decorativos sin datos reales detrás — la tendencia del watchlist siempre es la agregación real de los últimos 30 días.
