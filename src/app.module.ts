import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IntegrationModule } from './integration/integration.module';
import { InferenceModule } from './inference/inference.module';
import { ActionsModule } from './actions/actions.module';
import { MessageProcessorModule } from './message-processor/message-processor.module';
import { KpisModule } from './kpis/kpis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    IntegrationModule,
    InferenceModule,
    ActionsModule,
    MessageProcessorModule,
    KpisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
