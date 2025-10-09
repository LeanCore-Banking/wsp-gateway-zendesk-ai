import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  TwilioWebhookDto,
  ZendeskWebhookDto,
} from '../../common/dto/webhook.dto';
import { TwilioService } from '../twilio/twilio.service';
import { ZendeskService } from '../zendesk/zendesk.service';
import { MessageProcessorService } from '../../message-processor/message-processor.service';
import type {
  TestEndpointRequest,
  TestEndpointResponse,
} from './webhook.interfaces';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly twilioService: TwilioService,
    private readonly zendeskService: ZendeskService,
    private readonly messageProcessorService: MessageProcessorService,
  ) {}

  @Post('twilio/whatsapp')
  @HttpCode(HttpStatus.OK)
  async handleTwilioWhatsAppWebhook(
    @Body() webhookData: TwilioWebhookDto,
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.log('=== INICIO WEBHOOK TWILIO WHATSAPP ===');

    try {
      // Log detallado del webhook recibido
      this.logger.log(`📱 Mensaje WhatsApp recibido:`);
      this.logger.log(`   - MessageSid: ${webhookData.MessageSid}`);
      this.logger.log(`   - From: ${webhookData.From}`);
      this.logger.log(`   - To: ${webhookData.To}`);
      this.logger.log(`   - Body: "${webhookData.Body}"`);
      this.logger.log(`   - ProfileName: ${webhookData.ProfileName || 'N/A'}`);
      this.logger.log(`   - WaId: ${webhookData.WaId}`);
      this.logger.log(`   - NumMedia: ${webhookData.NumMedia}`);

      if (webhookData.MediaUrl0) {
        this.logger.log(`   - MediaUrl0: ${webhookData.MediaUrl0}`);
        this.logger.log(
          `   - MediaContentType0: ${webhookData.MediaContentType0}`,
        );
      }

      // Log del payload completo para debugging
      this.logger.debug('📋 Payload completo del webhook:');
      this.logger.debug(JSON.stringify(webhookData, null, 2));

      // Procesar mensaje completo con IA
      this.logger.log('🚀 Iniciando procesamiento con MessageProcessor...');
      await this.messageProcessorService.processWhatsAppMessage(webhookData);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ Webhook procesado exitosamente en ${processingTime}ms`,
      );
      this.logger.log('=== FIN WEBHOOK TWILIO WHATSAPP ===');

      return 'OK';
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Error procesando webhook de Twilio (${processingTime}ms):`,
        error,
      );
      this.logger.error('Stack trace:', error.stack);
      this.logger.log('=== FIN WEBHOOK TWILIO WHATSAPP (ERROR) ===');
      throw error;
    }
  }

  @Post('zendesk/ticket')
  @HttpCode(HttpStatus.OK)
  async handleZendeskTicketWebhook(
    @Body() webhookData: ZendeskWebhookDto,
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.log('=== INICIO WEBHOOK ZENDESK ===');

    try {
      // Log detallado del webhook recibido
      this.logger.log(`📬 Webhook de Zendesk recibido:`);
      this.logger.log(`   - ID: ${webhookData.id}`);
      this.logger.log(`   - Type: ${webhookData.type}`);
      this.logger.log(`   - Ticket ID: ${webhookData.ticket_id || webhookData.ticket?.id || 'N/A'}`);

      if (webhookData.via?.channel) {
        this.logger.log(`   - Channel: ${webhookData.via.channel}`);
      }

      if (webhookData.author) {
        this.logger.log(`   - Author: ${webhookData.author.name || webhookData.author.id}`);
        this.logger.log(`   - Author Role: ${webhookData.author.role || 'N/A'}`);
      }

      if (webhookData.message || webhookData.description) {
        const message = webhookData.message || webhookData.description || '';
        this.logger.log(`   - Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
      }

      // Log del payload completo para debugging
      this.logger.debug('📋 Payload completo del webhook:');
      this.logger.debug(JSON.stringify(webhookData, null, 2));

      // Procesar webhook de Zendesk
      this.logger.log('🚀 Iniciando procesamiento con MessageProcessor...');
      await this.messageProcessorService.processZendeskWebhook(webhookData);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ Webhook de Zendesk procesado exitosamente en ${processingTime}ms`,
      );
      this.logger.log('=== FIN WEBHOOK ZENDESK ===');

      return 'OK';
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Error procesando webhook de Zendesk (${processingTime}ms):`,
        error,
      );
      this.logger.error('Stack trace:', error.stack);
      this.logger.log('=== FIN WEBHOOK ZENDESK (ERROR) ===');
      throw error;
    }
  }

  @Post('zendesk/whatsapp')
  @HttpCode(HttpStatus.OK)
  async handleZendeskWhatsAppWebhook(
    @Body() webhookData: ZendeskWebhookDto,
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.log('=== INICIO WEBHOOK ZENDESK WHATSAPP ===');

    try {
      // Log detallado del webhook recibido
      this.logger.log(`📱 Mensaje WhatsApp desde Zendesk recibido:`);
      this.logger.log(`   - Ticket ID: ${webhookData.ticket_id || webhookData.ticket?.id || webhookData.id}`);
      this.logger.log(`   - Type: ${webhookData.type}`);

      if (webhookData.via?.source?.from?.phone) {
        this.logger.log(`   - From: ${webhookData.via.source.from.phone}`);
        this.logger.log(`   - Name: ${webhookData.via.source.from.name || 'N/A'}`);
      }

      if (webhookData.message) {
        this.logger.log(`   - Message: "${webhookData.message.substring(0, 100)}${webhookData.message.length > 100 ? '...' : ''}"`);
      }

      // Log del payload completo para debugging
      this.logger.debug('📋 Payload completo del webhook:');
      this.logger.debug(JSON.stringify(webhookData, null, 2));

      // Procesar webhook de Zendesk WhatsApp
      this.logger.log('🚀 Iniciando procesamiento con MessageProcessor...');
      await this.messageProcessorService.processZendeskWebhook(webhookData);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ Webhook de Zendesk WhatsApp procesado exitosamente en ${processingTime}ms`,
      );
      this.logger.log('=== FIN WEBHOOK ZENDESK WHATSAPP ===');

      return 'OK';
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Error procesando webhook de Zendesk WhatsApp (${processingTime}ms):`,
        error,
      );
      this.logger.error('Stack trace:', error.stack);
      this.logger.log('=== FIN WEBHOOK ZENDESK WHATSAPP (ERROR) ===');
      throw error;
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  testEndpoint(@Body() data: TestEndpointRequest): TestEndpointResponse {
    this.logger.log('Test endpoint called');
    this.logger.log(JSON.stringify(data, null, 2));
    return { status: 'OK', received: data };
  }
}
