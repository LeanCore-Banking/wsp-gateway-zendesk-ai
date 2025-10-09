import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageProcessorService } from './message-processor.service';
import { InferenceModule } from '../inference/inference.module';
import { ActionsModule } from '../actions/actions.module';
import { TwilioService } from '../integration/twilio/twilio.service';
import { ZendeskService } from '../integration/zendesk/zendesk.service';

@Module({
  imports: [ConfigModule, InferenceModule, ActionsModule],
  providers: [MessageProcessorService, TwilioService, ZendeskService],
  exports: [MessageProcessorService],
})
export class MessageProcessorModule {}
