import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';
import { Logger } from '@nestjs/common';

async function testKPIsWithDateFilter() {
  const logger = new Logger('KPIsDateFilterTest');
  
  try {
    logger.log('🚀 Iniciando prueba del filtro por fecha en KPIs...');

    // Crear aplicación NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    const kpisService = app.get(KpisService);

    logger.log('📊 Probando cálculo de KPIs con filtro de fecha...');
    
    // Calcular fecha de hace 7 días para mostrar
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    logger.log(`📅 Filtro de fecha: desde ${sevenDaysAgo.toISOString()}`);
    logger.log(`📅 Fecha actual: ${new Date().toISOString()}`);
    logger.log(`📅 Diferencia: ${Math.round((new Date().getTime() - sevenDaysAgo.getTime()) / (1000 * 60 * 60 * 24))} días`);
    
    // Probar cálculo de KPIs
    const kpiData = await kpisService.calculateKPIs();
    
    logger.log('✅ KPIs calculados exitosamente:');
    logger.log(`   - Tasa de aprobación: ${kpiData.tasaAprobacion.toFixed(2)}%`);
    logger.log(`   - Período: ${kpiData.periodo.inicio.toISOString()} - ${kpiData.periodo.fin.toISOString()}`);
    logger.log(`   - Fecha generación: ${kpiData.fechaGeneracion.toISOString()}`);

    // Verificar que el período sea de 7 días
    const daysDifference = Math.round(
      (kpiData.periodo.fin.getTime() - kpiData.periodo.inicio.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDifference === 7) {
      logger.log('✅ Período correcto: 7 días');
    } else {
      logger.warn(`⚠️ Período incorrecto: ${daysDifference} días (debería ser 7)`);
    }

    await app.close();
    
    logger.log('🎉 Prueba del filtro por fecha completada exitosamente!');
    
  } catch (error) {
    logger.error('❌ Error en la prueba de filtro por fecha:', error);
    logger.error('Stack trace:', error.stack);
  }
}

// Ejecutar prueba
testKPIsWithDateFilter().catch(console.error);

