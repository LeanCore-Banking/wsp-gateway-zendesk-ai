import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { WhatsAppMessage } from '../../common/interfaces/message.interface';
import { TwilioWebhookData } from './twilio.interfaces';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly twilioClient: Twilio;
  private readonly twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioPhoneNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (!accountSid || !authToken) {
      this.logger.warn(
        'Twilio credentials not found. Service will run in testing mode.',
      );
      // Crear un cliente mock para testing
      this.twilioClient = null as any;
    } else {
      this.twilioClient = new Twilio(accountSid, authToken);
    }
  }

  async sendWhatsAppMessage(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      this.logger.log(
        `[TESTING MODE] Would send WhatsApp message to ${to}: ${message}`,
      );
      return;
    }

    try {
      const result = await this.twilioClient.messages.create({
        from: `whatsapp:${this.twilioPhoneNumber}`,
        to: `whatsapp:${to}`,
        body: message,
      });

      this.logger.log(`Message sent successfully: ${result.sid}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      throw error;
    }
  }

  async sendWhatsAppMessageWithMedia(
    to: string,
    message: string,
    mediaUrl: string,
  ): Promise<void> {
    if (!this.twilioClient) {
      this.logger.log(
        `[TESTING MODE] Would send WhatsApp message with media to ${to}: ${message} (media: ${mediaUrl})`,
      );
      return;
    }

    try {
      const result = await this.twilioClient.messages.create({
        from: `whatsapp:${this.twilioPhoneNumber}`,
        to: `whatsapp:${to}`,
        body: message,
        mediaUrl: [mediaUrl],
      });

      this.logger.log(`Message with media sent successfully: ${result.sid}`);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message with media: ${error.message}`,
      );
      throw error;
    }
  }

  parseWebhookMessage(webhookData: TwilioWebhookData): WhatsAppMessage {
    return {
      MessageSid: webhookData.MessageSid,
      AccountSid: webhookData.AccountSid,
      From: webhookData.From?.replace('whatsapp:', '') || '',
      To: webhookData.To?.replace('whatsapp:', '') || '',
      Body: webhookData.Body || '',
      NumMedia: webhookData.NumMedia || '0',
      MediaUrl0: webhookData.MediaUrl0,
      MediaContentType0: webhookData.MediaContentType0,
      ProfileName: webhookData.ProfileName,
      WaId: webhookData.WaId || '',
      SmsMessageSid: webhookData.SmsMessageSid || '',
      SmsStatus: webhookData.SmsStatus || '',
      NumSegments: webhookData.NumSegments || '',
      ReferralNumMedia: webhookData.ReferralNumMedia,
      MessageType: webhookData.MessageType,
      Timestamp: webhookData.Timestamp,
    };
  }

  async getMessageStatus(messageSid: string): Promise<string> {
    if (!this.twilioClient) {
      this.logger.log(
        `[TESTING MODE] Would get status for message: ${messageSid}`,
      );
      return 'delivered'; // Mock status for testing
    }

    try {
      const message = await this.twilioClient.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      this.logger.error(`Failed to get message status: ${error.message}`);
      throw error;
    }
  }
}
