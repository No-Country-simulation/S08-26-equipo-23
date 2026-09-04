require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function loadDataToPostgres() {
  try {
    console.log('🔗 Conectando a PostgreSQL...\n');
    
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');
    
    // Crear tablas de referencia primero (historical_turns depende de ellas via FK)
    console.log('📋 Creando tablas de referencia...');
    await client.query(`
      DROP TABLE IF EXISTS historical_turns CASCADE;
      DROP TABLE IF EXISTS specialties CASCADE;
      DROP TABLE IF EXISTS sites CASCADE;

      CREATE TABLE specialties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE sites (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        capacity INT
      );
    `);
    console.log('✅ Tablas de referencia creadas\n');

    // Insertar especialidades y sedes
    const specialties = ['Cardiología', 'Oftalmología', 'Dermatología', 'Neurología', 'Traumatología', 'Pediatría', 'Ginecología'];
    const sites = [
      { name: 'Sede Centro', capacity: 120 },
      { name: 'Sede Norte', capacity: 80 },
      { name: 'Sede Sur', capacity: 90 }
    ];
    
    for (const specialty of specialties) {
      await client.query('INSERT INTO specialties (name) VALUES ($1)', [specialty]);
    }
    
    for (const site of sites) {
      await client.query('INSERT INTO sites (name, capacity) VALUES ($1, $2)', [site.name, site.capacity]);
    }
    
    // Crear tabla principal (depende de specialties/sites vía FK, ya creadas arriba)
    console.log('📋 Creando tabla historical_turns...');
    await client.query(`
      CREATE TABLE historical_turns (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        day_of_week VARCHAR(20),
        week_number INT,
        month INT,
        specialty VARCHAR(100) NOT NULL,
        site VARCHAR(100) NOT NULL,
        time_slot VARCHAR(20),
        time_slot_name VARCHAR(50),

        total_demand INT,
        assigned_turns INT,
        cancelled_turns INT,
        attended_turns INT,
        no_show_rate DECIMAL(5,2),
        occupancy_rate DECIMAL(5,2),

        site_capacity INT,
        utilisation_percent DECIMAL(5,2),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_specialty FOREIGN KEY (specialty) REFERENCES specialties(name),
        CONSTRAINT fk_site FOREIGN KEY (site) REFERENCES sites(name)
      );

      CREATE INDEX idx_date ON historical_turns(date);
      CREATE INDEX idx_specialty ON historical_turns(specialty);
      CREATE INDEX idx_site ON historical_turns(site);
      CREATE INDEX idx_date_specialty_site ON historical_turns(date, specialty, site);
    `);
    console.log('✅ Tabla historical_turns creada\n');

    // Leer datos
    const jsonPath = path.join(__dirname, 'data', 'historical_turns.json');
    console.log(`📖 Leyendo datos de: ${jsonPath}\n`);
    
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Archivo no encontrado. Ejecuta primero: npm run generate\n');
      process.exit(1);
    }
    
    const turns = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📊 Total de registros a cargar: ${turns.length}\n`);
    
    // Insertar en batch: un solo INSERT multi-fila por lote en vez de una
    // query por registro — con 10.752 filas, ida y vuelta por fila contra un
    // proxy remoto es lento y expone mucho tiempo a un corte de conexión.
    // Con lotes de 1000, son ~11 queries en vez de 10.752.
    const columns = [
      'date', 'day_of_week', 'week_number', 'month', 'specialty', 'site',
      'time_slot', 'time_slot_name', 'total_demand', 'assigned_turns',
      'cancelled_turns', 'attended_turns', 'no_show_rate', 'occupancy_rate',
      'site_capacity', 'utilisation_percent'
    ];
    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < turns.length; i += batchSize) {
      const batch = turns.slice(i, i + batchSize);

      const values = [];
      const placeholders = batch.map((turn, row) => {
        const base = row * columns.length;
        values.push(
          turn.date, turn.dayOfWeek, turn.weekNumber, turn.month,
          turn.specialty, turn.site, turn.timeSlot, turn.timeSlotName,
          turn.totalDemand, turn.assignedTurns, turn.cancelledTurns,
          turn.attendedTurns, turn.noShowRate, turn.occupancyRate,
          turn.siteCapacity, turn.utilisationPercent
        );
        const params = columns.map((_, col) => `$${base + col + 1}`).join(', ');
        return `(${params})`;
      });

      await client.query(
        `INSERT INTO historical_turns (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
        values
      );

      inserted += batch.length;
      const progress = ((inserted / turns.length) * 100).toFixed(1);
      process.stdout.write(`\r📥 Cargando: ${progress}% (${inserted}/${turns.length})`);
    }
    
    console.log('\n\n✅ Datos cargados exitosamente!\n');
    
    // Estadísticas
    const stats = await client.query(`
      SELECT specialty, COUNT(*) as count, AVG(total_demand) as avg_demand
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
  loadDataToPostgres();
}

module.exports = { loadDataToPostgres };
