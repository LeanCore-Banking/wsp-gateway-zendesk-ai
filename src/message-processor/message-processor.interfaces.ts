// Interfaces para Message Processor Service

export interface WebhookData {
  From: string;
  To: string;
  AccountSid: string;
  MessageSid: string;
  Body?: string;
  [key: string]: any; // Para campos adicionales del webhook
}

export interface ZendeskWebhookData {
  type: string;
  id: string;
  body?: string;
  via?: {
    channel: string;
  };
  [key: string]: any; // Para campos adicionales del webhook de Zendesk
}

export interface ZendeskCustomField {
  id: string;
  value: string | number | boolean | null;
}

export interface ZendeskTicketFromWebhook {
  id: string;
  custom_fields?: ZendeskCustomField[];
  [key: string]: any; // Para otros campos del ticket
}
