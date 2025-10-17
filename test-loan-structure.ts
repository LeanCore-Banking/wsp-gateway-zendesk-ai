import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MongoClientService } from './src/database/services/mongo-client.service';

async function testLoanStructure() {
  console.log('🔍 Verificando estructura de loan...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const mongoService = app.get(MongoClientService);

  try {
    await mongoService.ensureConnection();
    const db = mongoService['db'];

    if (!db) {
      console.error('❌ No se pudo conectar a la base de datos');
      return;
    }

    const loanCollection = db.collection('loan');

    // Contar total de loans
    const totalLoans = await loanCollection.countDocuments({});
    console.log(`📊 Total de loans en la colección: ${totalLoans}\n`);

    // Obtener un loan de ejemplo
    const sampleLoan = await loanCollection.findOne({});
    
    if (sampleLoan) {
      console.log('📄 Ejemplo de loan (primeros campos):');
      console.log('─'.repeat(60));
      console.log(`   _id: ${sampleLoan._id}`);
      console.log(`   created_at: ${sampleLoan.created_at || 'NO EXISTE'}`);
      console.log(`   createdAt: ${sampleLoan.createdAt || 'NO EXISTE'}`);
      console.log(`   date: ${sampleLoan.date || 'NO EXISTE'}`);
      console.log(`   disbursement_date: ${sampleLoan.disbursement_date || 'NO EXISTE'}`);
      console.log('─'.repeat(60));
      console.log('\n📋 Todos los campos disponibles:');
      console.log(Object.keys(sampleLoan).join(', '));
    } else {
      console.log('❌ No se encontró ningún loan en la colección');
    }

    // Buscar loans recientes (últimos 90 días) sin importar el campo de fecha
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    console.log(`\n🔍 Buscando loans de los últimos 90 días (desde ${ninetyDaysAgo.toISOString().split('T')[0]})...`);
    
    // Probar con diferentes campos de fecha
    const dateFields = ['created_at', 'createdAt', 'date', 'disbursement_date'];
    
    for (const field of dateFields) {
      const count = await loanCollection.countDocuments({
        [field]: {
          $gte: ninetyDaysAgo.toISOString()
        }
      });
      console.log(`   - Con campo "${field}": ${count} loans`);
    }

    console.log('\n🎉 Verificación completada!\n');

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error);
    throw error;
  } finally {
    await app.close();
  }
}

testLoanStructure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });

