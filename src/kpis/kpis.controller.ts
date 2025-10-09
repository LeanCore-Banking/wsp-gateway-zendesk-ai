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
   * Forzar ejecución del cronjob de KPIs
   * GET /kpis/force-generate
   */
  @Get('force-generate')
  async forceGenerate(@Res() res: Response): Promise<void> {
    this.logger.log('🔄 Forzando generación de KPIs...');

    try {
      await this.kpisService.generateWeeklyKPIs();

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'KPIs generados exitosamente',
        timestamp: new Date().toISOString(),
      });

      this.logger.log('✅ Generación forzada de KPIs completada');

    } catch (error) {
      this.logger.error('❌ Error en generación forzada:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error forzando generación de KPIs',
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
        forceGenerate: 'GET /kpis/force-generate',
        health: 'GET /kpis/health',
      },
    });
  }
}
