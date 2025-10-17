import { NestFactory } from '@nestjs/core';
import { KpisService } from './src/kpis/kpis.service';
import { KpisModule } from './src/kpis/kpis.module';
import { MongoClientService } from './src/database/services/mongo-client.service';
import * as fs from 'fs';
import * as path from 'path';

async function testKPIsOctubre() {
  console.log('🧪 Generando KPIs para octubre 2025 (todas las fintechs excepto STOP-YOYO)...\n');

  try {
    // Crear aplicación NestJS
    const app = await NestFactory.createApplicationContext(KpisModule);
    const kpisService = app.get(KpisService);
    const mongoService = app.get(MongoClientService);

    console.log('✅ Servicios inicializados correctamente\n');

    // Verificar conexión a MongoDB
    try {
      await mongoService.ensureConnection();
      console.log('✅ Conexión a MongoDB establecida\n');
    } catch (error) {
      console.log('⚠️  MongoDB no disponible, continuando con datos mock\n');
    }

    // Definir el período específico: desde el 10 de octubre hacia atrás 30 días
    const fechaFin = new Date('2025-10-10'); // Viernes 10 de octubre de 2025
    const fechaInicio = new Date(fechaFin);
    fechaInicio.setDate(fechaInicio.getDate() - 30); // 30 días atrás

    console.log('📅 === Período de análisis ===');
    console.log(`   - Fecha inicio: ${fechaInicio.toISOString().split('T')[0]}`);
    console.log(`   - Fecha fin: ${fechaFin.toISOString().split('T')[0]}`);
    console.log(`   - Días de análisis: 30 días\n`);

    // Fintechs a procesar (excluyendo STOP-YOYO)
    const fintechsToProcess = ['Credilider', 'Presti', 'Socoda'];
    
    // Crear directorio para guardar los PDFs
    const outputDir = path.join(__dirname, 'pdfs-octubre-2025');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Directorio creado: ${outputDir}\n`);
    }

    const resultados: Array<{
      fintech: string;
      success: boolean;
      fileName?: string;
      error?: string;
      kpiData?: any;
    }> = [];

    // Procesar cada fintech
    for (const fintechName of fintechsToProcess) {
      console.log(`📊 === Procesando ${fintechName} ===`);
      
      try {
        // Generar KPIs para esta fintech con período específico usando el servicio
        const result = await kpisService.generateKPIsForFintechWithCustomPeriod(
          fintechName, 
          fechaInicio, 
          fechaFin
        );

        if (result.success && result.pdfBuffer) {
              // Guardar PDF en archivo
              const fileName = `leanCore-kpis-${fintechName.toLowerCase()}-octubre-2025.pdf`;
              const filePath = path.join(outputDir, fileName);
          
          fs.writeFileSync(filePath, result.pdfBuffer);
          
          console.log(`✅ PDF generado exitosamente para ${fintechName}`);
          console.log(`   - Archivo: ${fileName}`);
          console.log(`   - Ruta: ${filePath}`);
          console.log(`   - Tamaño: ${(result.pdfBuffer.length / 1024).toFixed(2)} KB`);
          
          if (result.data) {
            console.log(`   - Tasa de aprobación: ${result.data.tasaAprobacion.toFixed(2)}%`);
            console.log(`   - Tiempo de onboarding: ${result.data.tiempoOnboarding} minutos`);
            console.log(`   - Índice cartera sin errores: ${result.data.indiceCarteraSinErrores.toFixed(2)}%`);
            console.log(`   - Efectividad de recaudo: ${result.data.efectividadRecaudo}%`);
          }

          resultados.push({
            fintech: fintechName,
            success: true,
            fileName: fileName,
            kpiData: result.data
          });

        } else {
          console.log(`❌ Error generando KPIs para ${fintechName}:`, result.error);
          resultados.push({
            fintech: fintechName,
            success: false,
            error: result.error
          });
        }

      } catch (error) {
        console.log(`❌ Error procesando ${fintechName}:`, error.message);
        resultados.push({
          fintech: fintechName,
          success: false,
          error: error.message
        });
      }

      console.log(''); // Línea en blanco entre fintechs
    }

    // Resumen final
    console.log('📋 === RESUMEN FINAL ===');
    console.log(`📁 Directorio de salida: ${outputDir}`);
    console.log(`📅 Período analizado: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);
    console.log(`🏢 Fintechs procesadas: ${fintechsToProcess.join(', ')}`);
    console.log('');

    let exitosos = 0;
    let fallidos = 0;

    resultados.forEach(resultado => {
      if (resultado.success) {
        exitosos++;
        console.log(`✅ ${resultado.fintech}: ${resultado.fileName}`);
      } else {
        fallidos++;
        console.log(`❌ ${resultado.fintech}: ${resultado.error}`);
      }
    });

    console.log('');
    console.log(`📊 Total exitosos: ${exitosos}`);
    console.log(`❌ Total fallidos: ${fallidos}`);
    console.log('');

    if (exitosos > 0) {
      console.log('🎉 ¡PDFs generados exitosamente!');
      console.log(`📂 Revisa la carpeta: ${outputDir}`);
    } else {
      console.log('⚠️  No se generaron PDFs exitosamente');
    }

    await app.close();

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  }
}


// Ejecutar prueba
testKPIsOctubre().catch(console.error);
