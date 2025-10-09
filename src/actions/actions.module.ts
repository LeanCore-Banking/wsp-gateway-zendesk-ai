import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FunctionCallingService } from './function-calling/function-calling.service';
import { HttpClientService } from './http-client/http-client.service';
import { MongoClientService } from '../database/services/mongo-client.service';

@Module({
  imports: [ConfigModule],
  providers: [FunctionCallingService, HttpClientService, MongoClientService],
  exports: [FunctionCallingService, HttpClientService],
})
export class ActionsModule {}
