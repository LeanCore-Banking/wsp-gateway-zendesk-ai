import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ZendeskService } from './zendesk.service';
import { ProcessedMessage } from '../../common/interfaces/message.interface';
import { AITicketResponse } from './zendesk.interfaces';

// Mock del cliente de Zendesk
const mockZendeskClient = {
  tickets: {
    create: jest.fn(),
    show: jest.fn(),
    update: jest.fn(),
  },
  search: {
    query: jest.fn(),
  },
};

// Mock zendesk-node-api module
jest.mock('zendesk-node-api', () => {
  return jest.fn(() => mockZendeskClient);
});

describe('ZendeskService', () => {
  let service: ZendeskService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Limpiar mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZendeskService,
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string): string | undefined => {
                const config: Record<string, string> = {
                  ZENDESK_SUBDOMAIN: 'test-company',
                  ZENDESK_EMAIL: 'test@example.com',
                  ZENDESK_API_TOKEN: 'test_api_token_1234567890abcdef',
                };
                return config[key];
              }),
          },
        },
      ],
    }).compile();

    service = module.get<ZendeskService>(ZendeskService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTicket', () => {
    it('should create a ticket successfully', async () => {
      const mockMessage: ProcessedMessage = {
        id: 'msg-123',
        from: 'whatsapp:+573001234567',
        to: 'whatsapp:+14155238886',
        body: 'Hola, necesito ayuda con mi crédito',
        timestamp: new Date(),
        classification: {
          category: 'support',
          confidence: 0.9,
          tags: ['loan', 'help'],
          requiresHumanAgent: true,
          suggestedActions: ['check_loan'],
        },
        sentiment: 'neutral',
        priority: 'high',
        profileName: 'Juan Pérez',
      };

      const mockAIResponse: AITicketResponse = {
        message: 'Claro, te ayudaré con tu crédito',
        ticketPriority: 'high',
        ticketTags: ['ai-processed'],
      };

      const mockTicketResponse = {
        ticket: {
          id: 12345,
          subject: '[WhatsApp SUPPORT] HIGH - Juan Pérez',
        },
      };

      mockZendeskClient.tickets.create.mockResolvedValue(mockTicketResponse);

      const result = await service.createTicket(mockMessage, mockAIResponse);

      expect(result).toBe('12345');
      expect(mockZendeskClient.tickets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket: expect.objectContaining({
            subject: expect.stringContaining('WhatsApp'),
            priority: 'high',
            status: 'new',
            tags: expect.arrayContaining(['whatsapp', 'ai-processed', 'loan', 'help']),
          }),
        }),
      );
    });

    it('should handle creation errors', async () => {
      const mockMessage: ProcessedMessage = {
        id: 'msg-124',
        from: 'whatsapp:+573001234567',
        to: 'whatsapp:+14155238886',
        body: 'Test error',
        timestamp: new Date(),
        classification: {
          category: 'support',
          confidence: 0.8,
          tags: [],
          requiresHumanAgent: false,
          suggestedActions: [],
        },
        sentiment: 'neutral',
        priority: 'medium',
      };

      const mockAIResponse: AITicketResponse = {
        message: 'Response',
      };

      mockZendeskClient.tickets.create.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(
        service.createTicket(mockMessage, mockAIResponse),
      ).rejects.toThrow('API Error');
    });
  });

  describe('respondToWhatsAppMessage', () => {
    it('should send a response via ticket comment', async () => {
      const ticketId = '12345';
      const message = 'Hola, he revisado tu crédito y todo está en orden.';

      mockZendeskClient.tickets.update.mockResolvedValue({
        ticket: { id: 12345 },
      });

      await service.respondToWhatsAppMessage(ticketId, message);

      expect(mockZendeskClient.tickets.update).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          ticket: {
            comment: {
              body: message,
              public: true,
            },
          },
        }),
      );
    });

    it('should handle response errors', async () => {
      const ticketId = '12346';
      const message = 'Test response';

      mockZendeskClient.tickets.update.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        service.respondToWhatsAppMessage(ticketId, message),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('addCommentToTicket', () => {
    it('should add a public comment to a ticket', async () => {
      const ticketId = '12345';
      const comment = 'Este es un comentario de prueba';

      mockZendeskClient.tickets.update.mockResolvedValue({
        ticket: { id: 12345 },
      });

      await service.addCommentToTicket(ticketId, comment, true);

      expect(mockZendeskClient.tickets.update).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          ticket: {
            comment: {
              body: comment,
              public: true,
            },
          },
        }),
      );
    });

    it('should add a private comment to a ticket', async () => {
      const ticketId = '12345';
      const comment = 'Nota interna privada';

      mockZendeskClient.tickets.update.mockResolvedValue({
        ticket: { id: 12345 },
      });

      await service.addCommentToTicket(ticketId, comment, false);

      expect(mockZendeskClient.tickets.update).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          ticket: {
            comment: {
              body: comment,
              public: false,
            },
          },
        }),
      );
    });
  });

  describe('getTicketById', () => {
    it('should retrieve a ticket by ID', async () => {
      const ticketId = '12345';
      const mockTicket = {
        ticket: {
          id: 12345,
          subject: 'Test Ticket',
          status: 'open',
          priority: 'normal',
          tags: ['whatsapp'],
          custom_fields: [],
          requester_id: 67890,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
          description: 'Test description',
        },
      };

      mockZendeskClient.tickets.show.mockResolvedValue(mockTicket);

      const result = await service.getTicketById(ticketId);

      expect(result).toEqual(mockTicket.ticket);
      expect(mockZendeskClient.tickets.show).toHaveBeenCalledWith(ticketId);
    });
  });

  describe('searchTicketsByPhoneNumber', () => {
    it('should search tickets by phone number', async () => {
      const phoneNumber = '+573001234567';
      const mockSearchResults = {
        results: [
          {
            id: 12345,
            subject: 'WhatsApp conversation',
          },
          {
            id: 12346,
            subject: 'Another conversation',
          },
        ],
        count: 2,
      };

      mockZendeskClient.search.query.mockResolvedValue(mockSearchResults);

      const result = await service.searchTicketsByPhoneNumber(phoneNumber);

      expect(result).toEqual(mockSearchResults.results);
      expect(mockZendeskClient.search.query).toHaveBeenCalledWith(
        expect.stringContaining(phoneNumber),
      );
    });
  });

  describe('updateTicketStatus', () => {
    it('should update ticket status to solved', async () => {
      const ticketId = '12345';

      mockZendeskClient.tickets.update.mockResolvedValue({
        ticket: { id: 12345, status: 'solved' },
      });

      await service.updateTicketStatus(ticketId, 'solved');

      expect(mockZendeskClient.tickets.update).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          ticket: {
            status: 'solved',
          },
        }),
      );
    });

    it('should update ticket status to pending', async () => {
      const ticketId = '12346';

      mockZendeskClient.tickets.update.mockResolvedValue({
        ticket: { id: 12346, status: 'pending' },
      });

      await service.updateTicketStatus(ticketId, 'pending');

      expect(mockZendeskClient.tickets.update).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          ticket: {
            status: 'pending',
          },
        }),
      );
    });
  });

  describe('Testing Mode (sin credenciales)', () => {
    let serviceWithoutCredentials: ZendeskService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ZendeskService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined), // Sin credenciales
            },
          },
        ],
      }).compile();

      serviceWithoutCredentials =
        module.get<ZendeskService>(ZendeskService);
    });

    it('should work in testing mode when creating tickets', async () => {
      const mockMessage: ProcessedMessage = {
        id: 'msg-123',
        from: 'whatsapp:+573001234567',
        to: 'whatsapp:+14155238886',
        body: 'Test message',
        timestamp: new Date(),
        classification: {
          category: 'support',
          confidence: 0.8,
          tags: [],
          requiresHumanAgent: false,
          suggestedActions: [],
        },
        sentiment: 'neutral',
        priority: 'medium',
      };

      const mockAIResponse: AITicketResponse = {
        message: 'Response',
      };

      const result = await serviceWithoutCredentials.createTicket(
        mockMessage,
        mockAIResponse,
      );

      expect(result).toBe('TEST_TICKET_12345');
    });

    it('should work in testing mode when responding to WhatsApp', async () => {
      await expect(
        serviceWithoutCredentials.respondToWhatsAppMessage(
          '12345',
          'Test response',
        ),
      ).resolves.not.toThrow();
    });
  });
});
