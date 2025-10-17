import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';

async function testKPIsPorEntidad() {
  console.log('🧪 Probando KPIs por Entidad Financiera\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const kpisService = app.get(KpisService);

  try {
    console.log('📊 Calculando KPIs por entidad...\n');
    
    const kpisByEntity = await kpisService.calculateKPIsByEntity();

    console.log('\n✅ RESULTADOS POR ENTIDAD FINANCIERA:');
    console.log('═'.repeat(80));

    for (const [entityName, kpiData] of Object.entries(kpisByEntity)) {
      console.log(`\n🏦 ${entityName.toUpperCase()}`);
      console.log('─'.repeat(80));
      console.log(`   📈 Tasa de Aprobación:           ${kpiData.tasaAprobacion.toFixed(2)}%`);
      console.log(`   ⏱️  Tiempo de Onboarding:         ${kpiData.tiempoOnboarding} minutos`);
      console.log(`   📦 Índice Cartera Sin Errores:   ${kpiData.indiceCarteraSinErrores.toFixed(2)}%`);
      console.log(`   📊 Efectividad de Recaudo:       ${kpiData.efectividadRecaudo}% (mock)`);
      console.log(`   📅 Período: ${kpiData.periodo.inicio.toISOString().split('T')[0]} a ${kpiData.periodo.fin.toISOString().split('T')[0]}`);
    }

    console.log('\n═'.repeat(80));
    console.log('\n📋 RESUMEN:');
    console.log(`   Total de entidades procesadas: ${Object.keys(kpisByEntity).length}`);
    console.log(`   Entidades: ${Object.keys(kpisByEntity).join(', ')}`);

    console.log('\n🎉 Test completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante el test:', error);
    throw error;
  } finally {
    await app.close();
  }
}

testKPIsPorEntidad()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });


