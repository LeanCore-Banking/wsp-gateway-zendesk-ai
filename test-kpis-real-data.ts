import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MongoClientService } from './src/database/services/mongo-client.service';

async function testKPIsRealData() {
  const logger = console;
  logger.log('🔍 Verificando datos reales para KPIs...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const mongoClientService = app.get(MongoClientService);

  try {
    // 1. Verificar conexión a MongoDB
    logger.log('📡 Conectando a MongoDB...');
    await mongoClientService.ensureConnection();
    const db = mongoClientService['db'];
    
    if (!db) {
      logger.error('❌ No se pudo conectar a MongoDB');
      return;
    }
    logger.log('✅ Conexión a MongoDB establecida');

    // 2. Entidades financieras conocidas
    const financialEntities = [
      { id: 'f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e', nombre: 'STOP' },
      { id: '713bf1d6-9e5d-4b48-b211-7bc5ec736130', nombre: 'YOYO' },
    ];

    // 3. Verificar datos en diferentes rangos de tiempo
    const ranges = [
      { days: 7, name: 'últimos 7 días' },
      { days: 30, name: 'últimos 30 días' },
      { days: 90, name: 'últimos 90 días' },
    ];

    for (const range of ranges) {
      logger.log(`\n📅 === VERIFICANDO ${range.name.toUpperCase()} ===`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range.days);
      
      logger.log(`📅 Fecha inicio: ${startDate.toISOString()}`);
      logger.log(`📅 Fecha fin: ${new Date().toISOString()}`);

      let totalLeads = 0;
      let totalUsers = 0;

      for (const entity of financialEntities) {
        logger.log(`\n🏦 Procesando entidad: ${entity.nombre} (${entity.id})`);

        // Contar leads
        const leadCollection = db.collection('lead');
        const leadsCount = await leadCollection.countDocuments({
          ecosystem: entity.id,
          created_at: { $gte: startDate.toISOString() }
        });
        logger.log(`   📋 Leads (solicitudes no aprobadas): ${leadsCount}`);

        // Contar users
        const userCollection = db.collection('user');
        const usersCount = await userCollection.countDocuments({
          ecosystem: entity.id,
          created_at: { $gte: startDate.toISOString() }
        });
        logger.log(`   👤 Users (solicitudes aprobadas): ${usersCount}`);

        // Calcular tasa de aprobación para esta entidad
        const totalSolicitudes = leadsCount + usersCount;
        const tasaAprobacion = totalSolicitudes > 0 ? (usersCount / totalSolicitudes) * 100 : 0;
        logger.log(`   📊 Tasa de aprobación ${entity.nombre}: ${tasaAprobacion.toFixed(2)}%`);

        totalLeads += leadsCount;
        totalUsers += usersCount;
      }

      // Calcular tasa de aprobación general
      const totalSolicitudes = totalLeads + totalUsers;
      const tasaAprobacionGeneral = totalSolicitudes > 0 ? (totalUsers / totalSolicitudes) * 100 : 0;
      
      logger.log(`\n📊 RESUMEN ${range.name.toUpperCase()}:`);
      logger.log(`   📋 Total leads: ${totalLeads}`);
      logger.log(`   👤 Total users: ${totalUsers}`);
      logger.log(`   📊 Total solicitudes: ${totalSolicitudes}`);
      logger.log(`   ✅ Tasa de aprobación general: ${tasaAprobacionGeneral.toFixed(2)}%`);
    }

    // 4. Mostrar algunos ejemplos de datos
    logger.log(`\n📄 === EJEMPLOS DE DATOS ===`);
    
    // Ejemplo de lead
    const leadCollection = db.collection('lead');
    const sampleLead = await leadCollection.findOne({});
    if (sampleLead) {
      logger.log(`📋 Ejemplo de Lead:`);
      logger.log(`   - ID: ${sampleLead._id}`);
      logger.log(`   - Ecosystem: ${sampleLead.ecosystem}`);
      logger.log(`   - Created At: ${sampleLead.created_at}`);
      logger.log(`   - Lead Status: ${sampleLead.lead_status}`);
    }

    // Ejemplo de user
    const userCollection = db.collection('user');
    const sampleUser = await userCollection.findOne({});
    if (sampleUser) {
      logger.log(`👤 Ejemplo de User:`);
      logger.log(`   - ID: ${sampleUser._id}`);
      logger.log(`   - Ecosystem: ${sampleUser.ecosystem}`);
      logger.log(`   - Created At: ${sampleUser.created_at}`);
      logger.log(`   - Status: ${sampleUser.status}`);
      logger.log(`   - Quota: ${sampleUser.quota}`);
    }

  } catch (error) {
    logger.error('❌ Error verificando datos:', error);
  } finally {
    await app.close();
    logger.log('\n🎉 Verificación completada!');
  }
}

testKPIsRealData().catch(console.error);
