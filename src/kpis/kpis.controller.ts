import { Controller, Get, Res, HttpStatus, Logger, Param, Query } from '@nestjs/common';
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
   * Generar KPIs para STOP-YOYO con rango de fechas personalizado
   * GET /kpis/stop-yoyo/custom?fechaInicio=2025-12-20&fechaFin=2025-12-29&erroresCartera=50
   */
  @Get('stop-yoyo/custom')
  async generateStopYoyoCustomRange(
    @Res() res: Response, 
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('erroresCartera') erroresCartera?: string
  ): Promise<void> {
    this.logger.log(`📊 Generando KPIs para STOP-YOYO con rango personalizado`);

    try {
      // Validar que se proporcionen ambas fechas
      if (!fechaInicio || !fechaFin) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Se requieren los parámetros fechaInicio y fechaFin (formato YYYY-MM-DD)',
          ejemplo: '/kpis/stop-yoyo/custom?fechaInicio=2025-12-20&fechaFin=2025-12-29&erroresCartera=50'
        });
        return;
      }

      // Validar formato de fecha (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fechaInicio) || !dateRegex.test(fechaFin)) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Las fechas deben estar en formato YYYY-MM-DD',
          ejemplo: 'fechaInicio=2025-12-20&fechaFin=2025-12-29'
        });
        return;
      }

      const erroresCarteraNum = erroresCartera ? parseInt(erroresCartera) : undefined;
      
      if (erroresCartera && (erroresCarteraNum === undefined || isNaN(erroresCarteraNum))) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'erroresCartera debe ser un número válido',
        });
        return;
      }

      const result = await this.kpisService.generateKPIsForStopYoyoCustomRange(
        fechaInicio, 
        fechaFin, 
        erroresCarteraNum
      );

      if (!result.success) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: result.error || 'Error generando KPIs para STOP-YOYO',
        });
        return;
      }

      // Retornar resumen con datos en lugar del PDF
      res.status(HttpStatus.OK).json({
        success: true,
        message: `KPIs generados exitosamente para STOP-YOYO - ${fechaInicio} a ${fechaFin}`,
        data: result.data,
        summary: result.summary,
        fileName: result.fileName,
        filePath: result.filePath,
        periodo: {
          inicio: result.data?.periodo.inicio.toISOString().split('T')[0],
          fin: result.data?.periodo.fin.toISOString().split('T')[0],
        }
      });

      this.logger.log(`✅ KPIs de STOP-YOYO (${fechaInicio} a ${fechaFin}) generados exitosamente: ${result.fileName}`);

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para STOP-YOYO con rango personalizado:`, error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  /**
   * Generar KPIs para STOP-YOYO de los últimos 7 días
   * GET /kpis/stop-yoyo/weekly?erroresCartera=50
   */
  @Get('stop-yoyo/weekly')
  async generateStopYoyoWeekly(@Res() res: Response, @Query('erroresCartera') erroresCartera?: string): Promise<void> {
    this.logger.log(`📊 Generando KPIs para STOP-YOYO de los últimos 7 días`);

    try {
      const erroresCarteraNum = erroresCartera ? parseInt(erroresCartera) : undefined;
      
      if (erroresCartera && (erroresCarteraNum === undefined || isNaN(erroresCarteraNum))) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'erroresCartera debe ser un número válido',
        });
        return;
      }

      const result = await this.kpisService.generateKPIsForStopYoyoWeekly(erroresCarteraNum);

      if (!result.success) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: result.error || 'Error generando KPIs para STOP-YOYO',
        });
        return;
      }

      // Retornar resumen con datos en lugar del PDF
      res.status(HttpStatus.OK).json({
        success: true,
        message: 'KPIs generados exitosamente para STOP-YOYO - Últimos 7 días',
        data: result.data,
        summary: result.summary,
        fileName: result.fileName,
        filePath: result.filePath,
        periodo: {
          inicio: result.data?.periodo.inicio.toISOString().split('T')[0],
          fin: result.data?.periodo.fin.toISOString().split('T')[0],
        }
      });

      this.logger.log(`✅ KPIs de STOP-YOYO (últimos 7 días) generados exitosamente: ${result.fileName}`);

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para STOP-YOYO (últimos 7 días):`, error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  /**
   * Generar KPIs para STOP-YOYO de un mes específico
   * GET /kpis/stop-yoyo/:year/:month
   */
  @Get('stop-yoyo/:year/:month')
  async generateStopYoyoByMonth(@Res() res: Response, @Param('year') year: string, @Param('month') month: string, @Query('erroresCartera') erroresCartera?: string): Promise<void> {
    this.logger.log(`📊 Generando KPIs para STOP-YOYO del mes ${month}/${year}`);

    try {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      // Validar parámetros
      if (isNaN(yearNum) || isNaN(monthNum)) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Año y mes deben ser números válidos',
        });
        return;
      }

      const erroresCarteraNum = erroresCartera ? parseInt(erroresCartera) : undefined;
      const result = await this.kpisService.generateKPIsForStopYoyoByMonth(yearNum, monthNum, erroresCarteraNum);

      if (!result.success) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: result.error || 'Error generando KPIs para STOP-YOYO',
        });
        return;
      }

      // Retornar resumen con datos en lugar del PDF
      res.status(HttpStatus.OK).json({
        success: true,
        message: `KPIs generados exitosamente para STOP-YOYO - ${month}/${year}`,
        data: result.data,
        summary: result.summary,
        fileName: result.fileName,
        filePath: result.filePath,
        periodo: {
          inicio: result.data?.periodo.inicio.toISOString().split('T')[0],
          fin: result.data?.periodo.fin.toISOString().split('T')[0],
        }
      });

      this.logger.log(`✅ KPIs de STOP-YOYO (${month}/${year}) generados exitosamente: ${result.fileName}`);

    } catch (error) {
      this.logger.error(`❌ Error generando KPIs para STOP-YOYO (${month}/${year}):`, error);
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
   * Generar KPI de Noviembre: Errores vs Créditos Administrados
   * GET /kpis/noviembre
   */
  @Get('noviembre')
  async getKPINoviembre(@Res() res: Response): Promise<void> {
    this.logger.log('📊 Generando KPI de Noviembre: Errores vs Créditos Administrados...');

    try {
      const result = await this.kpisService.generateKPINoviembre2024();

      if (!result.success) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: result.error || 'Error generando KPI de Noviembre',
        });
        return;
      }

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'KPI de Noviembre generado exitosamente',
        data: result.data,
        timestamp: new Date().toISOString(),
      });

      this.logger.log('✅ KPI de Noviembre generado exitosamente');

    } catch (error) {
      this.logger.error('❌ Error generando KPI de Noviembre:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Error interno del servidor',
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
        stopYoyoCustomRange: 'GET /kpis/stop-yoyo/custom?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&erroresCartera=50',
        stopYoyoWeekly: 'GET /kpis/stop-yoyo/weekly?erroresCartera=50',
        stopYoyoByMonth: 'GET /kpis/stop-yoyo/:year/:month?erroresCartera=50',
        noviembre: 'GET /kpis/noviembre',
        sendEmails: 'GET /kpis/send-emails',
        health: 'GET /kpis/health',
      },
    });
  }
}
