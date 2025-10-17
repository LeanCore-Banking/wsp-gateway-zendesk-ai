import { Controller, Get, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { KpisService } from './kpis.service';

@Controller('kpis')
export class KpisController {
  private readonly logger = new Logger(KpisController.name);

  constructor(private readonly kpisService: KpisService) {}

  /**
   * Genera KPIs y descarga el PDF
   * GET /kpis/generate-pdf
   */
  @Get('generate-pdf')
  async generatePDF(@Res() res: Response): Promise<void> {
    this.logger.log('📊 Solicitud de generación de PDF de KPIs...');

    try {
      const result = await this.kpisService.generateKPIsWithPDF();

      if (!result.success) {
        this.logger.error('❌ Error generando PDF:', result.error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: result.error || 'Error generando PDF de KPIs',
        });
        return;
      }

      if (!result.pdfBuffer || !result.fileName) {
        this.logger.error('❌ PDF buffer o filename no disponible');
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: 'Error generando PDF - datos incompletos',
        });
        return;
      }

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.pdfBuffer.length);

      // Enviar PDF
      res.send(result.pdfBuffer);

      this.logger.log(`✅ PDF enviado exitosamente: ${result.fileName}`);

    } catch (error) {
      this.logger.error('❌ Error en controlador de KPIs:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtiene solo los datos de KPIs (sin PDF)
   * GET /kpis/data
   */
  @Get('data')
  async getKPIsData(@Res() res: Response): Promise<void> {
    this.logger.log('📊 Solicitud de datos de KPIs...');

    try {
      const kpiData = await this.kpisService.calculateKPIs();

      res.status(HttpStatus.OK).json({
        success: true,
        data: kpiData,
      });

      this.logger.log('✅ Datos de KPIs enviados exitosamente');

    } catch (error) {
      this.logger.error('❌ Error obteniendo datos de KPIs:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error calculando KPIs',
      });
    }
  }

  /**
   * Forzar ejecución del cronjob de KPIs semanales
   * GET /kpis/force-weekly
   */
  @Get('force-weekly')
  async forceWeekly(@Res() res: Response): Promise<void> {
    this.logger.log('🔄 Forzando generación de KPIs semanales...');

    try {
      await this.kpisService.generateWeeklyKPIs();

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'KPIs semanales generados y enviados exitosamente',
        timestamp: new Date().toISOString(),
      });

      this.logger.log('✅ Generación forzada de KPIs semanales completada');

    } catch (error) {
      this.logger.error('❌ Error en generación forzada semanal:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error forzando generación de KPIs semanales',
      });
    }
  }

  /**
   * Forzar ejecución del cronjob de KPIs mensuales
   * GET /kpis/force-monthly
   */
  @Get('force-monthly')
  async forceMonthly(@Res() res: Response): Promise<void> {
    this.logger.log('🔄 Forzando generación de KPIs mensuales...');

    try {
      await this.kpisService.generateMonthlyKPIs();

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'KPIs mensuales generados y enviados exitosamente',
        timestamp: new Date().toISOString(),
      });

      this.logger.log('✅ Generación forzada de KPIs mensuales completada');

    } catch (error) {
      this.logger.error('❌ Error en generación forzada mensual:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error forzando generación de KPIs mensuales',
      });
    }
  }

  /**
   * Generar KPIs para una fintech específica
   * GET /kpis/fintech/:fintechName
   */
  @Get('fintech/:fintechName')
  async generateKPIsForFintech(@Res() res: Response, fintechName: string): Promise<void> {
    this.logger.log(`📊 Generando KPIs para fintech: ${fintechName}`);

    try {
      const result = await this.kpisService.generateKPIsForFintech(fintechName);

      if (!result.success) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: result.error || 'Error generando KPIs para la fintech',
        });
        return;
      }

      res.status(HttpStatus.OK).json({
        success: true,
        data: result.data,
        fileName: result.fileName,
        message: `KPIs generados exitosamente para ${fintechName}`,
      });

      this.logger.log(`✅ KPIs generados exitosamente para ${fintechName}`);

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para ${fintechName}:`, error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  /**
   * Enviar KPIs por email a todas las fintechs
   * GET /kpis/send-emails
   */
  @Get('send-emails')
  async sendEmails(@Res() res: Response): Promise<void> {
    this.logger.log('📧 Enviando KPIs por email a todas las fintechs...');

    try {
      await this.kpisService.sendKPIsToAllFintechs();

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'KPIs enviados por email a todas las fintechs exitosamente',
        timestamp: new Date().toISOString(),
      });

      this.logger.log('✅ Envío de emails completado');

    } catch (error) {
      this.logger.error('❌ Error enviando emails:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error enviando KPIs por email',
      });
    }
  }

  /**
   * Health check del módulo de KPIs
   * GET /kpis/health
   */
  @Get('health')
  async healthCheck(@Res() res: Response): Promise<void> {
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Módulo de KPIs funcionando correctamente',
      timestamp: new Date().toISOString(),
      endpoints: {
        generatePDF: 'GET /kpis/generate-pdf',
        getData: 'GET /kpis/data',
        forceWeekly: 'GET /kpis/force-weekly',
        forceMonthly: 'GET /kpis/force-monthly',
        fintechSpecific: 'GET /kpis/fintech/:fintechName',
        sendEmails: 'GET /kpis/send-emails',
        health: 'GET /kpis/health',
      },
    });
  }
}
