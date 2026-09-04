const fs = require('fs');
const path = require('path');

// Configuración realista
const config = {
  specialties: {
    'Cardiología': { baseDemand: 20, peakDays: ['Monday', 'Tuesday'], noShowRate: 0.12 },
    'Oftalmología': { baseDemand: 18, peakDays: ['Wednesday', 'Thursday'], noShowRate: 0.08 },
    'Dermatología': { baseDemand: 15, peakDays: ['Tuesday', 'Friday'], noShowRate: 0.10 },
    'Neurología': { baseDemand: 16, peakDays: ['Monday', 'Wednesday'], noShowRate: 0.15 },
    'Traumatología': { baseDemand: 22, peakDays: ['Monday', 'Thursday'], noShowRate: 0.11 },
    'Pediatría': { baseDemand: 25, peakDays: ['Monday', 'Tuesday', 'Wednesday'], noShowRate: 0.18 },
    'Ginecología': { baseDemand: 19, peakDays: ['Tuesday', 'Thursday'], noShowRate: 0.09 }
  },
  
  sites: [
    { name: 'Sede Centro', capacity: 120, openDays: [1, 2, 3, 4, 5] },
    { name: 'Sede Norte', capacity: 80, openDays: [1, 2, 3, 4, 5] },
    { name: 'Sede Sur', capacity: 90, openDays: [1, 2, 3, 4, 5] }
  ],
  
  timeSlots: [
    { slot: '08:00-10:00', name: 'Mañana Temprana', weight: 1.0 },
    { slot: '10:00-12:00', name: 'Mañana', weight: 1.3 },
    { slot: '14:00-16:00', name: 'Tarde', weight: 0.9 },
    { slot: '16:00-18:00', name: 'Tarde Tardía', weight: 0.7 }
  ],
  
  daysToGenerate: 180
};

// Función para obtener el número de semana del año
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Función para generar datos realistas
function generateRealisticTurns() {
  const turns = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - config.daysToGenerate);

  for (let i = 0; i < config.daysToGenerate; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    
    const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeekNum = currentDate.getDay();
    
    // Saltar fines de semana
    if (dayOfWeekNum === 0 || dayOfWeekNum === 6) continue;

    // Iterar por cada especialidad
    Object.entries(config.specialties).forEach(([specialty, specConfig]) => {
      
      // Iterar por cada sede
      config.sites.forEach(site => {
        
        // Iterar por cada franja horaria
        config.timeSlots.forEach(timeSlot => {
          
          // Calcular demanda base
          let baseDemand = specConfig.baseDemand * timeSlot.weight;
          
          // Aplicar efecto de día de la semana
          if (specConfig.peakDays.includes(dayOfWeek)) {
            baseDemand *= 1.3; // 30% más en días pico
          } else if (dayOfWeek === 'Friday') {
            baseDemand *= 0.8; // 20% menos los viernes
          }
          
          // Variación aleatoria realista (±25%)
          const variability = 0.75 + Math.random() * 0.5;
          let demand = Math.floor(baseDemand * variability);
          
          // Asegurar mínimo de 1
          demand = Math.max(1, demand);
          
          // Calcular turnos asignados (70-95% de la demanda)
          const assignmentRate = 0.70 + Math.random() * 0.25;
          const assignedTurns = Math.floor(demand * assignmentRate);
          
          // Calcular cancelaciones (efecto estacional: más en invierno)
          const month = currentDate.getMonth();
          let noShowRate = specConfig.noShowRate;
          if (month >= 5 && month <= 8) { // Invierno (meses 6-9)
            noShowRate *= 1.4; // 40% más de no-shows en invierno
          }
          const cancelledTurns = Math.floor(assignedTurns * noShowRate);
          
          // Turnos atendidos
          const attendedTurns = assignedTurns - cancelledTurns;
          
          // Ocupación real
          const occupancyRate = demand > 0 ? ((attendedTurns / demand) * 100).toFixed(2) : 0;
          
          turns.push({
            date: dateStr,
            dayOfWeek: dayOfWeek,
            weekNumber: getWeekNumber(currentDate),
            month: currentDate.getMonth() + 1,
            specialty: specialty,
            site: site.name,
            timeSlot: timeSlot.slot,
            timeSlotName: timeSlot.name,
            
            // Métricas de demanda
            totalDemand: demand,
            assignedTurns: assignedTurns,
            cancelledTurns: cancelledTurns,
            attendedTurns: attendedTurns,
            noShowRate: parseFloat(noShowRate.toFixed(2)),
            occupancyRate: parseFloat(occupancyRate),
            
            // Capacidad
            siteCapacity: site.capacity,
            utilisationPercent: ((attendedTurns / site.capacity) * 100).toFixed(2)
          });
        });
      });
    });
  }

  return turns;
}

