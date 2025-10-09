import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { TwilioService } from '../twilio/twilio.service';
import { ZendeskService } from '../zendesk/zendesk.service';
import { MessageProcessorService } from '../../message-processor/message-processor.service';
import { ZendeskWebhookDto } from '../../common/dto/webhook.dto';

describe('WebhookController', () => {
  let controller: WebhookController;
  let messageProcessorService: MessageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: TwilioService,
          useValue: {
            parseWebhookMessage: jest.fn(),
            sendWhatsAppMessage: jest.fn(),
          },
        },
        {
          provide: ZendeskService,
          useValue: {
            createTicket: jest.fn(),
            getTicketById: jest.fn(),
            respondToWhatsAppMessage: jest.fn(),
          },
        },
        {
          provide: MessageProcessorService,
          useValue: {
            processWhatsAppMessage: jest.fn(),
            processZendeskWebhook: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    messageProcessorService = module.get<MessageProcessorService>(
      MessageProcessorService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleZendeskWhatsAppWebhook', () => {
    it('should process a valid WhatsApp message from Zendesk', async () => {
      const webhookData: ZendeskWebhookDto = {
        id: '12345',
        type: 'ticket_comment',
        ticket_id: '12345',
        message: 'Hola, necesito ayuda con mi crédito 577b35a6',
        via: {
          channel: 'whatsapp',
          source: {
            from: {
              phone: '+573001234567',
              name: 'Juan Pérez',
            },
          },
        },
        author: {
          id: '67890',
          name: 'Juan Pérez',
          role: 'end_user',
        },
      };

      const result = await controller.handleZendeskWhatsAppWebhook(webhookData);

      expect(result).toBe('OK');
      expect(messageProcessorService.processZendeskWebhook).toHaveBeenCalledWith(
        webhookData,
      );
    });

    it('should process a complaint message with high priority', async () => {
      const webhookData: ZendeskWebhookDto = {
        id: '12346',
        type: 'ticket_comment',
        ticket_id: '12346',
        message:
          '¡Esto es inaceptable! Llevo 3 días esperando una respuesta y nadie me contesta.',
        via: {
          channel: 'whatsapp',
          source: {
            from: {
              phone: '+573009876543',
              name: 'María García',
            },
          },
        },
        author: {
          id: '67891',
          name: 'María García',
          role: 'end_user',
        },
      };

      const result = await controller.handleZendeskWhatsAppWebhook(webhookData);

      expect(result).toBe('OK');
      expect(messageProcessorService.processZendeskWebhook).toHaveBeenCalledWith(
        webhookData,
      );
    });

    it('should process a sales inquiry', async () => {
      const webhookData: ZendeskWebhookDto = {
        id: '12347',
        type: 'ticket_comment',
        ticket_id: '12347',
        message:
          'Buenas tardes, estoy interesado en solicitar un crédito. ¿Qué requisitos necesito?',
        via: {
          channel: 'whatsapp',
          source: {
            from: {
              phone: '+573005551234',
              name: 'Carlos Rodríguez',
            },
          },
        },
        author: {
          id: '67892',
          name: 'Carlos Rodríguez',
          role: 'end_user',
        },
      };

      const result = await controller.handleZendeskWhatsAppWebhook(webhookData);

      expect(result).toBe('OK');
      expect(messageProcessorService.processZendeskWebhook).toHaveBeenCalledWith(
        webhookData,
      );
    });

    it('should handle loan issue with specific ID', async () => {
      const webhookData: ZendeskWebhookDto = {
        id: '12349',
        type: 'ticket_comment',
        ticket_id: '12349',
        message:
          'Buenos días, tengo un problema con mi crédito ID 577b35a6. Hice un pago hace 3 días pero todavía no se refleja.',
        via: {
          channel: 'whatsapp',
          source: {
            from: {
              phone: '+573001112222',
              name: 'Ana Martínez',
            },
          },
        },
        author: {
          id: '67893',
          name: 'Ana Martínez',
          role: 'end_user',
        },
      };

      const result = await controller.handleZendeskWhatsAppWebhook(webhookData);

      expect(result).toBe('OK');
      expect(messageProcessorService.processZendeskWebhook).toHaveBeenCalledWith(
        webhookData,
      );
    });

    it('should handle errors gracefully', async () => {
      const webhookData: ZendeskWebhookDto = {
        id: '12350',
        type: 'ticket_comment',
        message: 'Test error',
        via: {
          channel: 'whatsapp',
        },
        author: {
          id: '67894',
          role: 'end_user',
        },
      };

      jest
        .spyOn(messageProcessorService, 'processZendeskWebhook')
        .mockRejectedValueOnce(new Error('Processing error'));

      await expect(
        controller.handleZendeskWhatsAppWebhook(webhookData),
      ).rejects.toThrow('Processing error');
    });
  });

  describe('handleZendeskTicketWebhook', () => {
    it('should process a general Zendesk ticket webhook', async () => {
      const webhookData: ZendeskWebhookDto = {
        id: '12351',
        type: 'ticket_update',
        subject: 'Test ticket',
        status: 'open',
      };

      const result = await controller.handleZendeskTicketWebhook(webhookData);

      expect(result).toBe('OK');
      expect(messageProcessorService.processZendeskWebhook).toHaveBeenCalledWith(
        webhookData,
      );
    });

    it('should process agent responses from web channel', async () => {
      const webhookData: ZendeskWebhookDto = {
        id: '12352',
        type: 'ticket_comment',
        message: 'Hola, con gusto te ayudo',
        via: {
          channel: 'web',
        },
        author: {
          id: '99999',
          name: 'Agente de Soporte',
          role: 'agent',
        },
      };

      const result = await controller.handleZendeskTicketWebhook(webhookData);

      expect(result).toBe('OK');
      expect(messageProcessorService.processZendeskWebhook).toHaveBeenCalledWith(
        webhookData,
      );
    });
  });
});
