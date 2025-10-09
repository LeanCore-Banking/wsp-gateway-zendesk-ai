import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';

export class TwilioWebhookDto {
  @IsString()
  MessageSid: string;

  @IsString()
  AccountSid: string;

  @IsPhoneNumber()
  From: string;

  @IsPhoneNumber()
  To: string;

  @IsString()
  Body: string;

  @IsString()
  NumMedia: string;

  @IsOptional()
  @IsString()
  MediaUrl0?: string;

  @IsOptional()
  @IsString()
  MediaContentType0?: string;

  @IsOptional()
  @IsString()
  ProfileName?: string;

  @IsString()
  WaId: string;

  @IsString()
  SmsMessageSid: string;

  @IsString()
  SmsStatus: string;

  @IsString()
  NumSegments: string;

  @IsOptional()
  @IsString()
  ReferralNumMedia?: string;

  @IsOptional()
  @IsString()
  MessageType?: string;
}

export class ZendeskWebhookDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  assignee_id?: string;

  @IsOptional()
  @IsString()
  requester_id?: string;

  // Campos para webhooks de mensajes de WhatsApp desde Zendesk
  @IsOptional()
  @IsString()
  ticket_id?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  channel?: {
    name: string;
  };

  @IsOptional()
  author?: {
    id: string;
    name?: string;
    role?: string;
  };

  @IsOptional()
  via?: {
    channel: string;
    source?: {
      from?: {
        phone?: string;
        name?: string;
      };
      to?: {
        phone?: string;
      };
    };
  } | any;

  @IsOptional()
  ticket?: {
    id: string;
    subject?: string;
    status?: string;
    priority?: string;
    custom_fields?: Array<{
      id: string | number;
      value: string | number | boolean | null;
    }>;
  };
}
