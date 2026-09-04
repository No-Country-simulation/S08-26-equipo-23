# HealthDemand — Documentación técnica

Este documento explica qué se construyó, por qué, y cómo trabajar con el proyecto en equipo. El [README.md](README.md) describe el problema de negocio; este archivo describe la implementación.

## 1. Resumen: qué hace cada pieza

El flujo de datos es una cadena de 4 eslabones, cada uno alimenta al siguiente:

```
generate-medical-data.js  →  load-to-postgresql.js  →  server/ (Express API)  →  client/ (Next.js dashboard)
   (genera datos)              (los sube a Postgres)      (los expone por HTTP)     (los muestra)
```

| Pieza | Qué es | Ubicación |
|---|---|---|
| Generador de datos | Crea 10.752 registros sintéticos de turnos (7 especialidades × 3 sedes × 4 franjas horarias × 180 días) | `generate-medical-data.js` (raíz) |
| Loader a Postgres | Lee esos datos y los carga a la base Postgres de Railway | `load-to-postgresql.js` (raíz) |
| API | Expone los datos por HTTP: histórico, alertas, predicciones | `server/` |
| Dashboard | Consume la API y muestra gráficos + tabla de alertas | `client/` |

## 2. Cómo usar la consola

Para quien la va a mirar o mostrar, no solo para quien la programa.

- **Cada fila es una especialidad.** "Lectura 14D" es el promedio de turnos diarios de las últimas dos semanas.
- **"Tendencia"** es la evolución real de los últimos 30 días de esa especialidad — no es un dibujo decorativo, son los mismos datos del gráfico de detalle.
- **"Z-score"** mide qué tan lejos está la lectura reciente del comportamiento histórico normal de esa especialidad. Cerca de 0 = normal; cuanto más lejos, más raro.
- **"Estado"** (Normal / Alto / Bajo) es el resultado automático de ese z-score — no hace falta interpretarlo a ojo.
- **Hacer clic en una fila** abre el detalle a la derecha: el gráfico de demanda histórica (y, cuando el equipo de ML entregue resultados, la proyección) más el desglose estadístico completo detrás del estado (baseline, desvío, z-score) — la idea es que ninguna alerta sea una caja negra.
- **El resumen arriba de todo** ("N especialidades monitoreadas · M en alerta") dice de un vistazo si hace falta mirar algo con más atención antes de entrar a ver fila por fila.
- **El selector de sede** filtra todo el panel a una sede puntual; "Todas" agrega las tres.

## 3. Alertas (z-score) vs. Predicciones (ML) — no son lo mismo

Esto genera confusión así que quede escrito clarito:

| | Alertas (`/api/alerts`) | Predicciones (`/api/predictions`) |
|---|---|---|
| Pregunta que responde | ¿La demanda reciente es rara comparada con el historial? | ¿Cuánta demanda vamos a tener a futuro? |
| Mira hacia | Atrás (pasado) | Adelante (futuro) |
| Quién lo calcula | Estadística simple (SQL, z-score) sobre datos ya cargados | El equipo de ML (Python), entrega la semana del 9/9/2026 |
| Estado actual | Funcionando, con los 10.752 registros ya cargados | Tabla vacía, lista para recibir el resultado del equipo de ML |
| Alimenta | La tabla de alertas del dashboard | La línea "Proyectada" del gráfico |

El sistema de alertas es un **sustituto temporal**: cumple "detectar especialidades con demanda anormal" ya mismo, sin depender de que el equipo de ML entregue nada. No reemplaza su trabajo — son features distintas que conviven.

**Cómo funciona el z-score:** por cada especialidad, se compara el promedio de demanda de los últimos 14 días contra el promedio histórico de esa misma especialidad (excluyendo esos 14 días). Si la diferencia supera cierto umbral (default: 2 desvíos estándar), se marca como `high` o `low`. Con el dataset sintético actual no hay ninguna especialidad realmente anormal (el generador no simula picos), por eso todo da "normal" al umbral default — es esperable, no un bug. Se puede ajustar con `/api/alerts?threshold=1.5` para ver el detector en acción con datos más sensibles.

## 4. Cómo levantar el proyecto (para cualquiera del equipo)

### Requisitos
- Node.js instalado (v18+).
- La `DATABASE_URL` pública de Railway (te la paso yo aparte — **nunca va en git**).

### Pasos
1. Clonar el repo.
2. Crear `.env.local` en la raíz y `server/.env.local`, ambos con:
   ```
   DATABASE_URL="postgresql://postgres:<password>@reseau.proxy.rlwy.net:45800/railway"
   ```
3. Instalar dependencias:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```
4. Levantar cada parte (en terminales separadas):
   ```bash
   cd server && npm run dev    # API en http://localhost:4000
   cd client && npm run dev    # Dashboard en http://localhost:3000
   ```

La base de datos ya tiene los 10.752 registros cargados — no hace falta correr `load-to-postgresql.js` de nuevo salvo que quieras regenerar el dataset (`npm run generate` en la raíz, después `node load-to-postgresql.js`; esto **borra y recarga** `historical_turns`, no toca `predictions`).

## 5. Contrato para el equipo de ML

No necesitan levantar nada del proyecto ni tener el código — solo mandar un `POST` a `/api/predictions/import` con este formato:

```json
{
  "modelVersion": "v1",
  "predictions": [
    {
      "date": "2026-09-10",
      "specialty": "Cardiología",
      "site": "Sede Centro",
      "timeSlot": "08:00-10:00",
      "predictedDemand": 28.5,
      "confidence": 0.82
    }
  ]
}
```
- `specialty` debe ser una de las 7 existentes, `site` una de las 3 sedes (ver `/api/historical/specialties` y `/sites` para la lista exacta).
- Reenviar el mismo `date`+`specialty`+`site`+`timeSlot`+`modelVersion` actualiza el valor en vez de duplicar (es seguro reintentar).
- En cuanto haya filas ahí, la línea "Proyectada" del dashboard aparece sola — no hace falta tocar el frontend.

**Ejemplo en Python** (para pasarle tal cual al equipo de ML):
```python
import requests

