import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';

async function testTiempoOnboarding() {
  console.log('🧪 Probando KPI: Tiempo de Onboarding\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const kpisService = app.get(KpisService);

  try {
    console.log('📊 Calculando KPIs...\n');
    
    const kpiData = await kpisService.calculateKPIs();

    console.log('\n✅ RESULTADO DEL KPI - TIEMPO DE ONBOARDING:');
    console.log('═'.repeat(70));
    console.log(`⏱️  Tiempo Promedio: ${kpiData.tiempoOnboarding} minutos`);
    console.log(`   Equivalente a: ${(kpiData.tiempoOnboarding / 60).toFixed(2)} horas`);
    console.log(`   Equivalente a: ${(kpiData.tiempoOnboarding / 1440).toFixed(2)} días`);
    console.log('═'.repeat(70));

    console.log('\n📊 FÓRMULA UTILIZADA:');
    console.log('   Tiempo de Onboarding = Promedio de (disbursement_date - created_at)');
    console.log('   Donde:');
    console.log('   - created_at: Fecha de creación del usuario (colección user)');
    console.log('   - disbursement_date: Fecha de desembolso del préstamo (colección loan)');

    console.log('\n📅 PERÍODO DE CONSULTA:');
    console.log(`   Inicio: ${kpiData.periodo.inicio.toISOString()}`);
    console.log(`   Fin:    ${kpiData.periodo.fin.toISOString()}`);
    console.log('   Rango:  Últimos 7 días');

    console.log('\n🔍 COLECCIONES CONSULTADAS:');
    console.log('   - middleware.loan (filtrado por disbursement_date)');
    console.log('   - middleware.user (relacionado por user_id)');

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

testTiempoOnboarding()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });


