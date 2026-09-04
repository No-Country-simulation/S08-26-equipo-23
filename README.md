# HealthDemand

Plataforma de análisis y predicción de demanda médica que utiliza datos históricos de turnos para anticipar necesidades futuras, detectar picos de demanda y facilitar la planificación de profesionales, agendas y recursos.

**Stack actual:** Node.js + Express (API) · PostgreSQL · Next.js + React (dashboard) · predicciones de demanda a cargo de un modelo de ML independiente.

**Cómo correr el proyecto y cómo usar la consola:** ver [SETUP.md](SETUP.md).

---

## Problema

### Descripción / Contexto

Una red de centros médicos brinda atención a pacientes a través de diferentes especialidades, profesionales, sedes y franjas horarias.

Cada día, la organización debe administrar una gran cantidad de turnos médicos, considerando variables como:

- Especialidad.
- Profesional.
- Sede.
- Día de la semana.
- Horario.
- Tipo de atención.
- Cantidad de turnos disponibles.
- Turnos asignados.
- Cancelaciones.
- Ausencias de pacientes.
- Reprogramaciones.
- Demanda histórica.

La capacidad de atención de la institución depende directamente de una correcta planificación de estos recursos. Sin embargo, la demanda de pacientes no es uniforme.

Por ejemplo, una determinada especialidad puede presentar una demanda elevada los lunes por la mañana, mientras que otra puede tener mayor demanda durante la tarde. También pueden existir períodos del mes o del año en los que determinadas especialidades reciben un incremento significativo de solicitudes.

Actualmente, la planificación de turnos puede realizarse principalmente a partir de datos históricos simples, experiencia de los responsables y estimaciones manuales.

Esto significa que, ante la necesidad de definir cuántos profesionales, consultorios o turnos serán necesarios en una determinada fecha, la organización no necesariamente cuenta con una herramienta que permita anticipar la demanda futura.

El problema no está únicamente en conocer cuántos turnos se asignaron en el pasado, sino en poder responder:

> ¿Cuántos pacientes esperamos recibir, para qué especialidades, en qué días y horarios, y qué capacidad necesitamos preparar para atender esa demanda?

HealthDemand busca resolver esta problemática mediante una solución que utilice datos históricos y modelos de predicción para estimar la demanda futura de turnos y facilitar la planificación de recursos.

### Problema / Dolor del negocio

La planificación basada principalmente en históricos simples dificulta anticipar cambios en la demanda y puede generar un desbalance entre la capacidad disponible y la cantidad de pacientes que necesitan atención.

**Falta de previsión de la demanda**

La organización conoce la cantidad de turnos que tuvo en períodos anteriores, pero no necesariamente puede estimar con precisión qué ocurrirá en los próximos días o semanas.

Esto dificulta anticiparse a:

- Incrementos de demanda.
- Períodos de baja demanda.
- Picos por especialidad.
- Diferencias entre sedes.
- Variaciones según día y horario.
- Aumento de cancelaciones o ausencias.

**Sobrecarga de profesionales**

Si la demanda real supera la capacidad planificada, determinados profesionales pueden recibir una cantidad excesiva de pacientes.

Esto puede provocar:

- Agendas saturadas.
- Mayor tiempo de espera.
- Sobrecarga del personal.
- Dificultades para conseguir turnos.
- Necesidad de incorporar recursos de manera urgente.

La falta de previsión hace que la organización muchas veces reaccione ante el problema en lugar de anticiparse.

**Baja utilización de recursos**

El problema también puede presentarse en sentido contrario.

Una planificación que sobreestima la demanda puede generar:

- Profesionales con baja ocupación.
- Consultorios disponibles sin utilizar.
- Franjas horarias con pocos pacientes.
- Recursos asignados innecesariamente.
- Costos operativos superiores a los necesarios.

Por lo tanto, el desafío no consiste simplemente en aumentar la capacidad, sino en encontrar un equilibrio entre demanda esperada y capacidad disponible.

**Dificultad para identificar patrones**

Los datos históricos contienen información que puede resultar útil para detectar comportamientos recurrentes.

Por ejemplo:

- Especialidades con mayor demanda determinados días.
- Horarios con mayor cantidad de solicitudes.
- Variaciones estacionales.
- Comportamiento de las cancelaciones.
- Diferencias entre centros médicos.
- Cambios en la demanda a lo largo del tiempo.

Cuando estos datos se encuentran únicamente en planillas o sistemas transaccionales, detectar estos patrones puede requerir análisis manual y depender de la experiencia de las personas responsables.

**Gestión reactiva**

Sin una herramienta predictiva, las decisiones suelen tomarse cuando el problema ya comenzó.

Por ejemplo:

Se detecta que una especialidad tiene demasiados pacientes esperando → se intenta conseguir más disponibilidad.

El objetivo de HealthDemand es permitir cambiar este enfoque:

El sistema detecta que se espera un incremento de demanda → el responsable puede ajustar la disponibilidad antes de que ocurra la saturación.

Esto permite pasar de una gestión reactiva a una gestión preventiva.

**Dificultad para planificar recursos**

La demanda de turnos impacta directamente en otros recursos de la organización.

Una mayor cantidad de pacientes puede requerir:

- Más profesionales.
- Más consultorios.
- Mayor disponibilidad administrativa.
- Mayor capacidad de recepción.
- Mayor disponibilidad de determinados equipamientos.
- Ajustes en horarios de atención.

Por este motivo, la predicción de turnos no debería considerarse únicamente un problema de agenda, sino una herramienta para la planificación integral de la capacidad operativa.

**Falta de indicadores predictivos**

Los sistemas tradicionales suelen mostrar principalmente información histórica:

- Cantidad de turnos.
- Turnos asignados.
- Turnos cancelados.
- Turnos atendidos.
- Disponibilidad.

Sin embargo, la organización necesita incorporar una nueva dimensión:

> ¿Qué esperamos que ocurra?

HealthDemand debería permitir visualizar indicadores como:

- Demanda histórica.
- Demanda proyectada.
- Capacidad disponible.
- Capacidad requerida.
- Nivel de ocupación esperado.
- Especialidades con mayor crecimiento.
- Horarios con riesgo de saturación.
- Horarios con baja utilización.
- Tasa histórica de cancelaciones.
- Nivel de precisión de las predicciones.

### Oportunidad

La oportunidad consiste en transformar los datos históricos de la organización en una herramienta que permita anticipar la demanda y tomar decisiones antes de que ocurran los desbalances de capacidad.

El sistema debería analizar información histórica de turnos y detectar patrones relacionados con especialidades, días, horarios, sedes, cancelaciones y otros factores relevantes.

A partir de ese análisis, debería generar una estimación de la demanda futura.

El flujo esperado podría representarse de la siguiente manera:

Datos históricos → Análisis de patrones → Predicción de demanda → Comparación con capacidad → Alertas → Planificación de recursos

Por ejemplo:

Para la próxima semana, el sistema estima un incremento del 20% en la demanda de cardiología durante las mañanas.

El responsable de planificación podría utilizar esta información para:

- Aumentar la disponibilidad de turnos.
- Reorganizar agendas.
- Incorporar profesionales adicionales.
- Redistribuir horarios.
- Habilitar capacidad en otra sede.
- Anticipar posibles períodos de saturación.

De la misma manera, si el sistema detecta una baja demanda proyectada para determinada franja horaria, la organización podría optimizar la asignación de recursos.

### Criterio de éxito del proyecto

El proyecto será exitoso si un responsable de planificación puede ingresar al sistema y, a partir de los datos históricos disponibles, conocer la demanda esperada para un período futuro, identificar posibles desbalances entre demanda y capacidad y tomar decisiones de planificación antes de que se produzca la saturación o subutilización de los recursos.

En términos concretos, el sistema debería permitir pasar de:

**"¿Cuántos turnos tuvimos?"** a:

**"¿Cuántos turnos esperamos tener, dónde se concentrará la demanda y qué debemos hacer para estar preparados?"**

---

# 🏥 Generador de datos — documentación técnica

> El proyecto usa **PostgreSQL** como base de datos (ver [SETUP.md](SETUP.md) para el setup completo y el contrato de la API). Lo que sigue es la documentación propia del generador de datos sintéticos — la sección de MongoDB describe una ruta alternativa del script, no la que está en uso.

Generador de dataset sintético realista para simulación de turnos médicos.

## ✨ Qué genera

- **180 días** de históricos de turnos
- **7 especialidades** diferentes
- **3 sedes/centros médicos**
- **4 franjas horarias** por día
- **10,752 registros** totales

### Patrones realistas incluidos:

✅ Mayor demanda lunes y martes  
✅ Menor demanda viernes  
✅ Variaciones por especialidad  
✅ Cancelaciones/ausencias (~10-15%)  
✅ Aumento de no-shows en invierno  
✅ Diferencias entre sedes  
✅ Ocupación variable por franja horaria  

## 🚀 Quick Start

### 1️⃣ Generar datos

```bash
node generate-medical-data.js
```

**Output:**
- `data/historical_turns.json` (10,752 registros)
- `data/historical_turns.csv` (mismo formato)

**Tiempo:** ~2 segundos

### 2️⃣ Cargar a PostgreSQL (ruta en uso)

```bash
npm install
node load-to-postgresql.js
```

Ver [SETUP.md](SETUP.md) para las variables de entorno necesarias (`DATABASE_URL`).

### 3️⃣ (Alternativa, no usada en este proyecto) Cargar a MongoDB

```bash
npm run load-mongo
```

**Output esperado:**
```
✅ Conectado a MongoDB
📊 Total de registros a cargar: 10,752
📥 Cargando: 100% (10,752/10,752)
✅ Datos cargados exitosamente!
```

---

## 📊 Estructura de datos

Cada registro tiene:

```json
{
  "date": "2026-03-09",                    // Fecha del turno
  "dayOfWeek": "Monday",                   // Día de la semana
  "weekNumber": 11,                        // Semana del año
  "month": 3,                              // Mes
  "specialty": "Cardiología",              // Especialidad médica
  "site": "Sede Centro",                   // Ubicación
  "timeSlot": "08:00-10:00",              // Franja horaria
  "timeSlotName": "Mañana Temprana",      // Nombre legible

  "totalDemand": 31,                       // Pacientes que pidieron turno
  "assignedTurns": 26,                     // Turnos asignados
  "cancelledTurns": 3,                     // Cancelaciones/ausencias
  "attendedTurns": 23,                     // Atendidos realmente
  "noShowRate": 0.12,                      // % de no-shows
  "occupancyRate": 74.19,                  // % ocupación del turno

  "siteCapacity": 120,                     // Capacidad total de la sede
  "utilisationPercent": "19.17"            // % de uso de la sede
}
```

---

## 🔧 Configurar MongoDB (ruta alternativa, no usada)

### Opción A: MongoDB Local

```bash
# Si tienes MongoDB corriendo localmente
# No cambies nada, usa el default: mongodb://localhost:27017
npm run load-mongo
```

### Opción B: MongoDB Atlas (Cloud)

```bash
# Edita load-to-mongodb.js, línea 5:
const MONGO_URI = 'mongodb+srv://user:password@cluster.mongodb.net/healthdemand';

npm run load-mongo
```

### Opción C: Variable de entorno

```bash
export MONGO_URI='mongodb+srv://user:password@...'
npm run load-mongo
```

---

## 🛠️ Modificar el generador

Si necesitas cambiar patrones, edita `generate-medical-data.js`:

```javascript
// Línea 5: Cambiar especialidades
const specialties = {
  'Urología': { baseDemand: 20, peakDays: [...], noShowRate: 0.11 },
  // ...
};

// Línea 17: Cambiar días a generar
daysToGenerate: 365  // Para un año en lugar de 180 días

// Línea 24: Cambiar tasa de no-shows global
noShowRate *= 1.2  // Aumentar cancelaciones
```

Luego regenera:

```bash
node generate-medical-data.js
node load-to-postgresql.js
```

---

## 📊 Validación de datos

Antes de pasar a ML, verifica:

```bash
# Contar registros
jq 'length' data/historical_turns.json

# Ver estadísticas básicas
jq '[.[] | .totalDemand] | {min: min, max: max, avg: (add/length)}' data/historical_turns.json

# Especialidades únicas
jq -r '.[].specialty' data/historical_turns.json | sort | uniq -c
```

---

## ❓ FAQ

**P: ¿Debo cambiar los datos?**
R: No, son realistas. Pero si el proyecto evoluciona y consiguen datos reales, este script solo sirve para pruebas iniciales.

**P: ¿Qué pasa si regenero los datos?**
R: Se crean nuevos datos con el mismo patrón pero valores aleatorios diferentes. Útil para testing.

**P: ¿Cómo de realista es este dataset?**
R: Incluye patrones reales de centros médicos:
- Variabilidad semanal (lunes pico, viernes bajo)
- Cancelaciones estacionales (más en invierno)
- Diferencias por especialidad
- Ocupación realista por franja horaria

Es 80% suficiente para un MVP. Con datos reales será 100%.

**P: ¿Qué hacer si ML pide otro formato?**
R: Editá las columnas en `generateRealisticTurns()` y regenerá.

---

## 📝 Estado del proyecto

1. ✅ **Generar datos** → `node generate-medical-data.js`
2. ✅ **Cargar a BD** → `node load-to-postgresql.js`
3. ✅ **Backend conecta a BD** → API en `server/` (ver [SETUP.md](SETUP.md))
4. ✅ **Frontend visualiza** → Dashboard en `client/` (gráficos + alertas)
5. 🔜 **ML entrena modelos y entrega predicciones** → contrato documentado en [SETUP.md](SETUP.md)

---

## 📧 Preguntas?

- ¿Los datos no se ven realistas? → Ajustá `baseDemand` en config
- ¿Necesitás otro formato (SQL, Parquet)? → Edita `saveTurnsToFile()`
- ¿Querés más/menos especialidades? → Cambios en el config

---

**Made for HealthDemand MVP** 🏥
