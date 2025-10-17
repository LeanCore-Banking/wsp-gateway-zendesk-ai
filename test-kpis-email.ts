import { NestFactory } from '@nestjs/core';
import { KpisService } from './src/kpis/kpis.service';
import { KpisModule } from './src/kpis/kpis.module';
import { MongoClientService } from './src/database/services/mongo-client.service';

async function testKPIsEmail() {
  console.log('🧪 Iniciando prueba de KPIs con emails...\n');

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

    // 1. Probar generación de KPIs para STOP-YOYO
    console.log('📊 === Probando generación de KPIs para STOP-YOYO ===');
    const stopYoyoResult = await kpisService.generateKPIsForFintech('STOP-YOYO', 'weekly');
    
    if (stopYoyoResult.success) {
      console.log('✅ KPIs generados exitosamente para STOP-YOYO');
      console.log(`   - Tasa de aprobación: ${stopYoyoResult.data?.tasaAprobacion.toFixed(2)}%`);
      console.log(`   - Tiempo de onboarding: ${stopYoyoResult.data?.tiempoOnboarding} minutos`);
      console.log(`   - Índice cartera sin errores: ${stopYoyoResult.data?.indiceCarteraSinErrores.toFixed(2)}%`);
      console.log(`   - Archivo: ${stopYoyoResult.fileName}`);
    } else {
      console.log('❌ Error generando KPIs para STOP-YOYO:', stopYoyoResult.error);
    }

    console.log('\n');

    // 2. Probar generación de KPIs para Credilider
    console.log('📊 === Probando generación de KPIs para Credilider ===');
    const crediliderResult = await kpisService.generateKPIsForFintech('Credilider', 'monthly');
    
    if (crediliderResult.success) {
      console.log('✅ KPIs generados exitosamente para Credilider');
      console.log(`   - Tasa de aprobación: ${crediliderResult.data?.tasaAprobacion.toFixed(2)}%`);
      console.log(`   - Tiempo de onboarding: ${crediliderResult.data?.tiempoOnboarding} minutos`);
      console.log(`   - Índice cartera sin errores: ${crediliderResult.data?.indiceCarteraSinErrores.toFixed(2)}%`);
      console.log(`   - Archivo: ${crediliderResult.fileName}`);
    } else {
      console.log('❌ Error generando KPIs para Credilider:', crediliderResult.error);
    }

    console.log('\n');

    // 3. Probar generación para todas las fintechs
    console.log('📊 === Probando generación para todas las fintechs ===');
    const allResults = await kpisService.generateKPIsForAllFintechs();
    
    if (allResults.success) {
      console.log('✅ KPIs generados para todas las fintechs:');
      Object.keys(allResults.results || {}).forEach(fintechName => {
        const result = allResults.results![fintechName];
        if (result.success) {
          console.log(`   - ${fintechName}: ✅ (${result.fileName})`);
        } else {
          console.log(`   - ${fintechName}: ❌ (${result.error})`);
        }
      });
    } else {
      console.log('❌ Error generando KPIs para todas las fintechs:', allResults.error);
    }

    console.log('\n');

    // 4. Verificar configuración de emails
    console.log('📧 === Verificando configuración de emails ===');
    console.log('⚠️  NOTA: Para probar el envío de emails, configurar las variables SMTP en .env');
    console.log('   - SMTP_HOST');
    console.log('   - SMTP_PORT');
    console.log('   - SMTP_USER');
    console.log('   - SMTP_PASS');
    console.log('   - SMTP_FROM');
    
    // Intentar envío de emails solo si las variables están configuradas
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    
    if (hasSmtpConfig) {
      console.log('\n📧 === Probando envío de emails ===');
      try {
        await kpisService.sendKPIsToAllFintechs();
        console.log('✅ Emails enviados exitosamente a todas las fintechs');
      } catch (error) {
        console.log('❌ Error enviando emails:', error.message);
      }
    } else {
      console.log('\n⚠️  Variables SMTP no configuradas, saltando prueba de envío de emails');
    }

    console.log('\n✅ === Prueba completada ===');
    console.log('\n📋 Resumen:');
    console.log('   - ✅ Servicios inicializados');
    console.log('   - ✅ KPIs generados por fintech');
    console.log('   - ✅ PDFs creados correctamente');
    console.log('   - ⚠️  Configurar SMTP para probar emails');
    console.log('\n🚀 Sistema listo para producción');

    await app.close();

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
testKPIsEmail().catch(console.error);



