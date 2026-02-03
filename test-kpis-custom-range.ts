/**
 * Script de prueba para el endpoint de KPIs con rango personalizado
 * 
 * Uso:
 * npm run build && node dist/test-kpis-custom-range.js
 * 
 * O directamente con ts-node:
 * npx ts-node test-kpis-custom-range.ts
 */

const API_URL = 'http://localhost:3000/kpis/stop-yoyo/custom';

async function testCustomRangeKPIs() {
  console.log('🧪 ==========================================');
  console.log('🧪 TEST: KPIs STOP-YOYO - Rango Personalizado');
  console.log('🧪 ==========================================\n');

  // Parámetros de prueba: del 20 al 29 de diciembre de 2025
  const params = {
    fechaInicio: '2025-12-20',
    fechaFin: '2025-12-29',
    erroresCartera: '48'
  };

  const url = `${API_URL}?fechaInicio=${params.fechaInicio}&fechaFin=${params.fechaFin}&erroresCartera=${params.erroresCartera}`;

  console.log(`📡 URL: ${url}`);
  console.log(`📅 Período: ${params.fechaInicio} al ${params.fechaFin}`);
  console.log(`❌ Errores de cartera: ${params.erroresCartera}`);
  console.log('⏳ Enviando petición...\n');

  try {
    const startTime = Date.now();
    
    const response = await fetch(url);
    const data = await response.json();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`⏱️  Tiempo de respuesta: ${duration}s\n`);

    if (data.success) {
      console.log('✅ KPIs generados exitosamente!\n');
      
      console.log('📊 DATOS PRINCIPALES:');
      console.log('==========================================');
      if (data.data) {
        console.log(`   Tasa de Aprobación: ${data.data.tasaAprobacion.toFixed(2)}%`);
        console.log(`   Tiempo Onboarding: ${data.data.tiempoOnboarding} minutos`);
        console.log(`   Índice Cartera Sin Errores: ${data.data.indiceCarteraSinErrores.toFixed(2)}%`);
        console.log(`   Efectividad de Recaudo: ${data.data.efectividadRecaudo}%`);
        console.log(`   Fecha Generación: ${new Date(data.data.fechaGeneracion).toLocaleString('es-ES')}`);
        console.log(`   Período: ${data.data.periodo.inicio} a ${data.data.periodo.fin}`);
        console.log(`   Entidad Financiera: ${data.data.financialEntity}`);
      }

      console.log('\n📈 RESUMEN ESTADÍSTICO:');
      console.log('==========================================');
      if (data.summary) {
        console.log(`   Total Leads: ${data.summary.totalLeads.toLocaleString('es-ES')}`);
        console.log(`   Total Users (Aprobados): ${data.summary.totalUsers.toLocaleString('es-ES')}`);
        console.log(`   Total Solicitudes: ${data.summary.totalSolicitudes.toLocaleString('es-ES')}`);
        console.log(`   Total Loans: ${data.summary.totalLoans.toLocaleString('es-ES')}`);
        console.log(`   Errores Cartera: ${data.summary.erroresCartera}`);
        console.log('\n📐 Fórmulas:');
        console.log(`   - Tasa Aprobación: ${data.summary.formulas.tasaAprobacion}`);
        console.log(`   - Índice Cartera: ${data.summary.formulas.indiceCarteraSinErrores}`);
        console.log(`   - Tiempo Onboarding: ${data.summary.formulas.tiempoOnboarding}`);
      }

      console.log('\n📄 ARCHIVO PDF:');
      console.log('==========================================');
      console.log(`   Nombre: ${data.fileName}`);
      console.log(`   Ruta: ${data.filePath}`);

      console.log('\n🎯 VERIFICACIÓN:');
      console.log('==========================================');
      if (data.summary && data.data) {
        const tasaCalculada = (data.summary.totalUsers / data.summary.totalSolicitudes) * 100;
        const diferenciaTasa = Math.abs(tasaCalculada - data.data.tasaAprobacion);
        
        console.log(`   Tasa Aprobación (API): ${data.data.tasaAprobacion.toFixed(2)}%`);
        console.log(`   Tasa Aprobación (Calculada): ${tasaCalculada.toFixed(2)}%`);
        console.log(`   Diferencia: ${diferenciaTasa.toFixed(2)}%`);
        
        if (diferenciaTasa < 0.01) {
          console.log('   ✅ Los cálculos son consistentes');
        } else {
          console.log('   ⚠️  Hay una diferencia en los cálculos');
        }
      }

      console.log('\n✅ Test completado exitosamente!');
      
    } else {
      console.error('❌ Error en la respuesta:');
      console.error(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error al ejecutar el test:');
    console.error(error);
  }
}

// Tests adicionales con diferentes rangos
async function runAllTests() {
  console.log('\n🚀 INICIANDO BATERÍA DE TESTS\n');
  
  // Test 1: 20-29 de diciembre 2025
  await testCustomRangeKPIs();
  
  console.log('\n\n' + '='.repeat(50));
  console.log('🧪 Test 2: Rango de 1 día (25 de diciembre)');
  console.log('='.repeat(50) + '\n');
  
  try {
    const url = `${API_URL}?fechaInicio=2025-12-25&fechaFin=2025-12-25&erroresCartera=5`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Test de 1 día completado');
      console.log(`   Total Loans: ${data.summary?.totalLoans || 0}`);
    } else {
      console.log('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n\n' + '='.repeat(50));
  console.log('🧪 Test 3: Error - Fecha inválida');
  console.log('='.repeat(50) + '\n');
  
  try {
    const url = `${API_URL}?fechaInicio=2025-13-40&fechaFin=2025-12-25`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      console.log('✅ Error manejado correctamente');
      console.log(`   Mensaje: ${data.error}`);
    } else {
      console.log('⚠️  Se esperaba un error pero la petición fue exitosa');
    }
  } catch (error) {
    console.log('✅ Error detectado en la validación');
  }
  
  console.log('\n\n🏁 TODOS LOS TESTS COMPLETADOS\n');
}

// Ejecutar tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testCustomRangeKPIs, runAllTests };




