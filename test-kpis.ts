import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';
import { Logger } from '@nestjs/common';

async function testKPIs() {
  const logger = new Logger('KPIsTest');
  
  try {
    logger.log('🚀 Iniciando prueba del módulo de KPIs...');

    // Crear aplicación NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    const kpisService = app.get(KpisService);

    logger.log('📊 Probando cálculo de KPIs...');
    
    // 1. Probar cálculo de KPIs
    const kpiData = await kpisService.calculateKPIs();
    
    logger.log('✅ KPIs calculados exitosamente:');
    logger.log(`   - Tasa de aprobación: ${kpiData.tasaAprobacion.toFixed(2)}%`);
    logger.log(`   - Tiempo onboarding: ${kpiData.tiempoOnboarding} minutos`);
    logger.log(`   - Índice cartera sin errores: ${kpiData.indiceCarteraSinErrores.toFixed(2)}%`);
    logger.log(`   - Efectividad recaudo: ${kpiData.efectividadRecaudo}%`);
    logger.log(`   - Fecha generación: ${kpiData.fechaGeneracion.toISOString()}`);
    logger.log(`   - Período: ${kpiData.periodo.inicio.toLocaleDateString()} - ${kpiData.periodo.fin.toLocaleDateString()}`);

    // 2. Probar generación de PDF
    logger.log('📄 Probando generación de PDF...');
    
    const result = await kpisService.generateKPIsWithPDF();
    
    if (result.success && result.pdfBuffer) {
      logger.log(`✅ PDF generado exitosamente: ${result.fileName}`);
      logger.log(`   - Tamaño del PDF: ${result.pdfBuffer.length} bytes`);
      logger.log(`   - Nombre del archivo: ${result.fileName}`);
      
      // Guardar PDF localmente para verificación
      const fs = require('fs');
      const path = require('path');
      
      const outputPath = path.join(__dirname, result.fileName || 'test-kpis.pdf');
      fs.writeFileSync(outputPath, result.pdfBuffer);
      
      logger.log(`💾 PDF guardado en: ${outputPath}`);
    } else {
      logger.error('❌ Error generando PDF:', result.error);
    }

    // 3. Probar cronjob manual
    logger.log('⏰ Probando cronjob manual...');
    
    try {
      await kpisService.generateWeeklyKPIs();
      logger.log('✅ Cronjob ejecutado exitosamente');
    } catch (error) {
      logger.error('❌ Error ejecutando cronjob:', error.message);
    }

    await app.close();
    
    logger.log('🎉 Prueba del módulo de KPIs completada exitosamente!');
    
  } catch (error) {
    logger.error('❌ Error en la prueba de KPIs:', error);
    logger.error('Stack trace:', error.stack);
  }
}

// Ejecutar prueba
testKPIs().catch(console.error);

