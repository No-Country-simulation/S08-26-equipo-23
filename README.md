# HealthDemand

Plataforma de análisis y predicción de demanda médica que utiliza datos históricos de turnos para anticipar necesidades futuras, detectar picos de demanda y facilitar la planificación de profesionales, agendas y recursos.

**Stack:** Node.js + Express (API) · PostgreSQL (Railway) · Next.js + React, JS plano sin TypeScript (dashboard) · predicciones de demanda a cargo de un modelo de ML independiente.

**Dataset actual:** datos reales agregados por día, barrio de Buenos Aires y especialidad (`data/healthdemand_buenos_aires.xlsx`) — no sintéticos. Ver [sección 3](#3-qué-datos-usa-hoy).

Documentación relacionada: [PRODUCT.md](PRODUCT.md) (spec de producto, usuarios, posicionamiento) y [DESIGN.md](DESIGN.md) (sistema de diseño). Este archivo es el punto de entrada único para todo lo demás: problema de negocio, arquitectura, cómo levantar el proyecto, contrato para el equipo de ML, y decisiones/pendientes.

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
        (dataset real)                      (lo carga a la base)                                  (lo expone HTTP)    (lo muestra)
```

| Pieza | Qué es | Ubicación |
|---|---|---|
| Dataset | Datos reales de demanda de turnos por día, barrio y especialidad (ver sección 3) | `data/healthdemand_buenos_aires.xlsx` |
| Loader | Lee el xlsx y carga/recrea las tablas en Postgres | `load-xlsx-to-postgresql.js` (raíz) |
| API | Expone los datos por HTTP: histórico, alertas, predicciones | `server/` |
| Dashboard | Consume la API y muestra gráficos + watchlist de alertas | `client/` |

**Nota sobre el dataset sintético anterior**: `generate-medical-data.js`, `load-to-postgresql.js` y `load-to-mongodb.js` (este último nunca estuvo en uso) generaban y cargaban un dataset sintético (7 especialidades × 3 sedes × 4 franjas horarias × 180 días). Quedan en el repo como referencia/utilidad de testing, pero **ya no son el camino activo** — el dataset real de `data/healthdemand_buenos_aires.xlsx` los reemplazó.

La lógica de predicción con Machine Learning **no vive en este proyecto**. La hace otro equipo por separado y se conecta acá mediante un único endpoint (`POST /api/predictions/import`, ver sección 6). HealthDemand no genera predicciones, las recibe y las muestra.

---

## 3. ¿Qué datos usa hoy?

Dataset real (`data/healthdemand_buenos_aires.xlsx`): un registro por combinación de **día + barrio + especialidad**, sin franja horaria. **69.100 registros**, enero 2024 a diciembre 2025 (~2 años).

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

**⚠️ Cambio de contrato (2026-09):** este endpoint antes usaba `site` + `timeSlot` (esquema del dataset sintético viejo). Con la migración al dataset real por barrio, `site` pasó a llamarse `neighborhood` y `timeSlot` se eliminó por completo (el dataset nuevo es uno por día, sin franja horaria). Si el equipo de ML ya tenía integrado el contrato viejo, hay que avisarles.

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

---

## 7. Decisiones y bugs corregidos (para que quede el porqué)

### Migración al dataset real (2026-09)
- **Barrio reemplaza sede, sin franja horaria**: el dataset nuevo viene agregado por día+barrio+especialidad (no por sede+franja horaria). Se decidió mantener la convención de nombres en inglés que ya tenía el código (se traduce cada columna española al cargar) en vez de adoptar los nombres del xlsx tal cual.
- **Se mantiene el z-score propio en vez de `nivel_saturacion`**: el xlsx trae un campo precalculado por el equipo de datos, pero se decidió no reemplazar el detector estadístico propio del backend — es el diferencial de producto documentado en PRODUCT.md. `saturation_level` se guarda aparte, solo informativo.
- **`total_demand` se calcula en SQL** (`assigned_turns + unmet_demand`) en vez de ser columna física — así el frontend no necesitó tocar `aggregate.js` ni los componentes de gráfico/alertas.
- **Tabla `predictions` con esquema viejo**: `ensureSchema.js` usa `CREATE TABLE IF NOT EXISTS`, que no migra una tabla ya existente. La tabla `predictions` en Railway seguía con `site`/`time_slot` del esquema anterior (vacía, 0 filas) y tiraba `column "neighborhood" does not exist`. Se dropeó manualmente (sin pérdida de datos) para que se recreara con el esquema nuevo en el siguiente arranque.
- **`getAlerts()` no pasaba el filtro de barrio**: el panel de alertas/watchlist siempre mostraba el agregado de los 10 barrios juntos, aunque hubiera un barrio filtrado en el selector — el gráfico e histórico sí respetaban el filtro, las alertas no. Bug preexistente (pasaba lo mismo con "sede" antes), corregido pasando `{ neighborhood }` a `getAlerts` en `page.js`.
- **Filtros case-sensitive**: `specialty`/`neighborhood` en `historical.js`, `alerts.js` y `predictions.js` comparaban con `=` exacto (Postgres es case-sensitive por default) — `caballito` no matcheaba `Caballito`. Se cambió a `ILIKE` en los tres endpoints.

### Del dataset sintético original
- **Orden de creación de tablas**: `load-to-postgresql.js` creaba `historical_turns` (con FKs) antes que las tablas referenciadas — se invirtió el orden.
- **Carga fila por fila → batches**: 10.752 `INSERT`s individuales contra la base remota se cortaban a mitad de camino por el proxy público de Railway — se cambió a lotes de 1000.
- **Manejo de corte de conexión**: listener de error en el cliente de Postgres para que un corte de red no tire abajo el proceso sin aviso.
- **Cálculo de z-score**: la primera versión comparaba contra el desvío estándar diario crudo sin ajustar por tamaño de muestra — casi nunca disparaba una alerta real. Se corrigió con error estándar (`stddev / √n`).
- **Sin manejo de error en el dashboard**: si la API no respondía, el panel quedaba en "Cargando…" para siempre. Ahora muestra error + botón "Reintentar".
- **Copy que exponía proceso interno**: el gráfico decía "Proyectada — a la espera de predicciones del equipo de ML" — lenguaje interno que no debería ver alguien externo evaluando el MVP. Se cambió a "sin datos disponibles todavía".

---

## 8. Pendiente / decisiones abiertas

- **Performance de `/api/historical` sin filtrar**: el estado por defecto ("Todos los barrios") pide las 69.100 filas crudas (~31.5MB, ~3s en localhost). El frontend solo necesita sumas por especialidad+fecha para los sparklines, no cada columna de cada fila — conviene agregarlo en SQL antes de una demo con conexión real (no loopback).
- **Repo sin remoto / sin deploy**: todo corre en `localhost` hoy. Si la presentación necesita una URL pública en vez de demo en vivo desde la máquina de origen, falta desplegar `client/` (ej. Vercel) y `server/` (ej. Railway).
- **Acceso a la base**: solo existe el usuario `postgres` (superusuario). Está propuesto un usuario de solo lectura para analistas — no es necesario si el equipo de ML solo consume la API (sección 6), no necesitan tocar la base directo.
- **Vulnerabilidad conocida en `xlsx` (SheetJS)**: `npm audit` marca un "high" (prototype pollution / ReDoS) sin parche publicado en el registro de npm — riesgo bajo hoy porque solo se usa en `load-xlsx-to-postgresql.js`, un script local que lee un archivo de confianza, no expuesto a input de usuarios por HTTP.
- **Regeneración del dataset sintético**: `generate-medical-data.js` genera fechas relativas al día en que se corre — no es el camino activo, pero si se vuelve a usar como fixture de testing, tenerlo en cuenta.
- **Sin tests automatizados**: no hay suite de tests en `server/` ni `client/`. No bloqueante para un MVP de 1 mes, pero vale nombrarlo si el criterio de evaluación le da peso a eso.
- **Variables de la visión del equipo, todavía sin confirmar**: `profesional`, `consultorio`, `profesionales_disponibles`, `consultorios_disponibles`, `horas_disponibles`, `cupos_disponibles`, `lista_de_espera`, `intento_de_reserva`. Implica sumar dos dimensiones nuevas y repensar la consola — se encara como su propia etapa si el equipo lo confirma.

---

**HealthDemand — MVP construido en un programa tipo NoCountry, evaluado por una empresa real.**
