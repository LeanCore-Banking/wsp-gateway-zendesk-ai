import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';

async function testTasaAprobacion() {
  console.log('🧪 Probando KPI: Tasa de Aprobación\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const kpisService = app.get(KpisService);

  try {
    console.log('📊 Calculando KPIs...\n');
    
    const kpiData = await kpisService.calculateKPIs();

    console.log('\n✅ RESULTADO DEL KPI - TASA DE APROBACIÓN:');
    console.log('═'.repeat(70));
    console.log(`📈 Tasa de Aprobación: ${kpiData.tasaAprobacion.toFixed(2)}%`);
    console.log('═'.repeat(70));

    console.log('\n📋 DESGLOSE POR ENTIDAD FINANCIERA:');
    console.log('─'.repeat(70));
    
    // El cálculo ya se muestra en los logs, aquí solo mostramos el resumen
    console.log('✓ STOP: Ver logs arriba para detalles');
    console.log('✓ YOYO: Ver logs arriba para detalles');
    console.log('─'.repeat(70));

    console.log('\n📊 FÓRMULA UTILIZADA:');
    console.log('   Tasa de Aprobación = (Total Users / (Total Leads + Total Users)) × 100');
    console.log('   Donde:');
    console.log('   - Lead = Cliente que realizó solicitud pero NO se le aprobó');
    console.log('   - User = Cliente que realizó solicitud y SÍ se le aprobó');

    console.log('\n📅 PERÍODO DE CONSULTA:');
    console.log(`   Inicio: ${kpiData.periodo.inicio.toISOString()}`);
    console.log(`   Fin:    ${kpiData.periodo.fin.toISOString()}`);
    console.log('   Rango:  Últimos 7 días');

    console.log('\n🔍 COLECCIONES CONSULTADAS:');
    console.log('   - middleware.lead (solicitudes no aprobadas)');
    console.log('   - middleware.user (solicitudes aprobadas)');

    console.log('\n📋 TODOS LOS KPIs CALCULADOS:');
    console.log('─'.repeat(70));
    console.log(`✓ Tasa de Aprobación:              ${kpiData.tasaAprobacion.toFixed(2)}%`);
    console.log(`✓ Tiempo de Onboarding:            ${kpiData.tiempoOnboarding} minutos`);
    console.log(`✓ Índice Cartera Sin Errores:      ${kpiData.indiceCarteraSinErrores.toFixed(2)}%`);
    console.log(`✓ Efectividad de Recaudo:          ${kpiData.efectividadRecaudo}%`);
    console.log('─'.repeat(70));

    console.log('\n🎉 Test completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante el test:', error);
    throw error;
  } finally {
    await app.close();
  }
}

testTasaAprobacion()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });


