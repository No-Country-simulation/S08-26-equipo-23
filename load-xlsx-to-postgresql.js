require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configuración de conexión
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Sin este listener, una caída de conexión a mitad de carga (común en proxies
// públicos como el de Railway) tira un 'Unhandled error event' y mata el
// proceso en vez de dejar que el catch de abajo lo reporte prolijamente.
client.on('error', (err) => {
  console.error('\n⚠️  Conexión interrumpida:', err.message);
});

const XLSX_PATH = path.join(__dirname, 'data', 'healthdemand_buenos_aires.xlsx');
const SHEET_NAME = 'healthdemand_buenos_aires';

// Excel guarda las fechas como número de serie (días desde 1899-12-30). Con
// `cellDates: true` en XLSX.readFile, la librería ya las entrega como Date;
// esta función queda como red de seguridad por si algún valor llega como
// número crudo (p. ej. si cambia la config de lectura más adelante).
function toDateString(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    const yyyy = String(parsed.y).padStart(4, '0');
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Último recurso: intentar parsear como texto (ej. "2024-03-10").
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().slice(0, 10);
  }
  throw new Error(`No se pudo interpretar la fecha: ${value}`);
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return Boolean(value);
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function loadXlsxToPostgres() {
  try {
    console.log('🔗 Conectando a PostgreSQL...\n');

    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    console.log(`📖 Leyendo archivo: ${XLSX_PATH}\n`);
    if (!fs.existsSync(XLSX_PATH)) {
      console.error('❌ Archivo no encontrado:', XLSX_PATH, '\n');
      process.exit(1);
    }

    // cellDates: true → las celdas de fecha llegan como objetos Date en vez
    // de números de serie de Excel.
    const workbook = XLSX.readFile(XLSX_PATH, { cellDates: true });
    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) {
      console.error(`❌ No se encontró la hoja "${SHEET_NAME}" en el archivo.`);
      console.error('   Hojas disponibles:', workbook.SheetNames.join(', '), '\n');
      process.exit(1);
    }

    // raw: true → valores crudos (no el texto formateado que muestra Excel).
    const rawRows = XLSX.utils.sheet_to_json(sheet, { raw: true, defval: null });

    console.log(`📊 Filas leídas del xlsx: ${rawRows.length}\n`);
    console.log('🔍 Primera fila cruda (verificación de parseo):');
    console.log(rawRows[0], '\n');

    // Normalizamos cada fila a los nombres de columna en inglés que usa el
    // resto del código (la traducción sucede acá, en el borde de carga —
    // nada aguas abajo debería ver nombres de columna en español).
    const rows = rawRows.map((row) => ({
      date: toDateString(row['fecha']),
      dayOfWeek: row['dia_semana'],
      dayNumber: toNumberOrNull(row['numero_dia_semana']),
      month: toNumberOrNull(row['mes']),
      year: toNumberOrNull(row['año']),
      isHoliday: toBoolean(row['es_feriado']),
      neighborhood: row['barrio'],
      socioeconomicLevel: row['nivel_socioeconomico'],
      specialty: row['especialidad'],
      availableSlots: toNumberOrNull(row['turnos_disponibles']),
      assignedTurns: toNumberOrNull(row['turnos_asignados']),
      attendedTurns: toNumberOrNull(row['turnos_atendidos']),
      unmetDemand: toNumberOrNull(row['demanda_no_atendida']),
      cancelledTurns: toNumberOrNull(row['cancelaciones']),
      noShowTurns: toNumberOrNull(row['ausencias']),
      noShowRate: toNumberOrNull(row['tasa_ausentismo']),
      occupancyRate: toNumberOrNull(row['ocupacion']),
      saturationLevel: row['nivel_saturacion'],
      seasonFactor: toNumberOrNull(row['factor_temporada'])
    }));

    // Crear tablas de referencia primero (historical_turns depende de ellas via FK)
    console.log('📋 Creando tablas...');
    await client.query(`
      DROP TABLE IF EXISTS historical_turns CASCADE;
      DROP TABLE IF EXISTS specialties CASCADE;
      DROP TABLE IF EXISTS neighborhoods CASCADE;
      DROP TABLE IF EXISTS sites CASCADE;

      CREATE TABLE neighborhoods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        socioeconomic_level VARCHAR(20) NOT NULL
      );

      CREATE TABLE specialties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE historical_turns (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        day_of_week VARCHAR(20),
        day_number INT,
        month INT,
        year INT,
        is_holiday BOOLEAN,
        neighborhood VARCHAR(100) NOT NULL REFERENCES neighborhoods(name),
        specialty VARCHAR(100) NOT NULL REFERENCES specialties(name),
        available_slots INT,
        assigned_turns INT,
        attended_turns INT,
        unmet_demand INT,
        cancelled_turns INT,
        no_show_turns INT,
        no_show_rate DECIMAL(6,4),
        occupancy_rate DECIMAL(6,4),
        saturation_level VARCHAR(20),
        season_factor DECIMAL(6,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_date ON historical_turns(date);
      CREATE INDEX idx_specialty ON historical_turns(specialty);
      CREATE INDEX idx_neighborhood ON historical_turns(neighborhood);
      CREATE INDEX idx_date_specialty_neighborhood ON historical_turns(date, specialty, neighborhood);
    `);
    console.log('✅ Tablas creadas\n');

    // Derivar barrios (con su nivel socioeconómico, primero que aparece gana)
    // y especialidades únicas a partir de las filas parseadas.
    const neighborhoodLevels = new Map();
    const specialtiesSet = new Set();
    for (const row of rows) {
      if (!neighborhoodLevels.has(row.neighborhood)) {
        neighborhoodLevels.set(row.neighborhood, row.socioeconomicLevel);
      }
      specialtiesSet.add(row.specialty);
    }

    console.log(`📋 Insertando ${neighborhoodLevels.size} barrios...`);
    for (const [name, level] of neighborhoodLevels.entries()) {
      await client.query(
        'INSERT INTO neighborhoods (name, socioeconomic_level) VALUES ($1, $2)',
        [name, level]
      );
    }
    console.log('✅ Barrios insertados\n');

    console.log(`📋 Insertando ${specialtiesSet.size} especialidades...`);
    for (const specialty of specialtiesSet) {
      await client.query('INSERT INTO specialties (name) VALUES ($1)', [specialty]);
    }
    console.log('✅ Especialidades insertadas\n');

    // Insertar en batch: un solo INSERT multi-fila por lote en vez de una
    // query por registro — con 69.100 filas, ida y vuelta por fila contra un
    // proxy remoto es lento y expone mucho tiempo a un corte de conexión.
    const columns = [
      'date', 'day_of_week', 'day_number', 'month', 'year', 'is_holiday',
      'neighborhood', 'specialty', 'available_slots', 'assigned_turns',
      'attended_turns', 'unmet_demand', 'cancelled_turns', 'no_show_turns',
      'no_show_rate', 'occupancy_rate', 'saturation_level', 'season_factor'
    ];
    const batchSize = 1000;
    let inserted = 0;
    let batchNumber = 0;
    const totalBatches = Math.ceil(rows.length / batchSize);

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      batchNumber += 1;

      const values = [];
      const placeholders = batch.map((turn, row) => {
        const base = row * columns.length;
        values.push(
          turn.date, turn.dayOfWeek, turn.dayNumber, turn.month, turn.year,
          turn.isHoliday, turn.neighborhood, turn.specialty, turn.availableSlots,
          turn.assignedTurns, turn.attendedTurns, turn.unmetDemand,
          turn.cancelledTurns, turn.noShowTurns, turn.noShowRate,
          turn.occupancyRate, turn.saturationLevel, turn.seasonFactor
        );
        const params = columns.map((_, col) => `$${base + col + 1}`).join(', ');
        return `(${params})`;
      });

      await client.query(
        `INSERT INTO historical_turns (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
        values
      );

      inserted += batch.length;
      const progress = ((inserted / rows.length) * 100).toFixed(1);
      process.stdout.write(`\r📥 Cargando: ${progress}% (${inserted}/${rows.length}) — lote ${batchNumber}/${totalBatches}`);
    }

    console.log('\n\n✅ Datos cargados exitosamente!\n');

    // Estadísticas
    const stats = await client.query(`
      SELECT specialty, COUNT(*) as count, AVG(assigned_turns + unmet_demand) as avg_demand
      FROM historical_turns
      GROUP BY specialty
      ORDER BY count DESC
    `);

    console.log('📊 Estadísticas por especialidad:\n');
    stats.rows.forEach(row => {
      console.log(`   ${row.specialty}:`);
      console.log(`      Registros: ${row.count}`);
      console.log(`      Demanda promedio: ${parseFloat(row.avg_demand).toFixed(1)} turnos\n`);
    });

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM neighborhoods) AS neighborhoods,
        (SELECT COUNT(*) FROM specialties) AS specialties,
        (SELECT COUNT(*) FROM historical_turns) AS historical_turns
    `);
    console.log('📊 Totales finales:', counts.rows[0], '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Sugerencias:');
    console.error('   - ¿Está PostgreSQL corriendo?');
    console.error('   - ¿Es correcta la variable de entorno DATABASE_URL?');
    console.error('   - Variable de entorno requerida: DATABASE_URL (ver .env.local)\n');
  } finally {
    await client.end();
    console.log('🔌 Desconectado de PostgreSQL\n');
  }
}

// Ejecutar
if (require.main === module) {
  loadXlsxToPostgres();
}

module.exports = { loadXlsxToPostgres };
