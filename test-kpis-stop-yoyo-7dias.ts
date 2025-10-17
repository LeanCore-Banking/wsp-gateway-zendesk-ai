import { NestFactory } from '@nestjs/core';
import { KpisService } from './src/kpis/kpis.service';
import { KpisModule } from './src/kpis/kpis.module';
import { MongoClientService } from './src/database/services/mongo-client.service';
import * as fs from 'fs';
import * as path from 'path';

async function testKPIsStopYoyo7Dias() {
  console.log('🧪 Generando KPIs para STOP-YOYO (últimos 7 días con datos reales)...\n');

  try {
    // Crear aplicación NestJS
    const app = await NestFactory.createApplicationContext(KpisModule);
    const kpisService = app.get(KpisService);
    const mongoService = app.get(MongoClientService);

    console.log('✅ Servicios inicializados correctamente\n');

    // Verificar conexión a MongoDB
    try {
      await mongoService.ensureConnection();
      console.log('✅ Conexión a MongoDB establecida - USANDO DATOS REALES\n');
    } catch (error) {
      console.log('⚠️  MongoDB no disponible, continuando con datos mock\n');
    }

    // Definir el período: últimos 7 días
    const fechaFin = new Date(); // Hoy
    const fechaInicio = new Date(fechaFin);
    fechaInicio.setDate(fechaInicio.getDate() - 7); // 7 días atrás

    console.log('📅 === Período de análisis ===');
    console.log(`   - Fecha inicio: ${fechaInicio.toISOString().split('T')[0]}`);
    console.log(`   - Fecha fin: ${fechaFin.toISOString().split('T')[0]}`);
    console.log(`   - Días de análisis: 7 días\n`);

    // Crear directorio para guardar los PDFs
    const outputDir = path.join(__dirname, 'pdfs-stop-yoyo-7dias');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Directorio creado: ${outputDir}\n`);
    }

    console.log('📊 === Procesando STOP-YOYO ===');
    
    try {
      // Generar KPIs para STOP-YOYO con período de 7 días usando el servicio
      const result = await kpisService.generateKPIsForFintechWithCustomPeriod(
        'STOP-YOYO', 
        fechaInicio, 
        fechaFin
      );

      if (result.success && result.pdfBuffer) {
        // Guardar PDF en archivo
        const fileName = `leanCore-kpis-stop-yoyo-7dias-${fechaFin.toISOString().split('T')[0]}.pdf`;
        const filePath = path.join(outputDir, fileName);
    
        fs.writeFileSync(filePath, result.pdfBuffer);
        
        console.log(`✅ PDF generado exitosamente para STOP-YOYO`);
        console.log(`   - Archivo: ${fileName}`);
        console.log(`   - Ruta: ${filePath}`);
        console.log(`   - Tamaño: ${(result.pdfBuffer.length / 1024).toFixed(2)} KB`);
        
        if (result.data) {
          console.log('\n📈 === KPIs CALCULADOS ===');
          console.log(`   - Tasa de aprobación: ${result.data.tasaAprobacion.toFixed(2)}%`);
          console.log(`   - Tiempo de onboarding: ${result.data.tiempoOnboarding} minutos`);
          console.log(`   - Índice cartera sin errores: ${result.data.indiceCarteraSinErrores.toFixed(2)}%`);
          console.log(`   - Efectividad de recaudo: ${result.data.efectividadRecaudo}%`);
        }

        console.log('\n🎉 ¡KPI de STOP-YOYO generado exitosamente!');
        console.log(`📂 Revisa la carpeta: ${outputDir}`);
        console.log(`📄 Archivo generado: ${fileName}`);

      } else {
        console.log(`❌ Error generando KPIs para STOP-YOYO:`, result.error);
      }

    } catch (error) {
      console.log(`❌ Error procesando STOP-YOYO:`, error.message);
    }

    await app.close();

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
testKPIsStopYoyo7Dias().catch(console.error);
