import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FunctionCallingService } from './function-calling.service';
import { HttpClientService } from '../http-client/http-client.service';

describe('FunctionCallingService', () => {
  let service: FunctionCallingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunctionCallingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: HttpClientService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FunctionCallingService>(FunctionCallingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
