import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';

async function testIndiceCarteraSinErrores() {
  console.log('🧪 Probando KPI: Índice de Cartera Sin Errores\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const kpisService = app.get(KpisService);

  try {
    console.log('📊 Calculando KPIs...\n');
    
    const kpiData = await kpisService.calculateKPIs();

    console.log('\n✅ RESULTADO DEL KPI - ÍNDICE DE CARTERA SIN ERRORES:');
    console.log('═'.repeat(60));
    console.log(`📈 Índice: ${kpiData.indiceCarteraSinErrores.toFixed(2)}%`);
    console.log('═'.repeat(60));

    console.log('\n📋 TODOS LOS KPIs CALCULADOS:');
    console.log('─'.repeat(60));
    console.log(`✓ Tasa de Aprobación:              ${kpiData.tasaAprobacion.toFixed(2)}%`);
    console.log(`✓ Tiempo de Onboarding:            ${kpiData.tiempoOnboarding} minutos`);
    console.log(`✓ Tiempo Promedio de Desembolso:   ${kpiData.tiempoPromedioDesembolso} días`);
    console.log(`✓ Índice Cartera Sin Errores:      ${kpiData.indiceCarteraSinErrores.toFixed(2)}%`);
    console.log(`✓ Efectividad de Recaudo:          ${kpiData.efectividadRecaudo}%`);
    console.log('─'.repeat(60));

    console.log('\n📅 Período:');
    console.log(`   Inicio: ${kpiData.periodo.inicio.toISOString()}`);
    console.log(`   Fin:    ${kpiData.periodo.fin.toISOString()}`);

    console.log('\n🎉 Test completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante el test:', error);
    throw error;
  } finally {
    await app.close();
  }
}

testIndiceCarteraSinErrores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });

