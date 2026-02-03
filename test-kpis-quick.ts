import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';
import { Logger } from '@nestjs/common';

async function quickKPIsTest() {
  const logger = new Logger('QuickKPIsTest');
  
  try {
    logger.log('🚀 Iniciando prueba rápida de KPIs...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const kpisService = app.get(KpisService);

    // 1. Probar cálculo de KPIs
    logger.log('📊 Calculando KPIs...');
    const kpiData = await kpisService.calculateKPIs();
    
    logger.log('✅ KPIs calculados:');
    logger.log(`   - Tasa aprobación: ${kpiData.tasaAprobacion.toFixed(2)}%`);
    logger.log(`   - Onboarding: ${kpiData.tiempoOnboarding} min`);
    logger.log(`   - Cartera sin errores: ${kpiData.indiceCarteraSinErrores.toFixed(2)}%`);
    logger.log(`   - Efectividad recaudo: ${kpiData.efectividadRecaudo}%`);

    // 2. Probar generación de PDF
    logger.log('📄 Generando PDF...');
    const result = await kpisService.generateKPIsWithPDF();
    
    if (result.success && result.pdfBuffer && result.fileName) {
      logger.log(`✅ PDF generado: ${result.fileName}`);
      logger.log(`   - Tamaño: ${result.pdfBuffer.length} bytes`);
      
      // Guardar PDF
      const fs = require('fs');
      fs.writeFileSync(`./${result.fileName}`, result.pdfBuffer);
      logger.log(`💾 PDF guardado como: ${result.fileName}`);
    } else {
      logger.error('❌ Error generando PDF:', result.error || 'PDF buffer o filename no disponible');
    }

    await app.close();
    logger.log('🎉 Prueba rápida completada!');
    
  } catch (error) {
    logger.error('❌ Error en prueba rápida:', error.message);
  }
}

quickKPIsTest().catch(console.error);
