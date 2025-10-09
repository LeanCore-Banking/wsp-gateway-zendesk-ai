import { Injectable, Logger } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoClientService {
  private readonly logger = new Logger(MongoClientService.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionAttempted = false;

  async ensureConnection(): Promise<void> {
    if (!this.client && !this.connectionAttempted) {
      await this.connect();
    }
  }

  async connect(): Promise<void> {
    this.connectionAttempted = true;
    
    try {
      // Usar MONGODB_URI (con DB) que es la convención estándar
      const mongoUri = process.env.MONGODB_URI || '';
      
      if (!mongoUri) {
        this.logger.warn('⚠️  MongoDB URI not configured. Running without MongoDB support.');
        this.logger.warn('   Set MONGODB_URI in your .env file to enable MongoDB');
        return;
      }
      
      this.logger.log(`🔌 Conectando a MongoDB...`);
      this.logger.debug(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')}`); // Ocultar credenciales
      
      // Agregar timeout de 5 segundos para evitar que se quede colgado
      this.client = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      
      this.logger.debug('   Intentando establecer conexión...');
      await this.client.connect();
      
      // Usar la base de datos 'middleware' específicamente
      this.db = this.client.db('middleware');
      const dbName = this.db.databaseName;
      
      this.logger.log(`✅ Conectado a MongoDB exitosamente`);
      this.logger.log(`   📦 Base de datos: ${dbName}`);
      
      // Listar colecciones para debugging
      const collections = await this.db.listCollections().toArray();
      this.logger.debug(`   📂 Colecciones disponibles: ${collections.map(c => c.name).join(', ')}`);
      
    } catch (error: any) {
      this.logger.error(`❌ Error al conectar a MongoDB: ${error.message}`);
      this.logger.error(`   Tipo de error: ${error.name}`);
      if (error.code) {
        this.logger.error(`   Código de error: ${error.code}`);
      }
      this.logger.warn('⚠️  Continuando sin conexión a MongoDB...');
      this.client = null;
      this.db = null;
      // No lanzar error, solo loggearlo
    }
  }

  async findLoansByPartialId(partialId: string): Promise<unknown[]> {
    this.logger.log(`🔍 Iniciando búsqueda por ID parcial: "${partialId}"`);
    
    await this.ensureConnection();
    
    if (!this.db) {
      this.logger.warn('⚠️  MongoDB no disponible, retornando lista vacía');
      return [];
    }

    try {
      const collectionName = 'loan'; // Nombre de la colección dentro de la BD 'middleware'
      this.logger.log(`   📂 Base de datos.Colección: middleware.${collectionName}`);
      
      const collection = this.db.collection(collectionName);
      
      // Crear regex para búsqueda case-insensitive
      const regex = new RegExp(partialId, 'i');
      this.logger.log(`   🔎 Patrón de búsqueda: /${partialId}/i`);
      this.logger.log(`   📝 Query MongoDB: { _id: /${partialId}/i }`);
      
      // Ejecutar búsqueda con límite de 5 resultados
      this.logger.debug('   ⏳ Ejecutando query en MongoDB (límite: 5)...');
      const results = await collection.find({ _id: regex } as any).limit(5).toArray();
      
      // Contar total de coincidencias sin límite
      const totalCount = await collection.countDocuments({ _id: regex } as any);
      
      this.logger.log(`   ✅ Búsqueda completada: ${results.length} de ${totalCount} resultado(s) total(es)`);
      
      if (results.length > 0) {
        this.logger.log(`   📋 IDs encontrados (mostrando máximo 5):`);
        results.forEach((loan: any, index) => {
          this.logger.log(`      ${index + 1}. ${loan._id}`);
        });
        
        if (totalCount > 5) {
          this.logger.warn(`   ⚠️  Hay ${totalCount - 5} resultados más no mostrados`);
        }
      } else {
        this.logger.warn(`   ⚠️  No se encontraron documentos con _id que coincida con "${partialId}"`);
        
        // Intentar buscar en la colección para ver si hay datos
        const count = await collection.countDocuments();
        this.logger.debug(`   ℹ️  Total de documentos en la colección: ${count}`);
        
        if (count > 0) {
          // Mostrar algunos IDs de ejemplo para debugging
          const samples = await collection.find({}).limit(3).toArray();
          this.logger.debug(`   📋 Ejemplos de IDs en la colección:`);
          samples.forEach((doc: any) => {
            this.logger.debug(`      - ${doc._id}`);
          });
        }
      }
      
      return results;
    } catch (error: any) {
      this.logger.error(`❌ Error buscando préstamos: ${error.message}`);
      this.logger.error(`   Stack: ${error.stack}`);
      return [];
    }
  }

  async findLoanById(id: string): Promise<Record<string, any> | null> {
    await this.ensureConnection();
    if (!this.db) {
      this.logger.warn('MongoDB no disponible');
      return null;
    }

    const collection = this.db.collection('loan'); // Colección dentro de BD 'middleware'

    try {
      const result = await collection.findOne({ _id: id } as any);
      return result;
    } catch (error) {
      console.error('Error finding loan by ID:', error);
      return null;
    }
  }
}
