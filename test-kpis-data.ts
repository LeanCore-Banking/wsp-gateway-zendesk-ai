import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KpisService } from './src/kpis/kpis.service';
import { MongoClientService } from './src/database/services/mongo-client.service';

async function testKPIsData() {
  const logger = console;
  logger.log('🔍 Verificando datos para KPIs...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const kpisService = app.get(KpisService);
  const mongoClientService = app.get(MongoClientService);

  try {
    // 1. Verificar conexión a MongoDB
    logger.log('📡 Verificando conexión a MongoDB...');
    await mongoClientService.ensureConnection();
    const db = mongoClientService['db'];
    
    if (!db) {
      logger.error('❌ No se pudo conectar a MongoDB');
      return;
    }
    logger.log('✅ Conexión a MongoDB establecida');

    // 2. Verificar colecciones
    logger.log('📋 Verificando colecciones...');
    const collections = await db.listCollections().toArray();
    logger.log(`Colecciones disponibles: ${collections.map(c => c.name).join(', ')}`);

    // 3. Verificar datos en middleware.lead
    logger.log('🔍 Verificando datos en middleware.lead...');
    const leadCollection = db.collection('lead');
    const totalLeads = await leadCollection.countDocuments();
    logger.log(`Total de leads en la colección: ${totalLeads}`);

    // Verificar leads de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLeads = await leadCollection.countDocuments({
      created_at: { $gte: thirtyDaysAgo.toISOString() }
    });
    logger.log(`Leads de los últimos 30 días: ${recentLeads}`);

    // Verificar leads de los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads7 = await leadCollection.countDocuments({
      created_at: { $gte: sevenDaysAgo.toISOString() }
    });
    logger.log(`Leads de los últimos 7 días: ${recentLeads7}`);

    // 4. Verificar datos en middleware.user
    logger.log('🔍 Verificando datos en middleware.user...');
    const userCollection = db.collection('user');
    const totalUsers = await userCollection.countDocuments();
    logger.log(`Total de users en la colección: ${totalUsers}`);

    const recentUsers = await userCollection.countDocuments({
      created_at: { $gte: thirtyDaysAgo.toISOString() }
    });
    logger.log(`Users de los últimos 30 días: ${recentUsers}`);

    const recentUsers7 = await userCollection.countDocuments({
      created_at: { $gte: sevenDaysAgo.toISOString() }
    });
    logger.log(`Users de los últimos 7 días: ${recentUsers7}`);

    // 5. Verificar entidades financieras específicas
    logger.log('🏦 Verificando entidades financieras...');
    
    const stopEntityId = 'f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e';
    const yoyoEntityId = '713bf1d6-9e5d-4b48-b211-7bc5ec736130';

    // Leads por entidad (últimos 30 días)
    const stopLeads30 = await leadCollection.countDocuments({
      financial_entity_id: stopEntityId,
      created_at: { $gte: thirtyDaysAgo.toISOString() }
    });
    const yoyoLeads30 = await leadCollection.countDocuments({
      financial_entity_id: yoyoEntityId,
      created_at: { $gte: thirtyDaysAgo.toISOString() }
    });

    logger.log(`STOP leads (últimos 30 días): ${stopLeads30}`);
    logger.log(`YOYO leads (últimos 30 días): ${yoyoLeads30}`);

    // Users por entidad (últimos 30 días)
    const stopUsers30 = await userCollection.countDocuments({
      financial_entity_id: stopEntityId,
      created_at: { $gte: thirtyDaysAgo.toISOString() }
    });
    const yoyoUsers30 = await userCollection.countDocuments({
      financial_entity_id: yoyoEntityId,
      created_at: { $gte: thirtyDaysAgo.toISOString() }
    });

    logger.log(`STOP users (últimos 30 días): ${stopUsers30}`);
    logger.log(`YOYO users (últimos 30 días): ${yoyoUsers30}`);

    // 6. Mostrar algunos ejemplos de datos
    if (recentLeads > 0) {
      logger.log('📄 Ejemplo de lead reciente:');
      const sampleLead = await leadCollection.findOne({
        created_at: { $gte: thirtyDaysAgo.toISOString() }
      });
      logger.log(`   - ID: ${sampleLead?._id}`);
      logger.log(`   - Financial Entity ID: ${sampleLead?.financial_entity_id}`);
      logger.log(`   - Created At: ${sampleLead?.created_at}`);
    }

    if (recentUsers > 0) {
      logger.log('👤 Ejemplo de user reciente:');
      const sampleUser = await userCollection.findOne({
        created_at: { $gte: thirtyDaysAgo.toISOString() }
      });
      logger.log(`   - ID: ${sampleUser?._id}`);
      logger.log(`   - Financial Entity ID: ${sampleUser?.financial_entity_id}`);
      logger.log(`   - Created At: ${sampleUser?.created_at}`);
    }

  } catch (error) {
    logger.error('❌ Error verificando datos:', error);
  } finally {
    await app.close();
    logger.log('🎉 Verificación completada!');
  }
}

testKPIsData().catch(console.error);
