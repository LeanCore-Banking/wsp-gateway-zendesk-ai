import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';
import * as fs from 'fs';
import * as path from 'path';

async function testKPIsStopYoyoPorMes() {
  console.log('🧪 Generando KPIs para STOP-YOYO por mes específico...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const kpisService = app.get(KpisService);

  try {
    // Crear directorio de salida
    const outputDir = 'pdfs-stop-yoyo-mensual';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Ejemplos de meses a probar
    const mesesAEvaluar = [
      { year: 2025, month: 5, nombre: 'Mayo' },    // Mayo 2025
      { year: 2025, month: 6, nombre: 'Junio' },   // Junio 2025
      { year: 2025, month: 7, nombre: 'Julio' },   // Julio 2025
      { year: 2025, month: 8, nombre: 'Agosto' },  // Agosto 2025
      { year: 2025, month: 9, nombre: 'Septiembre' }, // Septiembre 2025
      { year: 2025, month: 10, nombre: 'Octubre' },   // Octubre 2025
    ];

    console.log('📅 === Meses a evaluar ===');
    for (const mes of mesesAEvaluar) {
      console.log(`   - ${mes.nombre} ${mes.year} (mes ${mes.month})`);
    }
    console.log('');

    const resultados: any[] = [];

    for (const mesInfo of mesesAEvaluar) {
      console.log(`\n📊 === Generando KPIs para ${mesInfo.nombre.toUpperCase()} ${mesInfo.year} ===`);
      
      try {
        const result = await kpisService.generateKPIsForStopYoyoByMonth(mesInfo.year, mesInfo.month);
        
        if (result.success && result.pdfBuffer && result.fileName) {
          // Guardar PDF
          const pdfPath = path.join(outputDir, result.fileName);
          fs.writeFileSync(pdfPath, result.pdfBuffer);
          
          const fileSize = (result.pdfBuffer.length / 1024).toFixed(2);
          
          console.log(`✅ PDF generado exitosamente para ${mesInfo.nombre} ${mesInfo.year}`);
          console.log(`   - Archivo: ${result.fileName}`);
          console.log(`   - Ruta: ${pdfPath}`);
          console.log(`   - Tamaño: ${fileSize} KB`);
          console.log(`   - Tasa de aprobación: ${result.data?.tasaAprobacion.toFixed(2)}%`);
          console.log(`   - Tiempo de onboarding: ${result.data?.tiempoOnboarding} minutos`);
          console.log(`   - Índice cartera sin errores: ${result.data?.indiceCarteraSinErrores.toFixed(2)}%`);
          console.log(`   - Efectividad de recaudo: ${result.data?.efectividadRecaudo}%`);
          
          resultados.push({
            mes: mesInfo.nombre,
            year: mesInfo.year,
            success: true,
            fileName: result.fileName,
            fileSize: fileSize,
            kpis: result.data
          });
        } else {
          console.log(`❌ Error generando PDF para ${mesInfo.nombre} ${mesInfo.year}: ${result.error}`);
          resultados.push({
            mes: mesInfo.nombre,
            year: mesInfo.year,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.log(`❌ Error procesando ${mesInfo.nombre} ${mesInfo.year}:`, error.message);
        resultados.push({
          mes: mesInfo.nombre,
          year: mesInfo.year,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n📋 === RESUMEN FINAL ===');
    console.log(`📁 Directorio de salida: ${path.resolve(outputDir)}`);
    console.log(`🏢 Fintech procesada: STOP-YOYO`);
    console.log(`📅 Total de meses evaluados: ${mesesAEvaluar.length}`);
    
    const exitosos = resultados.filter(r => r.success).length;
    const fallidos = resultados.filter(r => !r.success).length;
    
    console.log(`✅ Total exitosos: ${exitosos}`);
    console.log(`❌ Total fallidos: ${fallidos}`);
    
    if (exitosos > 0) {
      console.log('\n📄 PDFs generados exitosamente:');
      resultados.filter(r => r.success).forEach(r => {
        console.log(`   - ${r.mes} ${r.year}: ${r.fileName} (${r.fileSize} KB)`);
      });
    }
    
    if (fallidos > 0) {
      console.log('\n❌ Errores encontrados:');
      resultados.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.mes} ${r.year}: ${r.error}`);
      });
    }

    console.log('\n🎉 ¡Test completado!');
    console.log(`📂 Revisa la carpeta: ${path.resolve(outputDir)}`);

  } catch (error) {
    console.error('\n❌ Error durante el test:', error);
    throw error;
  } finally {
    await app.close();
  }
}

testKPIsStopYoyoPorMes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });
