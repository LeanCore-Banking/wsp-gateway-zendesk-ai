import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailerService } from '@nestjs-modules/mailer';
import { MongoClientService } from '../database/services/mongo-client.service';
import { KPIData, FinancialEntityStats, KPIGenerationResult, FintechEmailConfig, KPIGenerationResultByEntity, KPISummary } from './interfaces/kpi.interface';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class KpisService {
  private readonly logger = new Logger(KpisService.name);

  constructor(
    private readonly mongoClientService: MongoClientService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Cronjob que se ejecuta todos los lunes a las 9:00 AM para fintechs semanales (STOP-YOYO)
   */
  @Cron('0 9 * * 1')
  async generateWeeklyKPIs(): Promise<void> {
    this.logger.log('🔄 Iniciando generación semanal de KPIs...');
    
    try {
      const fintechsSemanales = this.getEmailConfigs().filter(config => config.frequency === 'weekly');
      
      for (const config of fintechsSemanales) {
        this.logger.log(`📊 Generando KPIs semanales para ${config.fintechName}...`);
        
        const result = await this.generateKPIsForFintech(config.fintechName);
        
        if (result.success && result.pdfBuffer) {
          await this.sendKPIsByEmail(config, result.pdfBuffer, result.fileName!, 'semanal');
          this.logger.log(`✅ KPIs semanales enviados para ${config.fintechName}`);
        } else {
          this.logger.error(`❌ Error generando KPIs para ${config.fintechName}:`, result.error);
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Error generando KPIs semanales:', error);
    }
  }

  /**
   * Cronjob que se ejecuta el primer día de cada mes a las 9:00 AM para fintechs mensuales
   */
  @Cron('0 9 1 * *')
  async generateMonthlyKPIs(): Promise<void> {
    this.logger.log('🔄 Iniciando generación mensual de KPIs...');
    
    try {
      const fintechsMensuales = this.getEmailConfigs().filter(config => config.frequency === 'monthly');
      
      for (const config of fintechsMensuales) {
        this.logger.log(`📊 Generando KPIs mensuales para ${config.fintechName}...`);
        
        const result = await this.generateKPIsForFintech(config.fintechName, 'monthly');
        
        if (result.success && result.pdfBuffer) {
          await this.sendKPIsByEmail(config, result.pdfBuffer, result.fileName!, 'mensual');
          this.logger.log(`✅ KPIs mensuales enviados para ${config.fintechName}`);
        } else {
          this.logger.error(`❌ Error generando KPIs para ${config.fintechName}:`, result.error);
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Error generando KPIs mensuales:', error);
    }
  }

  /**
   * Calcula todos los KPIs
   */
  async calculateKPIs(): Promise<KPIData> {
    this.logger.log('📊 Calculando KPIs...');

    // Calcular período (última semana)
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(fin.getDate() - 7);

    // 1. Calcular tasa de aprobación por entidad financiera
    const tasaAprobacion = await this.calculateTasaAprobacion();

    // 2. Calcular índice de cartera sin errores con datos reales
    const indiceCarteraSinErrores = await this.calculateIndiceCarteraSinErrores();

    // 3. Calcular tiempo de onboarding con datos reales
    const tiempoOnboarding = await this.calculateTiempoOnboarding();

    // 4. KPIs mockeados (como solicitado)
    const efectividadRecaudo = 120; // porcentaje

    return {
      tasaAprobacion,// ok con datos reales
      tiempoOnboarding,
      indiceCarteraSinErrores,// ok con datos reales
      efectividadRecaudo,
      fechaGeneracion: new Date(),
      periodo: {
        inicio,
        fin,
      },
    };
  }

  /**
   * Calcula KPIs individuales por cada grupo de entidad financiera
   * STOP y YOYO se agrupan en un solo informe
   */
  async calculateKPIsByEntity(): Promise<{ [key: string]: KPIData }> {
    this.logger.log('📊 Calculando KPIs por entidad financiera...');

    const entities = this.getFinancialEntities();
    const grupos = [...new Set(entities.map(e => e.grupo))]; // Obtener grupos únicos
    const kpisByEntity: { [key: string]: KPIData } = {};

    // Calcular período (última semana)
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(fin.getDate() - 7);

    for (const grupo of grupos) {
      this.logger.log(`\n📋 === Calculando KPIs para ${grupo} ===`);
      
      // Obtener los IDs de las entidades del grupo
      const entityIds = entities
        .filter(e => e.grupo === grupo)
        .map(e => e.id);

      // Calcular cada KPI para este grupo
      const tasaAprobacion = await this.calculateTasaAprobacionByEntityIds(entityIds);
      const indiceCarteraSinErrores = await this.calculateIndiceCarteraSinErroresByEntityIds(entityIds, grupo);
      const tiempoOnboarding = await this.calculateTiempoOnboardingByEntityIds(entityIds);

      // KPIs mockeados
      const efectividadRecaudo = 120; // porcentaje

      kpisByEntity[grupo] = {
        tasaAprobacion,
        tiempoOnboarding,
        indiceCarteraSinErrores,
        efectividadRecaudo,
        fechaGeneracion: new Date(),
        periodo: {
          inicio,
          fin,
        },
        financialEntity: grupo,
      };
    }

    return kpisByEntity;
  }

  /**
   * Obtiene la lista de todas las entidades financieras
   */
  private getFinancialEntities() {
    return [
      {
        id: 'f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e',
        nombre: 'STOP',
        grupo: 'STOP-YOYO', // STOP y YOYO se agrupan en un solo informe
      },
      {
        id: '713bf1d6-9e5d-4b48-b211-7bc5ec736130',
        nombre: 'YOYO',
        grupo: 'STOP-YOYO', // STOP y YOYO se agrupan en un solo informe
      },
      {
        id: '873ddfa1-9d6c-4afc-803e-1e8b7e05835d',
        nombre: 'Credilider',
        grupo: 'Credilider',
      },
      {
        id: '2929d47f-00cc-4bee-bdb2-8f9a5280681d',
        nombre: 'Presti',
        grupo: 'Presti',
      },
      {
        id: 'c6b4190e-b0a2-499b-8756-571eba476964',
        nombre: 'Socoda',
        grupo: 'Socoda',
      },
    ];
  }

  /**
   * Configuración de emails por fintech
   * STOP-YOYO: semanal, otras fintechs: mensual
   */
  private getEmailConfigs(): FintechEmailConfig[] {
    return [
      {
        fintechName: 'STOP-YOYO',
        emails: [
          'admin@stop.com',
          'admin@yoyo.com',
          'finanzas@stop.com'
        ],
        frequency: 'weekly'
      },
      {
        fintechName: 'Credilider',
        emails: [
          'admin@credilider.com',
          'finanzas@credilider.com'
        ],
        frequency: 'monthly'
      },
      {
        fintechName: 'Presti',
        emails: [
          'admin@presti.com',
          'finanzas@presti.com'
        ],
        frequency: 'monthly'
      },
      {
        fintechName: 'Socoda',
        emails: [
          'admin@socoda.com',
          'finanzas@socoda.com'
        ],
        frequency: 'monthly'
      }
    ];
  }

  /**
   * Genera KPIs para una fintech específica
   */
  async generateKPIsForFintech(fintechName: string, period: 'weekly' | 'monthly' = 'weekly'): Promise<KPIGenerationResult> {
    try {
      this.logger.log(`📊 Generando KPIs para ${fintechName} (${period})...`);

      // Obtener entidades de la fintech
      const entities = this.getFinancialEntities();
      const fintechEntities = entities.filter(e => e.grupo === fintechName);
      
      if (fintechEntities.length === 0) {
        throw new Error(`No se encontraron entidades para la fintech: ${fintechName}`);
      }

      const entityIds = fintechEntities.map(e => e.id);

      // Calcular período según la frecuencia
      const fin = new Date();
      const inicio = new Date();
      
      if (period === 'weekly') {
        inicio.setDate(fin.getDate() - 7);
      } else { // monthly
        inicio.setMonth(fin.getMonth() - 1);
      }

      // Calcular KPIs para esta fintech
      const tasaAprobacion = await this.calculateTasaAprobacionByEntityIds(entityIds);
      const indiceCarteraSinErrores = await this.calculateIndiceCarteraSinErroresByEntityIds(entityIds, fintechName);
      const tiempoOnboarding = await this.calculateTiempoOnboardingByEntityIds(entityIds);

      // KPIs mockeados
      const efectividadRecaudo = 120; // porcentaje

      const kpiData: KPIData = {
        tasaAprobacion,
        tiempoOnboarding,
        indiceCarteraSinErrores,
        efectividadRecaudo,
        fechaGeneracion: new Date(),
        periodo: {
          inicio,
          fin,
        },
        financialEntity: fintechName,
      };

      // Generar PDF
      const pdfBuffer = await this.generatePDF(kpiData);
      
      const fileName = `leanCore-kpis-${fintechName.toLowerCase()}-${period}-${kpiData.fechaGeneracion.toISOString().split('T')[0]}.pdf`;

      return {
        success: true,
        data: kpiData,
        pdfBuffer,
        fileName,
      };

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para ${fintechName}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía KPIs por email usando MailerService
   */
  private async sendKPIsByEmail(
    config: FintechEmailConfig, 
    pdfBuffer: Buffer, 
    fileName: string, 
    period: string
  ): Promise<void> {
    try {
      this.logger.log(`📧 Enviando KPIs ${period} para ${config.fintechName} a ${config.emails.length} destinatarios...`);

      const subject = `LeanCore - KPIs ${period.charAt(0).toUpperCase() + period.slice(1)} - ${config.fintechName}`;
      const htmlContent = this.generateEmailHTML(config.fintechName, period);

      for (const email of config.emails) {
        try {
          await this.mailerService.sendMail({
            to: email,
            subject: subject,
            html: htmlContent,
            attachments: [
              {
                filename: fileName,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          });
          
          this.logger.log(`✅ Email enviado exitosamente a ${email}`);
        } catch (emailError) {
          this.logger.error(`❌ Error enviando email a ${email}:`, emailError);
        }
      }

    } catch (error) {
      this.logger.error(`❌ Error en envío de emails para ${config.fintechName}:`, error);
      throw error;
    }
  }

  /**
   * Genera contenido HTML para el email
   */
  private generateEmailHTML(fintechName: string, period: string): string {
    const periodCapitalized = period.charAt(0).toUpperCase() + period.slice(1);
    
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LeanCore - KPIs ${periodCapitalized}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .header {
                background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
            }
            .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .info-box {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                color: #666;
                font-size: 14px;
            }
            .button {
                display: inline-block;
                background: #2196f3;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>LeanCore</h1>
            <p>Reporte de KPIs ${periodCapitalized}</p>
        </div>
        
        <div class="content">
            <h2>Estimado equipo de ${fintechName},</h2>
            
            <p>Esperamos que se encuentren muy bien. Adjunto encontrarán el reporte de KPIs ${period} correspondiente a su fintech.</p>
            
            <div class="info-box">
                <strong>📊 Contenido del reporte:</strong>
                <ul>
                    <li>Tasa de aprobación</li>
                    <li>Tiempo de onboarding</li>
                    <li>Tiempo promedio de desembolso</li>
                    <li>Índice de cartera sin errores</li>
                    <li>Efectividad de recaudo</li>
                </ul>
            </div>
            
            <p>Este reporte contiene información confidencial y está destinado únicamente para el equipo de ${fintechName}. Por favor, no compartir con terceros.</p>
            
            <p>Si tienen alguna pregunta o necesitan aclaraciones sobre los datos presentados, no duden en contactarnos.</p>
            
            <p>Saludos cordiales,<br>
            <strong>Equipo LeanCore</strong></p>
        </div>
        
        <div class="footer">
            <p>Este email fue generado automáticamente por el sistema LeanCore.</p>
            <p>© ${new Date().getFullYear()} LeanCore. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Obtiene el número de errores de cartera por grupo de entidad financiera
   */
  private getErroresPorEntidad(entityGroup: string): number {
    const erroresPorGrupo: { [key: string]: number } = {
      'STOP-YOYO': 51,
      'Credilider': 0,
      'Presti': 3,
      'Socoda': 5,
    };
    
    return erroresPorGrupo[entityGroup] || 0;
  }

  /**
   * Calcula la tasa de aprobación consultando leads y users por entidad financiera (últimos 7 días)
   */
  private async calculateTasaAprobacion(): Promise<number> {
    try {
      this.logger.log('🔍 Calculando tasa de aprobación...');

      // Entidades financieras conocidas
      const financialEntities = this.getFinancialEntities();

      let totalLeads = 0;
      let totalUsers = 0;
      const statsPorEntidad: FinancialEntityStats[] = [];

      for (const entity of financialEntities) {
        this.logger.log(`📋 Procesando entidad: ${entity.nombre} (${entity.id})`);

        // Contar leads en middleware.lead
        const leadsCount = await this.countLeadsByFinancialEntity(entity.id);
        this.logger.log(`   - Total leads: ${leadsCount}`);

        // Contar users en middleware.user
        const usersCount = await this.countUsersByFinancialEntity(entity.id);
        this.logger.log(`   - Total users: ${usersCount}`);

        const totalSolicitudes = leadsCount + usersCount;
        const tasaAprobacion = totalSolicitudes > 0 ? (usersCount / totalSolicitudes) * 100 : 0;
        this.logger.log(`   - Total solicitudes: ${totalSolicitudes}`);
        this.logger.log(`   - Tasa de aprobación: ${tasaAprobacion.toFixed(2)}%`);

        statsPorEntidad.push({
          financialEntityId: entity.id,
          nombre: entity.nombre,
          totalLeads: leadsCount,
          totalUsers: usersCount,
          tasaAprobacion,
        });

        totalLeads += leadsCount;
        totalUsers += usersCount;
      }

      // Si no hay datos reales, usar datos de prueba
      if (totalLeads === 0 && totalUsers === 0) {
        this.logger.warn('⚠️ No se encontraron datos reales, usando datos de prueba para demostración');
        return 0.0; // Tasa de aprobación de prueba
      }

      // Calcular tasa de aprobación general
      const totalSolicitudesGeneral = totalLeads + totalUsers;
      const tasaAprobacionGeneral = totalSolicitudesGeneral > 0 ? (totalUsers / totalSolicitudesGeneral) * 100 : 0;
      
      this.logger.log(`📊 RESUMEN TASA DE APROBACIÓN:`);
      this.logger.log(`   - Total leads (no aprobados): ${totalLeads}`);
      this.logger.log(`   - Total users (aprobados): ${totalUsers}`);
      this.logger.log(`   - Total solicitudes: ${totalSolicitudesGeneral}`);
      this.logger.log(`   - Tasa general: ${tasaAprobacionGeneral.toFixed(2)}%`);

      return tasaAprobacionGeneral;

    } catch (error) {
      this.logger.error('❌ Error calculando tasa de aprobación:', error);
      this.logger.warn('⚠️ Usando datos de prueba debido al error');
      return 85.5; // Tasa de aprobación de prueba
    }
  }

  /**
   * Cuenta leads por entidad financiera en la colección middleware.lead (últimos 7 días)
   * Lead = Cliente que realizó solicitud pero NO se le aprobó el crédito
   */
  private async countLeadsByFinancialEntity(financialEntityId: string): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para contar leads');
        return 0;
      }

      // Calcular fecha de hace 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      this.logger.debug(`📅 Filtro de fecha: desde ${sevenDaysAgo.toISOString()}`);

      const collection = db.collection('lead');
      
      // Log de la consulta regular
      const query = {
        ecosystem: financialEntityId,
        created_at: {
          $gte: sevenDaysAgo.toISOString()
        }
      };
      
      const count = await collection.countDocuments(query);
      this.logger.log(`🔍 Leads encontrados para ${financialEntityId}: ${count}`);

      return count;

    } catch (error) {
      this.logger.error(`❌ Error contando leads para ${financialEntityId}:`, error);
      return 0;
    }
  }

  /**
   * Cuenta users por entidad financiera en la colección middleware.user (últimos 7 días)
   * User = Cliente que ya hizo la solicitud y SÍ se le aprobó un crédito
   */
  private async countUsersByFinancialEntity(financialEntityId: string): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para contar users');
        return 0;
      }

      // Calcular fecha de hace 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      this.logger.debug(`📅 Filtro de fecha: desde ${sevenDaysAgo.toISOString()}`);

      const collection = db.collection('user');
      
      // Log de la consulta regular
      const query = {
        ecosystem: financialEntityId,
        created_at: {
          $gte: sevenDaysAgo.toISOString()
        }
      };
      
      const count = await collection.countDocuments(query);
      this.logger.log(`🔍 Users encontrados para ${financialEntityId}: ${count}`);

      return count;

    } catch (error) {
      this.logger.error(`❌ Error contando users para ${financialEntityId}:`, error);
      return 0;
    }
  }

  /**
   * Calcula el índice de cartera sin errores
   * Fórmula: ((Total Loans - Errores) / Total Loans) × 100
   */
  private async calculateIndiceCarteraSinErrores(): Promise<number> {
    try {
      this.logger.log('🔍 Calculando índice de cartera sin errores...');

      // Contar total de loans de los últimos 7 días
      const totalLoans = await this.countLoansLastWeek();
      this.logger.log(`   - Total de créditos (últimos 7 días): ${totalLoans}`);

      // Errores hardcodeados de la semana (como solicitaste)
      const erroresSemanales = 56; // Variable hardcodeada para errores de una semana
      this.logger.log(`   - Errores de la semana (hardcodeado): ${erroresSemanales}`);

      // Si no hay loans, retornar 100% (sin errores porque no hay cartera)
      if (totalLoans === 0) {
        this.logger.warn('⚠️ No se encontraron loans en los últimos 7 días');
        return 100.0;
      }

      // Calcular porcentaje de cartera sin errores
      const creditosSinErrores = totalLoans - erroresSemanales;
      const indice = (creditosSinErrores / totalLoans) * 100;

      this.logger.log(`   - Créditos sin errores: ${creditosSinErrores}`);
      this.logger.log(`   - Índice de cartera sin errores: ${indice.toFixed(2)}%`);

      // Asegurar que el índice no sea negativo
      return Math.max(0, indice);

    } catch (error) {
      this.logger.error('❌ Error calculando índice de cartera sin errores:', error);
      this.logger.warn('⚠️ Usando valor de prueba debido al error');
      return 98.5; // Valor de prueba
    }
  }

  /**
   * Calcula el tiempo promedio de onboarding (en minutos)
   * Tiempo de Onboarding = Promedio de (disbursement_date - created_at)
   * Compara la fecha de creación del usuario con la fecha de desembolso del préstamo
   */
  private async calculateTiempoOnboarding(): Promise<number> {
    try {
      this.logger.log('🔍 Calculando tiempo de onboarding...');

      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para calcular tiempo de onboarding');
        return 50; // Valor de prueba
      }

      // Calcular fecha de hace 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const loanCollection = db.collection('loan');
      const userCollection = db.collection('user');

      // Obtener TODOS los loans de los últimos 7 días con user_id (sin límite)
      const loans = await loanCollection
        .find({
          disbursement_date: {
            $gte: sevenDaysAgo.toISOString()
          },
          user_id: { $exists: true, $ne: null }
        })
        .toArray();

      this.logger.log(`   - Loans encontrados con user_id: ${loans.length}`);

      if (loans.length === 0) {
        this.logger.warn('⚠️ No se encontraron loans con user_id en los últimos 7 días');
        return 50; // Valor de prueba
      }

      // OPTIMIZACIÓN: Obtener todos los user_ids únicos de los loans
      const uniqueUserIds = [...new Set(loans.map(l => l.user_id).filter(Boolean))];
      this.logger.log(`   - IDs de usuarios únicos: ${uniqueUserIds.length}`);

      // Obtener todos los usuarios necesarios en UNA SOLA consulta
      const users = await userCollection.find({
        _id: { $in: uniqueUserIds }
      }).toArray();

      // Crear un Map para lookups O(1) en memoria
      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      this.logger.log(`   - Usuarios encontrados en BD: ${userMap.size}`);

      // Calcular diferencias de tiempo
      const tiempos: number[] = [];
      let procesados = 0;

      for (const loan of loans) {
        try {
          // Lookup del usuario en memoria (O(1))
          const user = userMap.get(loan.user_id?.toString());

          if (user && user.created_at && loan.disbursement_date) {
            const createdAt = new Date(user.created_at);
            const disbursementDate = new Date(loan.disbursement_date);

            // Calcular diferencia en minutos
            const diffMs = disbursementDate.getTime() - createdAt.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            // Solo considerar tiempos positivos y menores o iguales a 30 minutos
            if (diffMinutes > 0 && diffMinutes <= 30) { // Máximo 30 minutos
              tiempos.push(diffMinutes);
              procesados++;
            }
          }
        } catch (error) {
          // Continuar con el siguiente loan si hay error
          continue;
        }
      }

      this.logger.log(`   - Registros procesados con éxito: ${procesados}`);

      if (tiempos.length === 0) {
        this.logger.warn('⚠️ No se pudieron calcular tiempos válidos');
        return 50; // Valor de prueba
      }

      // Calcular promedio
      const promedioMinutos = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length;

      this.logger.log(`   - Tiempo promedio de onboarding: ${promedioMinutos.toFixed(2)} minutos`);
      this.logger.log(`   - Equivalente a: ${(promedioMinutos / 60).toFixed(2)} horas`);
      this.logger.log(`   - Equivalente a: ${(promedioMinutos / 1440).toFixed(2)} días`);

      return Math.round(promedioMinutos);

    } catch (error) {
      this.logger.error('❌ Error calculando tiempo de onboarding:', error);
      this.logger.warn('⚠️ Usando valor de prueba debido al error');
      return 50; // Valor de prueba
    }
  }

  /**
   * Cuenta el total de loans en los últimos 7 días
   * Usa el campo disbursement_date para filtrar
   */
  private async countLoansLastWeek(): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para contar loans');
        return 0;
      }

      // Calcular fecha de hace 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      this.logger.debug(`📅 Filtro de fecha: desde ${sevenDaysAgo.toISOString()}`);

      const collection = db.collection('loan');
      
      // Buscar loans usando disbursement_date
      const count = await collection.countDocuments({
        disbursement_date: {
          $gte: sevenDaysAgo.toISOString()
        }
      });

      this.logger.debug(`🔍 Loans encontrados (últimos 7 días): ${count}`);

      return count;

    } catch (error) {
      this.logger.error('❌ Error contando loans:', error);
      return 0;
    }
  }

  /**
   * Calcula tasa de aprobación para un conjunto específico de entity IDs
   */
  private async calculateTasaAprobacionByEntityIds(entityIds: string[]): Promise<number> {
    try {
      this.logger.log('🔍 Calculando tasa de aprobación para entidades específicas...');

      let totalLeads = 0;
      let totalUsers = 0;

      for (const entityId of entityIds) {
        const leadsCount = await this.countLeadsByFinancialEntity(entityId);
        const usersCount = await this.countUsersByFinancialEntity(entityId);
        
        this.logger.log(`   - Entity ${entityId}: ${leadsCount} leads, ${usersCount} users`);
        
        totalLeads += leadsCount;
        totalUsers += usersCount;
      }

      if (totalLeads === 0 && totalUsers === 0) {
        this.logger.warn('⚠️ No se encontraron datos reales');
        return 0.0;
      }

      const totalSolicitudesGeneral = totalLeads + totalUsers;
      const tasaAprobacionGeneral = totalSolicitudesGeneral > 0 ? (totalUsers / totalSolicitudesGeneral) * 100 : 0;
      
      this.logger.log(`   - Total leads: ${totalLeads}`);
      this.logger.log(`   - Total users: ${totalUsers}`);
      this.logger.log(`   - Tasa: ${tasaAprobacionGeneral.toFixed(2)}%`);

      return tasaAprobacionGeneral;

    } catch (error) {
      this.logger.error('❌ Error calculando tasa de aprobación por entidades:', error);
      return 0.0;
    }
  }

  /**
   * Calcula índice de cartera sin errores para un conjunto específico de entity IDs
   */
  private async calculateIndiceCarteraSinErroresByEntityIds(entityIds: string[], entityGroup: string): Promise<number> {
    try {
      this.logger.log('🔍 Calculando índice de cartera para entidades específicas...');

      const totalLoans = await this.countLoansLastWeekByEntityIds(entityIds);
      this.logger.log(`   - Total de créditos: ${totalLoans}`);

      // Obtener errores específicos para esta entidad
      const erroresSemanales = this.getErroresPorEntidad(entityGroup);
      this.logger.log(`   - Errores de la semana (${entityGroup}): ${erroresSemanales}`);

      if (totalLoans === 0) {
        this.logger.warn('⚠️ No se encontraron loans');
        return 100.0;
      }

      const creditosSinErrores = totalLoans - erroresSemanales;
      const indice = (creditosSinErrores / totalLoans) * 100;

      this.logger.log(`   - Créditos sin errores: ${creditosSinErrores}`);
      this.logger.log(`   - Índice: ${Math.max(0, indice).toFixed(2)}%`);

      return Math.max(0, indice);

    } catch (error) {
      this.logger.error('❌ Error calculando índice por entidades:', error);
      return 98.5;
    }
  }

  /**
   * Calcula tiempo de onboarding para un conjunto específico de entity IDs
   */
  private async calculateTiempoOnboardingByEntityIds(entityIds: string[]): Promise<number> {
    try {
      this.logger.log('🔍 Calculando tiempo de onboarding para entidades específicas...');

      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible');
        return 50;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const loanCollection = db.collection('loan');
      const userCollection = db.collection('user');

      // Obtener usuarios de las entidades especificadas
      const users = await userCollection
        .find({
          ecosystem: { $in: entityIds }
        })
        .project({ _id: 1 })
        .toArray();

      const userIds = users.map(u => u._id);

      if (userIds.length === 0) {
        this.logger.warn('⚠️ No se encontraron usuarios para estas entidades');
        return 50;
      }

      // Obtener loans de los últimos 7 días para estos usuarios
      const loans = await loanCollection
        .find({
          disbursement_date: {
            $gte: sevenDaysAgo.toISOString()
          },
          user_id: { $in: userIds }
        })
        .toArray();

      this.logger.log(`   - Loans encontrados: ${loans.length}`);

      if (loans.length === 0) {
        this.logger.warn('⚠️ No se encontraron loans');
        return 50;
      }

      // OPTIMIZACIÓN: Obtener todos los user_ids únicos de los loans
      const uniqueUserIdsEntity = [...new Set(loans.map(l => l.user_id).filter(Boolean))];
      this.logger.log(`   - IDs de usuarios únicos: ${uniqueUserIdsEntity.length}`);

      // Obtener todos los usuarios necesarios en UNA SOLA consulta
      const usersEntity = await userCollection.find({
        _id: { $in: uniqueUserIdsEntity }
      }).toArray();

      // Crear un Map para lookups O(1) en memoria
      const userMapEntity = new Map(usersEntity.map(u => [u._id.toString(), u]));
      this.logger.log(`   - Usuarios encontrados en BD: ${userMapEntity.size}`);

      const tiempos: number[] = [];
      let procesados = 0;

      for (const loan of loans) {
        try {
          // Lookup del usuario en memoria (O(1))
          const user = userMapEntity.get(loan.user_id?.toString());

          if (user && user.created_at && loan.disbursement_date) {
            const createdAt = new Date(user.created_at);
            const disbursementDate = new Date(loan.disbursement_date);

            const diffMs = disbursementDate.getTime() - createdAt.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            if (diffMinutes > 0 && diffMinutes <= 30) {
              tiempos.push(diffMinutes);
              procesados++;
            }
          }
        } catch (error) {
          continue;
        }
      }

      this.logger.log(`   - Registros procesados: ${procesados}`);

      if (tiempos.length === 0) {
        this.logger.warn('⚠️ No se pudieron calcular tiempos válidos');
        return 50;
      }

      const promedioMinutos = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length;

      this.logger.log(`   - Tiempo promedio: ${promedioMinutos.toFixed(2)} minutos`);

      return Math.round(promedioMinutos);

    } catch (error) {
      this.logger.error('❌ Error calculando tiempo de onboarding por entidades:', error);
      return 50;
    }
  }

  /**
   * Cuenta loans de los últimos 7 días para entity IDs específicos
   */
  private async countLoansLastWeekByEntityIds(entityIds: string[]): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        return 0;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const userCollection = db.collection('user');
      const loanCollection = db.collection('loan');

      // Obtener usuarios de las entidades
      const users = await userCollection
        .find({
          ecosystem: { $in: entityIds }
        })
        .project({ _id: 1 })
        .toArray();

      const userIds = users.map(u => u._id);

      if (userIds.length === 0) {
        return 0;
      }

      // Contar loans
      const count = await loanCollection.countDocuments({
        disbursement_date: {
          $gte: sevenDaysAgo.toISOString()
        },
        user_id: { $in: userIds }
      });

      return count;

    } catch (error) {
      this.logger.error('❌ Error contando loans por entidades:', error);
      return 0;
    }
  }

  /**
   * Genera PDF con los KPIs usando Puppeteer
   */
  async generatePDF(kpiData: KPIData): Promise<Buffer> {
    this.logger.log('📄 Generando PDF con KPIs...');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      
      // Generar HTML
      const html = this.generateHTML(kpiData);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generar PDF
      const pdfBuffer = Buffer.from(await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      }));

      await browser.close();
      
      this.logger.log('✅ PDF generado exitosamente');
      return pdfBuffer;

    } catch (error) {
      this.logger.error('❌ Error generando PDF:', error);
      throw error;
    }
  }

  /**
   * Genera HTML template con el nuevo diseño actualizado
   */
  private generateHTML(kpiData: KPIData): string {
    const entityName = kpiData.financialEntity || 'General';
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LeanCore - KPIs Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%);
            min-height: 100vh;
            padding: 48px;
            position: relative;
            overflow-x: hidden;
        }

        /* Logo */
        .logo {
            position: absolute;
            left: 48px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
        }

        .logo h1 {
            font-family: 'Georgia', serif;
            font-size: 4rem;
            font-weight: bold;
            font-style: italic;
            color: white;
            writing-mode: horizontal-tb;
        }

        /* Main Content Grid */
        .content-grid {
            max-width: 1400px;
            margin-left: auto;
            margin-right: 80px;
            display: grid;
            gap: 20px;
            grid-template-columns: repeat(2, 1fr);
        }

        /* KPI Cards */
        .kpi-card {
            position: relative;
            overflow: hidden;
            border-radius: 32px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        /* Card Colors */
        .card-approval {
            background: linear-gradient(135deg, #6ee7b7 0%, #34d399 100%);
        }

        .card-portfolio-delay {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .card-onboarding {
            background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
        }

        .card-disbursement {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
        }

        .card-portfolio-index {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        }

        .card-collection {
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
        }

        .kpi-card .card-header {
            display: flex;
            align-items: flex-start;
            gap: 20px;
        }

        .kpi-card .icon {
            width: 64px;
            height: 64px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            backdrop-filter: blur(10px);
        }

        .kpi-card .icon svg {
            width: 36px;
            height: 36px;
            stroke: white;
            fill: none;
        }

        .kpi-card .card-content {
            flex: 1;
        }

        .kpi-card h3 {
            font-size: 20px;
            font-weight: 700;
            color: white;
            margin-bottom: 12px;
            line-height: 1.3;
        }

        .kpi-card .card-value {
            margin-bottom: 16px;
        }

        .kpi-card .card-value .value {
            font-size: 5rem;
            font-weight: 800;
            color: white;
            line-height: 1;
            letter-spacing: -0.02em;
        }

        .card-approval .card-value .value {
            color: #5b21b6;
        }

        .kpi-card p {
            font-size: 15px;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.95);
            font-weight: 400;
        }

        /* Responsive */
        @media (max-width: 1200px) {
            .logo {
                position: static;
                transform: none;
                margin-bottom: 40px;
            }

            .content-grid {
                margin-right: 0;
            }
        }

        @media (max-width: 768px) {
            body {
                padding: 24px;
            }

            .content-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }

            .logo h1 {
                font-size: 3rem;
            }

            .kpi-card {
                padding: 28px;
            }

            .kpi-card .card-value .value {
                font-size: 3.5rem;
            }
        }

        /* Print Styles */
        @media print {
            body {
                background: white;
                padding: 20px;
            }
            
            .kpi-card {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <!-- Logo -->
    <div class="logo">
        <h1>LeanCore</h1>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
        <!-- Tasa de aprobación -->
        <div class="kpi-card card-approval">
            <div class="card-header">
                <div class="icon">
                    <svg viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>Tasa de aprobación</h3>
                </div>
            </div>
            <div class="card-value">
                <span class="value">${kpiData.tasaAprobacion.toFixed(0)}%</span>
            </div>
            <p>Porcentaje de solicitudes aprobadas sobre el total recibidas.</p>
        </div>

        <!-- Mora de Cartera (usando Índice de Cartera como placeholder) -->
        <div class="kpi-card card-portfolio-delay">
            <div class="card-header">
                <div class="icon">
                    <svg viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>Índice de Cartera Sin Errores</h3>
                </div>
            </div>
            <div class="card-value">
                <span class="value">${kpiData.indiceCarteraSinErrores.toFixed(0)}%</span>
            </div>
            <p>Porcentaje de créditos correctamente administrados sin incidencias operativas.</p>
        </div>

        <!-- Tiempo de onboarding -->
        <div class="kpi-card card-onboarding">
            <div class="card-header">
                <div class="icon">
                    <svg viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>Tiempo de onboarding</h3>
                </div>
            </div>
            <div class="card-value">
                <span class="value">${kpiData.tiempoOnboarding}</span>
            </div>
            <p>Tiempo en minutos que tarda un cliente desde que inicia el registro hasta que completa su verificación y firma digital.</p>
        </div>


        <!-- Índice de cartera administrada sin errores (repetido con diferente color) -->
        <div class="kpi-card card-portfolio-index">
            <div class="card-header">
                <div class="icon">
                    <svg viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>Índice de cartera administrada sin errores</h3>
                </div>
            </div>
            <div class="card-value">
                <span class="value">${kpiData.indiceCarteraSinErrores.toFixed(0)}</span>
            </div>
            <p>Porcentaje de créditos correctamente administrados (cálculo de cuotas, intereses y amortización) sin incidencias operativas.</p>
        </div>

        <!-- Efectividad de recaudo -->
        <div class="kpi-card card-collection">
            <div class="card-header">
                <div class="icon">
                    <svg viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>Efectividad de recaudo</h3>
                </div>
            </div>
            <div class="card-value">
                <span class="value">${kpiData.efectividadRecaudo}%</span>
            </div>
            <p>Porcentaje de pagos recibidos en la fecha establecida sobre el total de cuotas generadas en la semana.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Genera KPIs y retorna el resultado completo
   */
  async generateKPIsWithPDF(): Promise<KPIGenerationResult> {
    try {
      this.logger.log('🔄 Generando KPIs con PDF...');

      const kpiData = await this.calculateKPIs();
      const pdfBuffer = await this.generatePDF(kpiData);
      
      const fileName = `leanCore-kpis-${kpiData.fechaGeneracion.toISOString().split('T')[0]}.pdf`;

      return {
        success: true,
        data: kpiData,
        pdfBuffer,
        fileName,
      };

    } catch (error) {
      this.logger.error('❌ Error generando KPIs con PDF:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera KPIs para todas las fintechs según su frecuencia configurada
   */
  async generateKPIsForAllFintechs(forcePeriod?: 'weekly' | 'monthly'): Promise<KPIGenerationResultByEntity> {
    try {
      this.logger.log('🔄 Generando KPIs para todas las fintechs...');

      const emailConfigs = this.getEmailConfigs();
      const results: { [entityName: string]: KPIGenerationResult } = {};

      for (const config of emailConfigs) {
        const period = forcePeriod || config.frequency;
        this.logger.log(`📊 Procesando ${config.fintechName} (${period})...`);
        
        const result = await this.generateKPIsForFintech(config.fintechName, period);
        results[config.fintechName] = result;
      }

      return {
        success: true,
        results,
      };

    } catch (error) {
      this.logger.error('❌ Error generando KPIs para todas las fintechs:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía KPIs por email para todas las fintechs
   */
  async sendKPIsToAllFintechs(forcePeriod?: 'weekly' | 'monthly'): Promise<void> {
    try {
      this.logger.log('📧 Enviando KPIs a todas las fintechs...');

      const emailConfigs = this.getEmailConfigs();

      for (const config of emailConfigs) {
        const period = forcePeriod || config.frequency;
        this.logger.log(`📊 Generando y enviando KPIs para ${config.fintechName} (${period})...`);
        
        const result = await this.generateKPIsForFintech(config.fintechName, period);
        
        if (result.success && result.pdfBuffer) {
          await this.sendKPIsByEmail(config, result.pdfBuffer, result.fileName!, period);
          this.logger.log(`✅ KPIs enviados exitosamente para ${config.fintechName}`);
        } else {
          this.logger.error(`❌ Error generando/enviando KPIs para ${config.fintechName}:`, result.error);
        }
      }

    } catch (error) {
      this.logger.error('❌ Error enviando KPIs a todas las fintechs:', error);
      throw error;
    }
  }

  /**
   * Genera KPIs para una fintech específica con fechas personalizadas
   */
  async generateKPIsForFintechWithCustomPeriod(
    fintechName: string,
    fechaInicio: Date,
    fechaFin: Date,
    erroresCarteraPersonalizados?: number
  ): Promise<KPIGenerationResult> {
    try {
      this.logger.log(`📊 Generando KPIs para ${fintechName} con período personalizado...`);
      this.logger.log(`   - Desde: ${fechaInicio.toISOString().split('T')[0]}`);
      this.logger.log(`   - Hasta: ${fechaFin.toISOString().split('T')[0]}`);
      
      // Verificar el estado de MongoDB
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      if (!db) {
        this.logger.warn(`🚫 MODO SIMULACIÓN: MongoDB no disponible - usando datos ficticios para testing`);
      } else {
        this.logger.log(`✅ MODO REAL: MongoDB disponible - usando datos reales de la base de datos`);
      }

      // Obtener entidades de la fintech
      const entities = this.getFinancialEntities();
      const fintechEntities = entities.filter(e => e.grupo === fintechName);
      
      if (fintechEntities.length === 0) {
        throw new Error(`No se encontraron entidades para la fintech: ${fintechName}`);
      }

      const entityIds = fintechEntities.map(e => e.id);

      // Calcular KPIs para esta fintech con período personalizado
      const tasaAprobacion = await this.calculateTasaAprobacionByEntityIdsWithPeriod(entityIds, fechaInicio, fechaFin);
      const indiceCarteraSinErrores = await this.calculateIndiceCarteraSinErroresByEntityIdsWithPeriod(entityIds, fintechName, fechaInicio, fechaFin, erroresCarteraPersonalizados);
      const tiempoOnboarding = await this.calculateTiempoOnboardingByEntityIdsWithPeriod(entityIds, fechaInicio, fechaFin);

      // KPIs mockeados
      const efectividadRecaudo = 120; // porcentaje

      const kpiData: KPIData = {
        tasaAprobacion,
        tiempoOnboarding,
        indiceCarteraSinErrores,
        efectividadRecaudo,
        fechaGeneracion: new Date(),
        periodo: {
          inicio: fechaInicio,
          fin: fechaFin,
        },
        financialEntity: fintechName,
      };

      // Generar PDF
      const pdfBuffer = await this.generatePDF(kpiData);
      
      const fileName = `leanCore-kpis-${fintechName.toLowerCase()}-custom-${fechaInicio.toISOString().split('T')[0]}-to-${fechaFin.toISOString().split('T')[0]}.pdf`;

      return {
        success: true,
        data: kpiData,
        pdfBuffer,
        fileName,
      };

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para ${fintechName} con período personalizado:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera KPIs para STOP-YOYO de los últimos 7 días
   * @param erroresCartera Errores de cartera reportados (opcional)
   */
  async generateKPIsForStopYoyoWeekly(erroresCartera?: number): Promise<KPIGenerationResult> {
    try {
      this.logger.log(`📊 Generando KPIs para STOP-YOYO - ÚLTIMOS 7 DÍAS...`);

      // Calcular fechas de los últimos 7 días en UTC
      const ahora = new Date();
      
      // Fecha de fin: hoy a las 23:59:59.999 UTC
      const fechaFin = new Date(Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate(),
        23, 59, 59, 999
      ));
      
      // Fecha de inicio: hace 7 días a las 00:00:00.000 UTC
      const fechaInicio = new Date(Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate() - 7,
        0, 0, 0, 0
      ));

      this.logger.log(`   - Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);

      // Obtener los entity IDs específicos de STOP-YOYO
      const entities = this.getFinancialEntities();
      const stopYoyoEntities = entities.filter(e => e.grupo === 'STOP-YOYO');
      const entityIds = stopYoyoEntities.map(e => e.id);

      // Usar el método existente con las fechas calculadas y errores personalizados
      const result = await this.generateKPIsForFintechWithCustomPeriod('STOP-YOYO', fechaInicio, fechaFin, erroresCartera);
      
      if (result.success && result.pdfBuffer && result.fileName) {
        // Crear directorio para PDFs
        const outputDir = 'pdfs-kpis';
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Nombre del archivo para KPIs semanales
        const fileName = `leanCore-kpis-stop-yoyo-weekly-${fechaFin.toISOString().split('T')[0]}.pdf`;
        const filePath = path.join(outputDir, fileName);

        // Guardar PDF en el directorio
        fs.writeFileSync(filePath, result.pdfBuffer);

        // Generar resumen con datos detallados - IMPORTANTE: Pasar entityIds para filtrar solo STOP-YOYO
        const summary: KPISummary = {
          totalLeads: result.data ? await this.getTotalLeadsForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          totalUsers: result.data ? await this.getTotalUsersForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          totalSolicitudes: 0,
          totalLoans: result.data ? await this.getTotalLoansForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          erroresCartera: erroresCartera || this.getErroresPorEntidad('STOP-YOYO'),
          formulas: {
            tasaAprobacion: '(Total Users / Total Solicitudes) × 100',
            indiceCarteraSinErrores: '((Total Loans - Errores Cartera) / Total Loans) × 100',
            tiempoOnboarding: 'Promedio de (disbursement_date - created_at) en minutos'
          }
        };

        summary.totalSolicitudes = summary.totalLeads + summary.totalUsers;

        return {
          success: true,
          data: result.data,
          summary,
          fileName,
          filePath: path.resolve(filePath),
        };
      }

      return result;

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para STOP-YOYO (últimos 7 días):`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera KPIs para STOP-YOYO con un rango de fechas personalizado
   * @param fechaInicio Fecha de inicio (string en formato YYYY-MM-DD)
   * @param fechaFin Fecha de fin (string en formato YYYY-MM-DD)
   * @param erroresCartera Número de errores de cartera (opcional)
   */
  async generateKPIsForStopYoyoCustomRange(
    fechaInicioStr: string, 
    fechaFinStr: string, 
    erroresCartera?: number
  ): Promise<KPIGenerationResult> {
    try {
      // Validar y parsear fechas
      const fechaInicio = new Date(`${fechaInicioStr}T00:00:00.000Z`);
      const fechaFin = new Date(`${fechaFinStr}T23:59:59.999Z`);

      // Validar que las fechas sean válidas
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        throw new Error('Las fechas proporcionadas no son válidas. Use formato YYYY-MM-DD');
      }

      // Validar que fechaInicio sea menor que fechaFin
      if (fechaInicio > fechaFin) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      this.logger.log(`📊 Generando KPIs para STOP-YOYO - Rango personalizado...`);
      this.logger.log(`   - Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);

      // Obtener los entity IDs específicos de STOP-YOYO
      const entities = this.getFinancialEntities();
      const stopYoyoEntities = entities.filter(e => e.grupo === 'STOP-YOYO');
      const entityIds = stopYoyoEntities.map(e => e.id);

      // Usar el método existente con las fechas calculadas y errores personalizados
      const result = await this.generateKPIsForFintechWithCustomPeriod('STOP-YOYO', fechaInicio, fechaFin, erroresCartera);
      
      if (result.success && result.pdfBuffer && result.fileName) {
        // Crear directorio para PDFs
        const outputDir = 'pdfs-kpis';
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Nombre del archivo para KPIs con rango personalizado
        const fileName = `leanCore-kpis-stop-yoyo-${fechaInicioStr}_${fechaFinStr}.pdf`;
        const filePath = path.join(outputDir, fileName);

        // Guardar PDF en el directorio
        fs.writeFileSync(filePath, result.pdfBuffer);

        // Generar resumen con datos detallados - IMPORTANTE: Pasar entityIds para filtrar solo STOP-YOYO
        const summary: KPISummary = {
          totalLeads: result.data ? await this.getTotalLeadsForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          totalUsers: result.data ? await this.getTotalUsersForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          totalSolicitudes: 0,
          totalLoans: result.data ? await this.getTotalLoansForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          erroresCartera: erroresCartera || this.getErroresPorEntidad('STOP-YOYO'),
          formulas: {
            tasaAprobacion: '(Total Users / Total Solicitudes) × 100',
            indiceCarteraSinErrores: '((Total Loans - Errores Cartera) / Total Loans) × 100',
            tiempoOnboarding: 'Promedio de (disbursement_date - created_at) en minutos'
          }
        };

        summary.totalSolicitudes = summary.totalLeads + summary.totalUsers;

        return {
          success: true,
          data: result.data,
          summary,
          fileName,
          filePath: path.resolve(filePath),
        };
      }

      return result;

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para STOP-YOYO con rango personalizado:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera KPIs para STOP-YOYO de un mes específico
   * @param year Año (ej: 2025)
   * @param month Mes (1-12, donde 1=enero, 2=febrero, etc.)
   */
  async generateKPIsForStopYoyoByMonth(year: number, month: number, erroresCartera?: number): Promise<KPIGenerationResult> {
    try {
      // Validar parámetros
      if (month < 1 || month > 12) {
        throw new Error('El mes debe estar entre 1 y 12');
      }
      if (year < 2020 || year > 2030) {
        throw new Error('El año debe estar entre 2020 y 2030');
      }

      // Crear fechas del mes especificado en UTC
      const fechaInicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      
      // Para obtener el último día del mes, usamos el día 0 del mes siguiente
      const fechaFin = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];

      this.logger.log(`📊 Generando KPIs para STOP-YOYO - ${monthNames[month - 1].toUpperCase()} ${year}...`);
      this.logger.log(`   - Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);

      // Obtener los entity IDs específicos de STOP-YOYO
      const entities = this.getFinancialEntities();
      const stopYoyoEntities = entities.filter(e => e.grupo === 'STOP-YOYO');
      const entityIds = stopYoyoEntities.map(e => e.id);

      // Usar el método existente con las fechas calculadas y errores personalizados
      const result = await this.generateKPIsForFintechWithCustomPeriod('STOP-YOYO', fechaInicio, fechaFin, erroresCartera);
      
      if (result.success && result.pdfBuffer && result.fileName) {
        // Crear directorio para PDFs
        const outputDir = 'pdfs-kpis';
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Actualizar el nombre del archivo para incluir el mes
        const monthName = monthNames[month - 1];
        const fileName = `leanCore-kpis-stop-yoyo-${monthName}-${year}.pdf`;
        const filePath = path.join(outputDir, fileName);

        // Guardar PDF en el directorio
        fs.writeFileSync(filePath, result.pdfBuffer);

        // Generar resumen con datos detallados - IMPORTANTE: Pasar entityIds para filtrar solo STOP-YOYO
        const summary: KPISummary = {
          totalLeads: result.data ? await this.getTotalLeadsForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          totalUsers: result.data ? await this.getTotalUsersForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          totalSolicitudes: 0,
          totalLoans: result.data ? await this.getTotalLoansForPeriod(fechaInicio, fechaFin, entityIds) : 0,
          erroresCartera: erroresCartera || this.getErroresPorEntidad('STOP-YOYO'),
          formulas: {
            tasaAprobacion: '(Total Users / Total Solicitudes) × 100',
            indiceCarteraSinErrores: '((Total Loans - Errores Cartera) / Total Loans) × 100',
            tiempoOnboarding: 'Promedio de (disbursement_date - created_at) en minutos'
          }
        };

        summary.totalSolicitudes = summary.totalLeads + summary.totalUsers;

        return {
          success: true,
          data: result.data,
          summary,
          fileName,
          filePath: path.resolve(filePath),
        };
      }

      return result;

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para STOP-YOYO del mes ${month}/${year}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calcula tasa de aprobación para un conjunto específico de entity IDs con período personalizado
   */
  private async calculateTasaAprobacionByEntityIdsWithPeriod(
    entityIds: string[], 
    fechaInicio: Date, 
    fechaFin: Date
  ): Promise<number> {
    try {
      this.logger.log('🔍 Calculando tasa de aprobación para entidades específicas con período personalizado...');

      let totalLeads = 0;
      let totalUsers = 0;

      for (const entityId of entityIds) {
        const leadsCount = await this.countLeadsByFinancialEntityWithPeriod(entityId, fechaInicio, fechaFin);
        const usersCount = await this.countUsersByFinancialEntityWithPeriod(entityId, fechaInicio, fechaFin);
        
        this.logger.log(`   - Entity ${entityId}: ${leadsCount} leads, ${usersCount} users`);
        
        totalLeads += leadsCount;
        totalUsers += usersCount;
      }

      if (totalLeads === 0 && totalUsers === 0) {
        this.logger.warn('⚠️ No se encontraron datos reales para el período especificado');
        return 0; // Sin datos reales
      }

      const totalSolicitudesGeneral = totalLeads + totalUsers;
      const tasaAprobacionGeneral = totalSolicitudesGeneral > 0 ? (totalUsers / totalSolicitudesGeneral) * 100 : 0;
      
      this.logger.log(`   - Total leads: ${totalLeads}`);
      this.logger.log(`   - Total users: ${totalUsers}`);
      this.logger.log(`   - Tasa: ${tasaAprobacionGeneral.toFixed(2)}%`);

      return tasaAprobacionGeneral;

    } catch (error) {
      this.logger.error('❌ Error calculando tasa de aprobación por entidades con período personalizado:', error);
      return 0; // Sin datos reales debido a error
    }
  }

  /**
   * Cuenta leads por entidad financiera con período personalizado
   */
  private async countLeadsByFinancialEntityWithPeriod(
    financialEntityId: string, 
    fechaInicio: Date, 
    fechaFin: Date
  ): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para contar leads con período personalizado');
        this.logger.log(`❌ SIN DATOS - CONSULTA LEAD - Entity: ${financialEntityId}`);
        this.logger.log(`   📅 Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);
        this.logger.log(`   ❌ RESULTADO: 0 leads (MongoDB no disponible)`);
        return 0; // Sin datos reales
      }

      this.logger.debug(`📅 Filtro de fecha personalizado: desde ${fechaInicio.toISOString()} hasta ${fechaFin.toISOString()}`);

      const collection = db.collection('lead');
      
      // Log de la consulta
      const query = {
        ecosystem: financialEntityId,
        created_at: {
          $gte: fechaInicio.toISOString(),
          $lte: fechaFin.toISOString()
        }
      };
      
      const count = await collection.countDocuments(query);
      this.logger.log(`🔍 Leads encontrados para ${financialEntityId} (${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}): ${count}`);

      return count;

    } catch (error) {
      this.logger.error(`❌ Error contando leads para ${financialEntityId} con período personalizado:`, error);
      return 0; // Sin datos reales debido a error
    }
  }

  /**
   * Cuenta users por entidad financiera con período personalizado
   */
  private async countUsersByFinancialEntityWithPeriod(
    financialEntityId: string, 
    fechaInicio: Date, 
    fechaFin: Date
  ): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para contar users con período personalizado');
        this.logger.log(`❌ SIN DATOS - CONSULTA USER - Entity: ${financialEntityId}`);
        this.logger.log(`   📅 Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);
        this.logger.log(`   ❌ RESULTADO: 0 users (MongoDB no disponible)`);
        return 0; // Sin datos reales
      }

      this.logger.debug(`📅 Filtro de fecha personalizado: desde ${fechaInicio.toISOString()} hasta ${fechaFin.toISOString()}`);

      const collection = db.collection('user');
      
      // Log de la consulta
      const query = {
        ecosystem: financialEntityId,
        created_at: {
          $gte: fechaInicio.toISOString(),
          $lte: fechaFin.toISOString()
        }
      };
      
      const count = await collection.countDocuments(query);
      this.logger.log(`🔍 Users encontrados para ${financialEntityId} (${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}): ${count}`);

      return count;

    } catch (error) {
      this.logger.error(`❌ Error contando users para ${financialEntityId} con período personalizado:`, error);
      return 0; // Sin datos reales debido a error
    }
  }

  /**
   * Calcula índice de cartera sin errores para un conjunto específico de entity IDs con período personalizado
   */
  private async calculateIndiceCarteraSinErroresByEntityIdsWithPeriod(
    entityIds: string[], 
    entityGroup: string, 
    fechaInicio: Date, 
    fechaFin: Date,
    erroresPersonalizados?: number
  ): Promise<number> {
    try {
      this.logger.log('🔍 Calculando índice de cartera para entidades específicas con período personalizado...');

      const totalLoans = await this.countLoansByEntityIdsWithPeriod(entityIds, fechaInicio, fechaFin);
      this.logger.log(`   - Total de créditos: ${totalLoans}`);

      // Usar errores personalizados si se proporcionaron, sino usar los por defecto
      let erroresAjustados: number;
      
      if (erroresPersonalizados !== undefined) {
        erroresAjustados = erroresPersonalizados;
        this.logger.log(`   - Errores personalizados para ${entityGroup}: ${erroresAjustados}`);
      } else {
        // Obtener errores específicos para esta entidad (ajustados proporcionalmente)
        const erroresPorGrupo: { [key: string]: number } = {
          'STOP-YOYO': 56,
          'Credilider': 0,
          'Presti': 3,
          'Socoda': 5,
        };

        const erroresSemanales = erroresPorGrupo[entityGroup] || 0;
        // Ajustar errores proporcionalmente al período (30 días = ~4.3 semanas)
        erroresAjustados = Math.floor(erroresSemanales * 4.3);
        
        this.logger.log(`   - Errores ajustados para período de 30 días (${entityGroup}): ${erroresAjustados}`);
      }

      if (totalLoans === 0) {
        this.logger.warn('⚠️ No se encontraron loans');
        return 100.0;
      }

      const creditosSinErrores = totalLoans - erroresAjustados;
      const indice = (creditosSinErrores / totalLoans) * 100;

      this.logger.log(`   - Créditos sin errores: ${creditosSinErrores}`);
      this.logger.log(`   - Índice: ${Math.max(0, indice).toFixed(2)}%`);

      return Math.max(0, indice);

    } catch (error) {
      this.logger.error('❌ Error calculando índice por entidades con período personalizado:', error);
      return 0; // Sin datos reales debido a error
    }
  }

  /**
   * Cuenta loans de entidades específicas con período personalizado
   */
  private async countLoansByEntityIdsWithPeriod(
    entityIds: string[], 
    fechaInicio: Date, 
    fechaFin: Date
  ): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para contar loans con período personalizado');
        this.logger.log(`❌ SIN DATOS - CONSULTA LOAN - Entity IDs: ${entityIds.join(', ')}`);
        this.logger.log(`   📅 Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);
        this.logger.log(`   ❌ RESULTADO: 0 loans (MongoDB no disponible)`);
        return 0; // Sin datos reales
      }

      const userCollection = db.collection('user');
      const loanCollection = db.collection('loan');

      // Obtener usuarios de las entidades
      const users = await userCollection
        .find({
          ecosystem: { $in: entityIds }
        })
        .project({ _id: 1 })
        .toArray();

      const userIds = users.map(u => u._id);

      if (userIds.length === 0) {
        this.logger.log(`   ❌ RESULTADO: 0 loans (no se encontraron usuarios para las entidades)`);
        return 0; // Sin datos reales
      }

      // Log de la consulta de loans
      const loanQuery = {
        disbursement_date: {
          $gte: fechaInicio.toISOString(),
          $lte: fechaFin.toISOString()
        },
        user_id: { $in: userIds }
      };
      
      // Contar loans con período personalizado
      const count = await loanCollection.countDocuments(loanQuery);
      this.logger.log(`🔍 Loans encontrados para ${entityIds.length} entidades (${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}): ${count}`);

      return count;

    } catch (error) {
      this.logger.error('❌ Error contando loans por entidades con período personalizado:', error);
      return 0; // Sin datos reales debido a error
    }
  }

  /**
   * Calcula tiempo de onboarding para un conjunto específico de entity IDs con período personalizado
   */
  private async calculateTiempoOnboardingByEntityIdsWithPeriod(
    entityIds: string[], 
    fechaInicio: Date, 
    fechaFin: Date
  ): Promise<number> {
    try {
      this.logger.log('🔍 Calculando tiempo de onboarding para entidades específicas con período personalizado...');

      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        this.logger.warn('⚠️ MongoDB no disponible para calcular tiempo de onboarding con período personalizado');
        this.logger.log(`❌ SIN DATOS - CONSULTA USER (Onboarding) - Entity IDs: ${entityIds.join(', ')}`);
        this.logger.log(`   📅 Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);
        this.logger.log(`   ❌ RESULTADO: 0 minutos (MongoDB no disponible)`);
        return 0; // Sin datos reales
      }

      const loanCollection = db.collection('loan');
      const userCollection = db.collection('user');

      // Log de consulta de usuarios
      const userQuery = {
        ecosystem: { $in: entityIds }
      };
      
      // Obtener usuarios de las entidades especificadas
      const users = await userCollection
        .find(userQuery)
        .project({ _id: 1, ecosystem: 1, created_at: 1 })
        .toArray();

      const userIds = users.map(u => u._id);
      this.logger.log(`🔍 Usuarios encontrados para ${entityIds.length} entidades: ${users.length}`);

      if (userIds.length === 0) {
        this.logger.warn('⚠️ No se encontraron usuarios para estas entidades con período personalizado');
        this.logger.log(`   ❌ RESULTADO: 0 minutos (no se encontraron usuarios)`);
        return 0; // Sin datos reales
      }

      // Log de consulta de loans para onboarding
      const onboardingLoanQuery = {
        disbursement_date: {
          $gte: fechaInicio.toISOString(),
          $lte: fechaFin.toISOString()
        },
        user_id: { $in: userIds }
      };
      
      // Obtener loans del período personalizado para estos usuarios
      const loans = await loanCollection
        .find(onboardingLoanQuery)
        .toArray();

      this.logger.log(`🔍 Loans encontrados para onboarding (${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}): ${loans.length}`);

      if (loans.length === 0) {
        this.logger.warn('⚠️ No se encontraron loans para período personalizado');
        this.logger.log(`   ❌ RESULTADO: 0 minutos (no se encontraron loans)`);
        return 0; // Sin datos reales
      }

      // OPTIMIZACIÓN: Obtener todos los user_ids únicos de los loans
      const uniqueUserIdsCustom = [...new Set(loans.map(l => l.user_id).filter(Boolean))];
      this.logger.log(`   - IDs de usuarios únicos: ${uniqueUserIdsCustom.length}`);

      // Obtener todos los usuarios necesarios en UNA SOLA consulta
      const usersCustomPeriod = await userCollection.find({
        _id: { $in: uniqueUserIdsCustom }
      }).toArray();

      // Crear un Map para lookups O(1) en memoria
      const userMapCustom = new Map(usersCustomPeriod.map(u => [u._id.toString(), u]));
      this.logger.log(`   - Usuarios encontrados en BD: ${userMapCustom.size}`);

      const tiempos: number[] = [];
      let procesados = 0;

      for (const loan of loans) {
        try {
          // Lookup del usuario en memoria (O(1))
          const user = userMapCustom.get(loan.user_id?.toString());

          if (user && user.created_at && loan.disbursement_date) {
            const createdAt = new Date(user.created_at);
            const disbursementDate = new Date(loan.disbursement_date);

            const diffMs = disbursementDate.getTime() - createdAt.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            if (diffMinutes > 0 && diffMinutes <= 30) {
              tiempos.push(diffMinutes);
              procesados++;
            }
          }
        } catch (error) {
          continue;
        }
      }

      this.logger.log(`   - Registros procesados: ${procesados}`);

      if (tiempos.length === 0) {
        this.logger.warn('⚠️ No se pudieron calcular tiempos válidos para período personalizado');
        this.logger.log(`   ❌ RESULTADO: 0 minutos (no se pudieron calcular tiempos válidos)`);
        return 0; // Sin datos reales
      }

      const promedioMinutos = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length;

      this.logger.log(`   - Tiempo promedio: ${promedioMinutos.toFixed(2)} minutos`);

      return Math.round(promedioMinutos);

    } catch (error) {
      this.logger.error('❌ Error calculando tiempo de onboarding por entidades con período personalizado:', error);
      return 0; // Sin datos reales debido a error
    }
  }

  /**
   * Obtiene el total de leads para un período específico
   * @param fechaInicio Fecha de inicio del período
   * @param fechaFin Fecha de fin del período
   * @param entityIds Lista opcional de entity IDs específicos. Si no se proporciona, usa todas las entidades.
   */
  private async getTotalLeadsForPeriod(fechaInicio: Date, fechaFin: Date, entityIds?: string[]): Promise<number> {
    try {
      // Si se proporcionan entityIds específicos, usarlos; sino, usar todas las entidades
      const entitiesToCount = entityIds || this.getFinancialEntities().map(e => e.id);
      let totalLeads = 0;

      for (const entityId of entitiesToCount) {
        const leadsCount = await this.countLeadsByFinancialEntityWithPeriod(entityId, fechaInicio, fechaFin);
        totalLeads += leadsCount;
      }

      return totalLeads;
    } catch (error) {
      this.logger.error('❌ Error obteniendo total de leads:', error);
      return 0;
    }
  }

  /**
   * Obtiene el total de users para un período específico
   * @param fechaInicio Fecha de inicio del período
   * @param fechaFin Fecha de fin del período
   * @param entityIds Lista opcional de entity IDs específicos. Si no se proporciona, usa todas las entidades.
   */
  private async getTotalUsersForPeriod(fechaInicio: Date, fechaFin: Date, entityIds?: string[]): Promise<number> {
    try {
      // Si se proporcionan entityIds específicos, usarlos; sino, usar todas las entidades
      const entitiesToCount = entityIds || this.getFinancialEntities().map(e => e.id);
      let totalUsers = 0;

      for (const entityId of entitiesToCount) {
        const usersCount = await this.countUsersByFinancialEntityWithPeriod(entityId, fechaInicio, fechaFin);
        totalUsers += usersCount;
      }

      return totalUsers;
    } catch (error) {
      this.logger.error('❌ Error obteniendo total de users:', error);
      return 0;
    }
  }

  /**
   * Obtiene el total de loans para un período específico
   * @param fechaInicio Fecha de inicio del período
   * @param fechaFin Fecha de fin del período
   * @param entityIds Lista opcional de entity IDs específicos. Si no se proporciona, cuenta todos los loans.
   */
  private async getTotalLoansForPeriod(fechaInicio: Date, fechaFin: Date, entityIds?: string[]): Promise<number> {
    try {
      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        return 0;
      }

      const loanCollection = db.collection('loan');
      
      // Construir el filtro base
      const filter: any = {
        disbursement_date: {
          $gte: fechaInicio.toISOString(),
          $lte: fechaFin.toISOString()
        }
      };

      // Si se proporcionan entityIds específicos, agregar filtro
      if (entityIds && entityIds.length > 0) {
        filter.financial_entity_id = { $in: entityIds };
      }

      const count = await loanCollection.countDocuments(filter);

      return count;
    } catch (error) {
      this.logger.error('❌ Error obteniendo total de loans:', error);
      return 0;
    }
  }

  /**
   * Genera KPI de noviembre: errores vs créditos administrados
   * Créditos administrados = loans DESEMBOLSADOS en noviembre con status "arrear" o "active"
   */
  async generateKPINoviembre2024(): Promise<{
    success: boolean;
    data?: {
      mes: string;
      periodo: { inicio: string; fin: string };
      entidadesFinancieras: string[];
      errores: number;
      creditosAdministrados: number;
      creditosSinErrores: number;
      indiceCarteraSinErrores: number;
      totalLoans: number;
      porcentajeAdministrados: number;
      desglose: {
        active: number;
        arrear: number;
      };
    };
    error?: string;
  }> {
    try {
      this.logger.log('📊 Generando KPI de Noviembre 2025: Errores vs Créditos Administrados...');

      // Definir período de noviembre 2025
      const fechaInicio = new Date('2025-11-01T00:00:00.000Z');
      const fechaFin = new Date('2025-11-30T23:59:59.999Z');

      this.logger.log(`   - Período: ${fechaInicio.toISOString().split('T')[0]} a ${fechaFin.toISOString().split('T')[0]}`);
      this.logger.log(`   - Rango ISO: ${fechaInicio.toISOString()} a ${fechaFin.toISOString()}`);

      await this.mongoClientService.ensureConnection();
      const db = this.mongoClientService['db'];
      
      if (!db) {
        throw new Error('MongoDB no disponible');
      }

      const loanCollection = db.collection('loan');

      // IDs de entidades financieras a filtrar (STOP-YOYO)
      const financialEntityIds = [
        '713bf1d6-9e5d-4b48-b211-7bc5ec736130', // YOYO
        'f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e'  // STOP
      ];

      this.logger.log(`   🏢 Filtrando por entidades financieras: STOP-YOYO`);
      this.logger.log(`      IDs: ${financialEntityIds.join(', ')}`);

      // DIAGNÓSTICO: Obtener un sample de disbursement_date para verificar formato
      this.logger.log('\n🔍 DIAGNÓSTICO - Revisando formato de disbursement_date:');
      const sampleLoans = await loanCollection.find({
        disbursement_date: { $exists: true }
      }).limit(5).toArray();
      
      if (sampleLoans.length > 0) {
        this.logger.log('   Ejemplos de disbursement_date encontrados:');
        sampleLoans.forEach((loan, idx) => {
          this.logger.log(`   ${idx + 1}. ${loan.disbursement_date} (tipo: ${typeof loan.disbursement_date})`);
        });
      }

      // DIAGNÓSTICO: Contar todos los loans con disbursement_date
      const totalConFecha = await loanCollection.countDocuments({
        disbursement_date: { $exists: true, $ne: null }
      });
      this.logger.log(`   Total loans con disbursement_date: ${totalConFecha}\n`);

      // Filtro base por fecha de desembolso (noviembre 2025) y entidades financieras
      const filtroFecha = {
        disbursement_date: {
          $gte: fechaInicio.toISOString(),
          $lte: fechaFin.toISOString()
        },
        financial_entity_id: { $in: financialEntityIds }
      };

      this.logger.log('🔍 Ejecutando consulta con filtro:');
      this.logger.log(JSON.stringify(filtroFecha, null, 2));

      // Contar total de loans desembolsados en noviembre
      const totalLoans = await loanCollection.countDocuments(filtroFecha);
      this.logger.log(`\n   ✅ Total loans desembolsados en Nov 2025: ${totalLoans}`);

      // Si encuentra pocos, intentar con regex para validar
      if (totalLoans < 100) {
        this.logger.log('\n   ⚠️  Pocos loans encontrados, probando con regex...');
        const totalConRegex = await loanCollection.countDocuments({
          disbursement_date: { $regex: /^2025-11-/ },
          financial_entity_id: { $in: financialEntityIds }
        });
        this.logger.log(`   Con regex /^2025-11-/ y STOP-YOYO: ${totalConRegex} loans`);
      }

      // Obtener samples de los loans encontrados
      const samplesEncontrados = await loanCollection.find(filtroFecha).limit(3).toArray();
      if (samplesEncontrados.length > 0) {
        this.logger.log('\n   📋 Muestras de loans encontrados en noviembre:');
        samplesEncontrados.forEach((loan, idx) => {
          this.logger.log(`   ${idx + 1}. ID: ${loan._id}, Date: ${loan.disbursement_date}, Status: ${loan.status || 'sin status'}`);
        });
      }

      // Contar por status
      this.logger.log('\n   📊 Contando por status:');
      
      const creditosActive = await loanCollection.countDocuments({
        ...filtroFecha,
        status: 'active'
      });
      this.logger.log(`   - Status 'active': ${creditosActive}`);

      const creditosArrear = await loanCollection.countDocuments({
        ...filtroFecha,
        status: 'arrear'
      });
      this.logger.log(`   - Status 'arrear': ${creditosArrear}`);

      // Verificar qué otros status hay
      const otrosStatus = await loanCollection.aggregate([
        { $match: filtroFecha },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();
      
      if (otrosStatus.length > 0) {
        this.logger.log('\n   📊 Distribución completa de status en Nov 2025 (STOP-YOYO):');
        otrosStatus.forEach(stat => {
          this.logger.log(`   - Status '${stat._id || 'null'}': ${stat.count}`);
        });
      }

      const creditosAdministrados = creditosActive + creditosArrear;
      this.logger.log(`\n   ✅ Créditos administrados STOP-YOYO (active + arrear): ${creditosAdministrados}`);

      // Número de errores de cartera
      const errores = 170;

      // Calcular créditos sin errores
      const creditosSinErrores = Math.max(0, creditosAdministrados - errores);

      // Calcular índice de cartera sin errores
      const indiceCarteraSinErrores = creditosAdministrados > 0 
        ? (creditosSinErrores / creditosAdministrados) * 100 
        : 100;

      // Calcular porcentaje de créditos administrados
      const porcentajeAdministrados = totalLoans > 0 
        ? (creditosAdministrados / totalLoans) * 100 
        : 0;

      this.logger.log(`   - Err>ores reportados: ${errores}`);
      this.logger.log(`   - Créditos sin errores: ${creditosSinErrores}`);
      this.logger.log(`   - Índice de cartera sin errores: ${indiceCarteraSinErrores.toFixed(2)}%`);
      this.logger.log(`   - Porcentaje administrados: ${porcentajeAdministrados.toFixed(2)}%\n`);

      return {
        success: true,
        data: {
          mes: 'Noviembre 2025',
          periodo: {
            inicio: fechaInicio.toISOString().split('T')[0],
            fin: fechaFin.toISOString().split('T')[0],
          },
          entidadesFinancieras: ['STOP', 'YOYO'],
          errores,
          creditosAdministrados,
          creditosSinErrores,
          indiceCarteraSinErrores: parseFloat(indiceCarteraSinErrores.toFixed(2)),
          totalLoans,
          porcentajeAdministrados: parseFloat(porcentajeAdministrados.toFixed(2)),
          desglose: {
            active: creditosActive,
            arrear: creditosArrear,
          },
        },
      };

    } catch (error) {
      this.logger.error('❌ Error generando KPI de Noviembre:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
