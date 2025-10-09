import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from './twilio.service';

describe('TwilioService', () => {
  let service: TwilioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string): string | undefined => {
                const config: Record<string, string> = {
                  TWILIO_ACCOUNT_SID: 'ACtest1234567890abcdef1234567890abcd',
                  TWILIO_AUTH_TOKEN: 'test_auth_token_1234567890abcdef',
                  TWILIO_PHONE_NUMBER: '+1234567890',
                };
                return config[key];
              }),
          },
        },
      ],
    }).compile();

    service = module.get<TwilioService>(TwilioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
