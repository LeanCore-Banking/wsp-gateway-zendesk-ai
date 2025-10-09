import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwilioService } from './twilio/twilio.service';
import { ZendeskService } from './zendesk/zendesk.service';
import { WebhookController } from './webhook/webhook.controller';
import { MessageProcessorModule } from '../message-processor/message-processor.module';

@Module({
  imports: [ConfigModule, MessageProcessorModule],
  controllers: [WebhookController],
  providers: [TwilioService, ZendeskService],
  exports: [TwilioService, ZendeskService],
})
export class IntegrationModule {}
