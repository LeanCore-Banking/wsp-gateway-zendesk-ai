export interface TwilioWebhookData {
  MessageSid: string;
  AccountSid: string;
  From?: string;
  To?: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
  WaId?: string;
  SmsMessageSid?: string;
  SmsStatus?: string;
  NumSegments?: string;
  ReferralNumMedia?: string;
  MessageType?: string;
  Timestamp?: string;
}

export interface TwilioMessageResponse {
  sid: string;
  status: string;
  body: string;
  from: string;
  to: string;
  dateCreated: Date;
  dateUpdated: Date;
  dateSent?: Date;
  errorCode?: string;
  errorMessage?: string;
}
