const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Configuración de conexión (Cambiar según tu setup)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/healthdemand';

// Schema
const turnSchema = new mongoose.Schema({
  date: Date,
  dayOfWeek: String,
  weekNumber: Number,
  month: Number,
  specialty: String,
  site: String,
  timeSlot: String,
  timeSlotName: String,
  
  // Métricas
  totalDemand: Number,
  assignedTurns: Number,
  cancelledTurns: Number,
  attendedTurns: Number,
  noShowRate: Number,
  occupancyRate: Number,
  
  // Capacidad
  siteCapacity: Number,
  utilisationPercent: String,
  
  createdAt: { type: Date, default: Date.now }
});

// Crear índices para queries rápidas
turnSchema.index({ date: 1, specialty: 1, site: 1 });
turnSchema.index({ specialty: 1 });
turnSchema.index({ site: 1 });
turnSchema.index({ date: 1 });

const Turn = mongoose.model('Turn', turnSchema);

async function loadDataToMongo() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    console.log(`   URI: ${MONGO_URI}\n`);
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB\n');
    
    // Leer archivo JSON
    const jsonPath = path.join(__dirname, 'data', 'historical_turns.json');
    console.log(`📖 Leyendo datos de: ${jsonPath}\n`);
    
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Archivo no encontrado. Ejecuta primero: npm run generate\n');
      process.exit(1);
    }
    
    const turns = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📊 Total de registros a cargar: ${turns.length}\n`);
    
    // Limpiar colección anterior
    console.log('🗑️  Limpiando colección anterior...');
    await Turn.deleteMany({});
    console.log('✅ Colección limpia\n');
    
    // Convertir strings de fecha a Date objects
    const turnsToInsert = turns.map(turn => ({
      ...turn,
      date: new Date(turn.date)
    }));
    
    // Insertar en batch (para evitar sobrecarga)
    const batchSize = 1000;
    let inserted = 0;
    
    for (let i = 0; i < turnsToInsert.length; i += batchSize) {
      const batch = turnsToInsert.slice(i, i + batchSize);
      await Turn.insertMany(batch);
      inserted += batch.length;
      
      const progress = ((inserted / turnsToInsert.length) * 100).toFixed(1);
      process.stdout.write(`\r📥 Cargando: ${progress}% (${inserted}/${turnsToInsert.length})`);
    }
    
    console.log('\n\n✅ Datos cargados exitosamente!\n');
    
    // Mostrar estadísticas
    const stats = await Turn.aggregate([
      {
        $group: {
          _id: '$specialty',
          count: { $sum: 1 },
          avgDemand: { $avg: '$totalDemand' },
          avgAttended: { $avg: '$attendedTurns' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📊 Estadísticas por especialidad:\n');
    stats.forEach(stat => {
      console.log(`   ${stat._id}:`);
      console.log(`      Registros: ${stat.count}`);
      console.log(`      Demanda promedio: ${stat.avgDemand.toFixed(1)} turnos`);
      console.log(`      Turnos atendidos: ${stat.avgAttended.toFixed(1)}\n`);
    });
    
    const totalRecords = await Turn.countDocuments();
    console.log(`📈 Total de registros en BD: ${totalRecords}\n`);
    
    // Query de ejemplo
    console.log('🔍 Ejemplo de query:\n');
    const example = await Turn.findOne({});
    console.log('   Una muestra aleatoria:');
    console.log(`   ${JSON.stringify(example, null, 2)}\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Sugerencias:');
    console.error('   - ¿Está MongoDB corriendo?');
    console.error('   - ¿Es correcta la URI de conexión?');
    console.error('   - Si usas MongoDB Atlas, actualiza MONGO_URI en el script\n');
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB\n');
  }
}

// Ejecutar
if (require.main === module) {
  loadDataToMongo();
}

module.exports = { Turn };