// Función para guardar datos
function saveTurnsToFile(turns, format = 'json') {
  const outputDir = path.join(__dirname, 'data');
  
  // Crear directorio si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (format === 'json') {
    const jsonPath = path.join(outputDir, 'historical_turns.json');
    fs.writeFileSync(jsonPath, JSON.stringify(turns, null, 2));
    console.log(`✅ JSON guardado: ${jsonPath}`);
    console.log(`   Total de registros: ${turns.length}`);
  }

  if (format === 'csv') {
    const csvPath = path.join(outputDir, 'historical_turns.csv');
    
    // Headers
    const headers = Object.keys(turns[0]);
    const csvContent = [
      headers.join(','),
      ...turns.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar comillas en strings
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`✅ CSV guardado: ${csvPath}`);
  }
}

// Función para mostrar estadísticas
function printStatistics(turns) {
  console.log('\n📊 ESTADÍSTICAS DEL DATASET\n');
  
  // Rango de fechas
  const dates = turns.map(t => t.date).sort();
  console.log(`📅 Período: ${dates[0]} a ${dates[dates.length - 1]}`);
  
  // Por especialidad
  console.log('\n🏥 Demanda por especialidad (promedio turnos/día):');
  const bySpecialty = {};
  turns.forEach(t => {
    bySpecialty[t.specialty] = (bySpecialty[t.specialty] || 0) + t.totalDemand;
  });
  Object.entries(bySpecialty).forEach(([spec, total]) => {
    const days = turns.filter(t => t.specialty === spec).length / 
                 (config.config?.timeSlots.length * config.sites.length || 1);
    console.log(`   ${spec}: ${(total / days).toFixed(1)} turnos/día`);
  });
  
  // Por sede
  console.log('\n🏢 Ocupación por sede:');
  const bySite = {};
  turns.forEach(t => {
    if (!bySite[t.site]) bySite[t.site] = { attended: 0, capacity: 0 };
    bySite[t.site].attended += t.attendedTurns;
    bySite[t.site].capacity += t.siteCapacity;
  });
  Object.entries(bySite).forEach(([site, data]) => {
    const usage = ((data.attended / (data.capacity * 180/3)) * 100).toFixed(1);
    console.log(`   ${site}: ${usage}% ocupación`);
  });
  
  // Tasa de no-shows
  const totalCancelled = turns.reduce((sum, t) => sum + t.cancelledTurns, 0);
  const totalAssigned = turns.reduce((sum, t) => sum + t.assignedTurns, 0);
  const noShowRate = ((totalCancelled / totalAssigned) * 100).toFixed(2);
  console.log(`\n❌ Tasa de cancelación/ausencia: ${noShowRate}%`);
  
  // Por día de semana
  console.log('\n📆 Demanda por día de semana:');
  const byDay = {};
  turns.forEach(t => {
    byDay[t.dayOfWeek] = (byDay[t.dayOfWeek] || 0) + t.totalDemand;
  });
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
    if (byDay[day]) {
      const count = turns.filter(t => t.dayOfWeek === day).length;
      console.log(`   ${day}: ${(byDay[day] / (count / (config.timeSlots.length * config.sites.length))).toFixed(1)} turnos/día`);
    }
  });
  
  console.log(`\n✨ Total de registros generados: ${turns.length}\n`);
}

// Ejecutar generación
console.log('🚀 Generando dataset sintético realista...\n');
const turns = generateRealisticTurns();

// Mostrar estadísticas
printStatistics(turns);

// Guardar archivos
saveTurnsToFile(turns, 'json');
saveTurnsToFile(turns, 'csv');

console.log('✅ Generación completada!\n');
