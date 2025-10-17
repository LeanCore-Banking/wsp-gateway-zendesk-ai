import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { MongoClientService } from '../database/services/mongo-client.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: process.env.SMTP_FROM || '"LeanCore" <noreply@leancore.com>',
      },
    }),
  ],
  controllers: [KpisController],
  providers: [KpisService, MongoClientService],
  exports: [KpisService],
})
export class KpisModule {}

