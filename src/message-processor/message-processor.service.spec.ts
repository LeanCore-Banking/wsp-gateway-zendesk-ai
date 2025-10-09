import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MessageProcessorService } from './message-processor.service';
import { TwilioService } from '../integration/twilio/twilio.service';
import { ZendeskService } from '../integration/zendesk/zendesk.service';
import { GeminiService } from '../inference/gemini/gemini.service';
import { ClassifierService } from '../inference/classifier/classifier.service';
import { FunctionCallingService } from '../actions/function-calling/function-calling.service';

describe('MessageProcessorService', () => {
  let service: MessageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageProcessorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
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
          },
        },
        {
          provide: GeminiService,
          useValue: {
            processWithFunctionCalling: jest.fn(),
          },
        },
        {
          provide: ClassifierService,
          useValue: {
            classifyMessage: jest.fn(),
          },
        },
        {
          provide: FunctionCallingService,
          useValue: {
            executeFunction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessageProcessorService>(MessageProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
