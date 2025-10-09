import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { MongoClientService } from '../database/services/mongo-client.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [KpisController],
  providers: [KpisService, MongoClientService],
  exports: [KpisService],
})
export class KpisModule {}

