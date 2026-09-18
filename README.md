# HealthDemand — Sistema de Predicción y Gestión de Demanda de Turnos

Plataforma de análisis predictivo diseñada para anticipar la demanda de turnos médicos en centros de salud, usando datos históricos sintéticos contextualizados localmente para detectar picos de demanda, optimizar la asignación de profesionales y reducir tanto la saturación como la subutilización de recursos.

**Stack:**
- **Equipo de ML / Data Science:** Python, Pandas, Scikit-Learn — modelado y generación de las predicciones de demanda.
- **Backend:** Node.js + Express (API), PostgreSQL (Railway).
- **Frontend:** Next.js + React, JS plano sin TypeScript (dashboard).

**Dataset actual:** dataset sintético pero realista, agregado por día, barrio de Buenos Aires y especialidad (`data/healthdemand_buenos_aires.xlsx`) — generado con estacionalidad argentina y perfiles socioeconómicos reales de CABA, no datos medidos de una clínica real. Ver [sección 3](#3-qué-datos-usa-hoy).

Documentación relacionada: [PRODUCT.md](PRODUCT.md) (spec de producto, usuarios, posicionamiento) y [DESIGN.md](DESIGN.md) (sistema de diseño). Este archivo es el punto de entrada único para todo lo demás: problema de negocio, arquitectura, cómo levantar el proyecto, y contrato para el equipo de ML.

---

## Objetivo del negocio

Transformar la planificación médica de un enfoque **reactivo** ("¿cuántos pacientes tuvimos?") a uno **preventivo** ("¿cuántos esperamos y cómo nos preparamos?"), permitiendo:
- Anticipar incrementos de demanda por especialidad y barrio.
- Reducir listas de espera mediante overbooking inteligente basado en tasas de ausentismo.
- Optimizar costos operativos evitando recursos ociosos.

---

## 1. ¿Qué problema resuelve?

Una red de centros médicos brinda atención a pacientes a través de diferentes especialidades, barrios y niveles socioeconómicos. Cada día, la organización debe administrar una gran cantidad de turnos médicos, considerando variables como especialidad, día de la semana, turnos disponibles/asignados, cancelaciones, ausencias y demanda histórica.

La capacidad de atención depende directamente de una correcta planificación de estos recursos, pero la demanda de pacientes no es uniforme: una especialidad puede tener demanda elevada ciertos días o temporadas, mientras otra tiene el comportamiento opuesto. Hoy esa planificación se hace principalmente con históricos simples, experiencia y estimaciones manuales — la organización no necesariamente cuenta con una herramienta que le permita anticipar la demanda futura.

El problema no está únicamente en conocer cuántos turnos se asignaron en el pasado, sino en poder responder:

> ¿Cuántos pacientes esperamos recibir, para qué especialidades, en qué barrios y cuándo, y qué capacidad necesitamos preparar?

### Dolor del negocio

- **Falta de previsión**: se conoce el histórico, pero no se puede estimar con precisión qué va a pasar en los próximos días o semanas — picos por especialidad, diferencias entre barrios, aumento de cancelaciones/ausencias.
- **Sobrecarga o subutilización de recursos**: subestimar la demanda satura profesionales y alarga esperas; sobreestimarla deja consultorios y turnos sin usar, con costo operativo innecesario. El desafío no es "aumentar capacidad", es equilibrar demanda esperada contra capacidad disponible.
- **Dificultad para identificar patrones**: cuando los datos viven solo en planillas o sistemas transaccionales, detectar comportamientos recurrentes depende del análisis manual y la experiencia de quien planifica.
- **Gestión reactiva**: sin herramienta predictiva, las decisiones se toman cuando el problema ya empezó ("se detecta saturación → se intenta conseguir más disponibilidad") en vez de anticiparse ("se espera un incremento → se ajusta la disponibilidad antes de que sature").

### Oportunidad

Transformar los datos históricos en una herramienta que permita anticipar la demanda y decidir antes de que ocurran los desbalances de capacidad:

```
Datos históricos → Análisis de patrones → Predicción de demanda → Comparación con capacidad → Alertas → Planificación de recursos
```

### Criterio de éxito

El proyecto es exitoso si un responsable de planificación puede entrar al sistema y, a partir de los datos disponibles, conocer la demanda esperada para un período futuro, identificar desbalances entre demanda y capacidad, y decidir antes de que se produzca la saturación o subutilización. En concreto: pasar de **"¿Cuántos turnos tuvimos?"** a **"¿Cuántos turnos esperamos tener, dónde se va a concentrar la demanda, y qué tenemos que hacer para estar preparados?"**

---

## 2. Arquitectura — qué hace cada pieza

El flujo de datos es una cadena de piezas, cada una alimenta a la siguiente:

```
data/healthdemand_buenos_aires.xlsx  →  load-xlsx-to-postgresql.js  →  PostgreSQL (Railway)  →  server/ (API)  →  client/ (dashboard)
     (dataset sintético realista)             (lo carga a la base)                                  (lo expone HTTP)    (lo muestra)
```

| Pieza | Qué es | Ubicación |
|---|---|---|
| Dataset | Datos sintéticos pero realistas de demanda de turnos por día, barrio y especialidad (ver sección 3) | `data/healthdemand_buenos_aires.xlsx` |
| Loader | Lee el xlsx y carga/recrea las tablas en Postgres | `load-xlsx-to-postgresql.js` (raíz) |
| API | Expone los datos por HTTP: histórico, alertas, predicciones | `server/` |
| Dashboard | Consume la API y muestra gráficos + watchlist de alertas | `client/` |

**Nota**: `generate-medical-data.js`, `load-to-postgresql.js` y `load-to-mongodb.js` generaban un dataset sintético anterior, más arbitrario. Quedan en el repo como referencia, pero **ya no son el camino activo** — lo reemplazó `data/healthdemand_buenos_aires.xlsx`.

La lógica de predicción con Machine Learning **no vive en este proyecto**. La hace otro equipo por separado y se conecta acá mediante un único endpoint (`POST /api/predictions/import`, ver sección 6). HealthDemand no genera predicciones, las recibe y las muestra.

---

## 3. ¿Qué datos usa hoy?

Dataset sintético pero realista (`data/healthdemand_buenos_aires.xlsx`) — generado por el equipo de datos con estacionalidad argentina (picos de gripe en invierno, alergias en primavera, baja en vacaciones de verano) y perfiles socioeconómicos reales de CABA, no turnos que realmente ocurrieron: un registro por combinación de **día + barrio + especialidad**, sin franja horaria. **69.100 registros**, enero 2024 a diciembre 2025 (~2 años).

- **10 barrios de CABA**: Palermo, Recoleta, Belgrano, Caballito, Almagro, Flores, La Boca, Villa Crespo, Constitución, Nuñez — cada uno con un nivel socioeconómico fijo (alto/medio-alto/medio/medio-bajo/bajo-medio/bajo).
- **10 especialidades**: Cardiología, Pediatría, Dermatología, Traumatología, Alergología, Neumonología, Gastroenterología, Psicología, Oftalmología, Clínica Médica.

Por cada registro se guarda:

| Campo (DB, inglés) | Columna original del xlsx | Qué significa |
|---|---|---|
| `date`, `day_of_week`, `day_number`, `month`, `year`, `is_holiday` | `fecha`, `dia_semana`, `numero_dia_semana`, `mes`, `año`, `es_feriado` | Cuándo |
| `neighborhood` | `barrio` | Barrio de CABA |
| `specialty` | `especialidad` | Especialidad médica |
| `available_slots` | `turnos_disponibles` | Cupos ofrecidos ese día |
| `assigned_turns` | `turnos_asignados` | Turnos otorgados |
| `attended_turns` | `turnos_atendidos` | Efectivamente atendidos |
| `unmet_demand` | `demanda_no_atendida` | Pedidos sin disponibilidad |
| `cancelled_turns` | `cancelaciones` | Cancelado por el paciente (proactivo) |
| `no_show_turns` | `ausencias` | No vino y no avisó |
| `no_show_rate`, `occupancy_rate` | `tasa_ausentismo`, `ocupacion` | Tasas ya calculadas |
| `saturation_level` | `nivel_saturacion` | Alto/Medio/Bajo, precalculado por el equipo de datos — **informativo, no alimenta las alertas** (ver sección 5) |
| `season_factor` | `factor_temporada` | Factor estacional |

`total_demand` no es una columna del xlsx — se reconstruye en la consulta SQL como `assigned_turns + unmet_demand` (demanda total = lo que se asignó + lo que no se pudo atender), igual criterio que usaba el dataset sintético anterior.

Además hay una tabla `predictions` (vacía por defecto), pensada para que el equipo de ML cargue ahí sus proyecciones futuras.

**Ideas a futuro, no implementadas**: sumar `profesional` y `consultorio` como nuevas dimensiones, lista de espera, intento de reserva — quedó como visión, no confirmada; implicaría sumar dos dimensiones nuevas y repensar la consola, no es un cambio chico.

---

## 4. Cómo levantar el proyecto

### Requisitos
- Node.js v18+.
- La `DATABASE_URL` pública de Railway (se comparte por fuera del repo — **nunca va a git**).

### Pasos
1. Clonar el repo.
2. Crear `.env.local` en la raíz **y** `server/.env.local`, ambos con:
   ```
   DATABASE_URL="postgresql://postgres:<password>@<host>.proxy.rlwy.net:<puerto>/railway"
   ```
   (usar la URL **pública** de Railway — la que viene por default en las variables del plugin solo resuelve dentro de la red interna de Railway; hay que habilitar "Public Networking" y usar `DATABASE_PUBLIC_URL`).
3. Instalar dependencias:
   ```bash
   npm install               # raíz (incluye xlsx y concurrently)
   cd server && npm install
   cd ../client && npm install
   ```
4. Levantar todo junto desde la raíz:
   ```bash
   npm run dev   # server en :4000 + client en :3000
   ```
   (o por separado, en dos terminales: `cd server && npm run dev` / `cd client && npm run dev`).

La base ya tiene los 69.100 registros cargados — no hace falta correr el loader de nuevo salvo que se actualice el dataset:

```bash
npm run load-xlsx   # ⚠️ dropea y recrea neighborhoods/specialties/historical_turns
```

---

## 5. Cómo usar la consola

- **Cada fila del watchlist es una especialidad.** "Lectura 14D" es el promedio de demanda diaria (`assigned_turns + unmet_demand`) de las últimas dos semanas, agregando los barrios que estén filtrados.
- **"Tendencia"** es la evolución real de los últimos 30 días — no es decorativo, son los mismos datos del gráfico de detalle.
- **"Z-score"** mide qué tan lejos está la lectura reciente del comportamiento histórico normal de esa especialidad (y barrio, si hay uno filtrado). Cerca de 0 = normal; cuanto más lejos, más raro.
- **"Estado"** (Normal / Alto / Bajo) es el resultado automático de ese z-score.
- **Clic en una fila** abre el detalle a la derecha: gráfico de demanda histórica (+ proyección, cuando el equipo de ML entregue resultados) y el desglose estadístico completo (baseline, desvío, z-score) — ninguna alerta es una caja negra.
- **El selector de barrio** filtra todo el panel (histórico, predicciones y alertas) a un barrio puntual; "Todos" agrega los 10.

### Alertas (z-score) vs. Predicciones (ML) — no son lo mismo

| | Alertas (`/api/alerts`) | Predicciones (`/api/predictions`) |
|---|---|---|
| Pregunta que responde | ¿La demanda reciente es rara comparada con el historial? | ¿Cuánta demanda vamos a tener a futuro? |
| Mira hacia | Atrás (pasado) | Adelante (futuro) |
| Quién lo calcula | Estadística simple (SQL, z-score) sobre datos ya cargados | El equipo de ML, por separado |
| Alimenta | La tabla/watchlist de alertas | La línea "Proyectada" del gráfico |

El sistema de alertas es el **diferencial propio del producto**: detecta especialidades con demanda anormal ya mismo, sin depender de que el equipo de ML entregue nada — no lo reemplaza, conviven como señales distintas y nunca se mezclan. El xlsx trae un campo `nivel_saturacion` precalculado por el equipo de datos, pero **decisión tomada**: no reemplaza el z-score propio, se muestra aparte como dato informativo (ver sección 3).

**Cómo funciona el z-score:** por cada especialidad (y barrio filtrado), se compara el promedio de demanda de los últimos 14 días contra el promedio histórico de esa misma especialidad (excluyendo esos 14 días), usando **error estándar** (`stddev / √n`), no el desvío crudo — con el cálculo ingenuo casi nunca se disparaba una alerta real. Si la diferencia supera el umbral (default: 2 errores estándar) se marca `high`/`low`. Ajustable con `/api/alerts?window=` (días) y `?threshold=` (desvíos).

---

## 6. Contrato para el equipo de ML

No necesitan levantar nada del proyecto ni tener el código — solo mandar un `POST` a `/api/predictions/import`:

```json
{
  "modelVersion": "v1",
  "predictions": [
    {
      "date": "2026-09-10",
      "specialty": "Cardiología",
      "neighborhood": "Palermo",
      "predictedDemand": 28.5,
      "confidence": 0.82
    }
  ]
}
```

- `specialty` debe ser una de las 10 existentes, `neighborhood` uno de los 10 barrios (ver `GET /api/historical/specialties` y `GET /api/historical/neighborhoods` para la lista exacta — ambos parámetros aceptan mayúsculas/minúsculas indistintamente).
- Reenviar el mismo `date`+`specialty`+`neighborhood`+`modelVersion` actualiza el valor en vez de duplicar (es seguro reintentar).
- En cuanto haya filas ahí, la línea "Proyectada" del dashboard aparece sola — no hace falta tocar el frontend.

**⚠️ Cambio de contrato (2026-09):** este endpoint antes usaba `site` + `timeSlot` (esquema del dataset sintético viejo, sin anclaje real). Con la migración al dataset sintético nuevo por barrio, `site` pasó a llamarse `neighborhood` y `timeSlot` se eliminó por completo (el dataset nuevo es uno por día, sin franja horaria). Si el equipo de ML ya tenía integrado el contrato viejo, hay que avisarles.

**Ejemplo en Python:**
```python
import requests

url = "http://localhost:4000/api/predictions/import"  # cambiar por la URL pública cuando el server esté deployado

payload = {
    "modelVersion": "v1",
    "predictions": [
        {
            "date": "2026-09-10",
            "specialty": "Cardiología",
            "neighborhood": "Palermo",
            "predictedDemand": 28.5,
            "confidence": 0.82
        },
        # ... una entrada por cada (fecha, especialidad, barrio) predicha
    ]
}

response = requests.post(url, json=payload)
print(response.status_code, response.json())  # {"imported": N, "modelVersion": "v1"}
```
Si su modelo trabaja con pandas, `df.to_dict("records")` (ajustando nombres de columna) arma la lista directo.

**Más fácil todavía:** `submit-predictions.py` en la raíz del repo hace toda la limpieza — valida los campos, avisa si un nombre de especialidad/barrio no matchea, y manda en lotes. Solo hace falta `pip install requests` y llamar a `submit_predictions(sus_predicciones)`.

---

**Equipo S08-26-Equipo-23**
