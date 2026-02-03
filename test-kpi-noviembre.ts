import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';

/**
 * Script de prueba para el KPI de Noviembre
 * Muestra: Errores vs Créditos Administrados
 */
async function testKPINoviembre() {
  console.log('🔍 Iniciando prueba de KPI de Noviembre...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const kpisService = app.get(KpisService);

  try {
    console.log('📊 Generando KPI de Noviembre: Errores vs Créditos Administrados...\n');
    
    const result = await kpisService.generateKPINoviembre2024();

    if (!result.success) {
      console.error('❌ Error generando KPI:', result.error);
      return;
    }

    console.log('✅ KPI generado exitosamente!\n');
    console.log('═'.repeat(60));
    console.log('📈 RESULTADOS DEL KPI DE NOVIEMBRE 2024');
    console.log('═'.repeat(60));
    console.log(`📅 Mes: ${result.data!.mes}`);
    console.log(`📆 Período: ${result.data!.periodo.inicio} a ${result.data!.periodo.fin}`);
    console.log('─'.repeat(60));
    console.log(`❌ Errores de Cartera: ${result.data!.errores}`);
    console.log(`📊 Créditos Administrados: ${result.data!.creditosAdministrados}`);
    console.log(`📈 Total de Préstamos: ${result.data!.totalLoans}`);
    console.log(`💯 Porcentaje Administrados: ${result.data!.porcentajeAdministrados}%`);
    console.log('─'.repeat(60));
    console.log('📋 DESGLOSE POR STATUS:');
    console.log(`   ✅ Active (al corriente): ${result.data!.desglose.active}`);
    console.log(`   ⚠️  Arrear (en mora): ${result.data!.desglose.arrear}`);
    console.log('═'.repeat(60));
    
    // Mostrar relación errores vs créditos
    console.log('\n📊 ANÁLISIS:');
    console.log('─'.repeat(60));
    const ratioErrores = result.data!.totalLoans > 0 
      ? ((result.data!.errores / result.data!.totalLoans) * 100).toFixed(2)
      : '0';
    console.log(`   • Tasa de error: ${ratioErrores}% (${result.data!.errores} errores de ${result.data!.totalLoans} préstamos)`);
    console.log(`   • Créditos administrados: ${result.data!.porcentajeAdministrados}% del total`);
    
    if (result.data!.creditosAdministrados > 0) {
      const ratioActiveArrear = ((result.data!.desglose.active / result.data!.creditosAdministrados) * 100).toFixed(2);
      console.log(`   • De los administrados: ${ratioActiveArrear}% están al corriente`);
    }
    console.log('═'.repeat(60));

    // Mostrar JSON completo
    console.log('\n📄 RESPUESTA JSON COMPLETA:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify({
      success: result.success,
      data: result.data
    }, null, 2));
    console.log('─'.repeat(60));

    console.log('\n🎉 Prueba completada exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Ejecutar el test
testKPINoviembre()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });










