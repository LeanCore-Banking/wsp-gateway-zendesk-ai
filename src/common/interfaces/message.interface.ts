export interface WhatsAppMessage {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
  WaId: string;
  SmsMessageSid: string;
  SmsStatus: string;
  NumSegments: string;
  ReferralNumMedia?: string;
  MessageType?: string;
  Timestamp?: string;
}

export interface ProcessedMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  classification: MessageClassification;
  sentiment: 'positive' | 'negative' | 'neutral';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  mediaUrls?: string[];
  profileName?: string;
}

export interface MessageClassification {
  category: 'support' | 'sales' | 'complaint' | 'inquiry' | 'other';
  subcategory?: string;
  confidence: number;
  tags: string[];
  requiresHumanAgent: boolean;
  suggestedActions: string[];
}

export interface AIResponse {
  message: string;
  functionCalls?: FunctionCall[];
  shouldCreateTicket: boolean;
  ticketPriority?: 'low' | 'normal' | 'high' | 'urgent';
  ticketTags?: string[];
  requiresHumanAgent?: boolean;
}

export interface FunctionCall {
  name: string;
  parameters: Record<string, any>;
  description: string;
}