url = "http://localhost:4000/api/predictions/import"  # cambiar por la URL pública cuando el server esté deployado

payload = {
    "modelVersion": "v1",
    "predictions": [
        {
            "date": "2026-09-10",
            "specialty": "Cardiología",
            "site": "Sede Centro",
            "timeSlot": "08:00-10:00",
            "predictedDemand": 28.5,
            "confidence": 0.82
        },
        # ... una entrada por cada (fecha, especialidad, sede, franja) predicha
    ]
}

response = requests.post(url, json=payload)
print(response.status_code, response.json())  # {"imported": N, "modelVersion": "v1"}
```
Si su modelo trabaja con pandas, `df.to_dict("records")` (ajustando nombres de columna) arma la lista directo.

## 6. Decisiones y bugs corregidos (para que quede el porqué)

- **Orden de creación de tablas**: `load-to-postgresql.js` creaba `historical_turns` (con foreign keys a `specialties`/`sites`) antes de crear esas tablas. Se invirtió el orden.
- **Carga fila por fila**: el script original hacía 10.752 `INSERT`s individuales contra la base remota — se cortaba a mitad de camino por el proxy público de Railway. Se cambió a inserts en lotes de 1000 (11 queries en vez de 10.752).
- **Manejo de corte de conexión**: se agregó un listener de error en el cliente de Postgres para que un corte de red no tire abajo todo el proceso sin aviso.
- **Cálculo de z-score**: la primera versión comparaba el promedio de 14 días contra el desvío estándar diario crudo, sin ajustar por el tamaño de la muestra — esto haría que el detector casi nunca disparase una alerta real. Se corrigió dividiendo por `√14` (error estándar de la media).
- **URL pública vs. privada de Railway**: `.env.local` viene por default con variables que solo resuelven *dentro* de la red de Railway (`RAILWAY_PRIVATE_DOMAIN`). Para conectar desde afuera hace falta habilitar "Public Networking" en Railway y usar la `DATABASE_PUBLIC_URL` que eso genera.
- **Sin manejo de error en el dashboard**: si la API no respondía (pasó una vez con el proxy de Railway), el panel se quedaba mostrando "Cargando…" para siempre, sin avisar nada. Ahora muestra un mensaje claro con botón "Reintentar".
- **Copy que exponía proceso interno**: el gráfico decía "Proyectada — a la espera de predicciones del equipo de ML", lenguaje de equipo que no debería verlo alguien externo evaluando el MVP. Se cambió a "sin datos disponibles todavía".
- **README.md desincronizado**: en algún momento el README de la raíz quedó reemplazado solo por la documentación técnica del generador de datos, sin la descripción del problema de negocio. Se fusionó todo — nada se perdió, ver el README actual.
- **3 campos nuevos en el dataset**: el equipo propuso una lista amplia de variables (`profesional`, `consultorio`, disponibilidad granular, `intento_de_reserva`, etc.) — todavía es una visión, no confirmada. De esa lista se implementaron solo las tres más baratas y de mayor valor, sin agregar ninguna dimensión nueva: `unmetDemand`/`unmet_demand` (solicitudes sin disponibilidad — antes era un hueco implícito sin nombre), `rescheduledTurns`/`rescheduled_turns` (reprogramaciones, mencionadas en el problema original y nunca implementadas), y se separó `cancelledTurns` (cancelado, proactivo) de un nuevo `noShowTurns`/`no_show_turns` (ausente) — antes venían mezclados en un solo campo. El resto de la lista (profesional, consultorio, disponibilidad granular, intento de reserva) queda documentado como visión futura, no implementado — son cambios de dimensión, no campos sueltos.

## 7. Pendiente / decisiones abiertas

- **Acceso para analistas**: hoy la única forma de conectarse a la base es con el usuario `postgres` (superusuario, puede borrar tablas). Está propuesto crear un usuario de solo lectura (`analistas`) — falta decidir si se hace. No es necesario si el equipo de ML solo consume el CSV/JSON de `data/` y devuelve resultados por la API (ver sección 5) — no necesitan tocar la base directo.
- **`git init`**: ✅ hecho — repo inicializado con un primer commit local. Todavía no tiene remoto ni se subió nada a ningún lado; eso se hace cuando el equipo lo decida.
- **Regeneración del dataset**: `generate-medical-data.js` genera fechas relativas al día en que se corre — si lo volvés a correr mucho más adelante, el rango de fechas se corre entero. No es un problema ahora, pero tenelo en cuenta.
- **Despliegue**: hoy todo corre en `localhost`. Si la presentación necesita una URL pública (en vez de demo en vivo desde tu máquina), falta desplegar `client/` (ej. Vercel) y `server/` (ej. Railway) — no está hecho todavía.
- **Variables de la visión del equipo, todavía sin confirmar**: `profesional`, `consultorio`, `profesionales_disponibles`, `consultorios_disponibles`, `horas_disponibles`, `cupos_disponibles`, `lista_de_espera`, `intento_de_reserva`. Agregarlas implica sumar dos dimensiones nuevas al dato (profesional, consultorio) y repensar cómo se muestra la consola — no es un cambio chico. Se encara como su propia etapa si el equipo lo confirma.
