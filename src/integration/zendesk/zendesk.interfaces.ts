// Interfaces para la API de Zendesk
export interface ZendeskClient {
  tickets: {
    create(data: ZendeskTicketCreateRequest): Promise<ZendeskTicketResponse>;
    update(
      ticketId: string,
      data: ZendeskTicketUpdateRequest,
    ): Promise<ZendeskTicketResponse>;
    show(ticketId: string): Promise<ZendeskTicketResponse>;
  };
  search: {
    query(query: string): Promise<ZendeskSearchResponse>;
  };
}

export interface ZendeskTicketCreateRequest {
  ticket: {
    subject: string;
    comment: {
      body: string;
      public?: boolean;
    };
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
    tags?: string[];
    custom_fields?: ZendeskCustomField[];
    requester?: {
      name?: string;
      email?: string;
    };
  };
}

export interface ZendeskTicketUpdateRequest {
  ticket: {
    comment?: {
      body: string;
      public?: boolean;
    };
    status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    custom_fields?: ZendeskCustomField[];
  };
}

export interface ZendeskTicketResponse {
  ticket: ZendeskTicket;
}

export interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  custom_fields: ZendeskCustomField[];
  requester_id: number;
  created_at: string;
  updated_at: string;
}

export interface ZendeskCustomField {
  id: string | number;
  value: string | number | boolean | null;
}

export interface ZendeskSearchResponse {
  results: ZendeskTicket[];
  count: number;
  next_page: string | null;
  previous_page: string | null;
}

// Interface para la respuesta de AI que se usa en ZendeskService
export interface AITicketResponse {
  message?: string;
  ticketPriority?: 'low' | 'normal' | 'high' | 'urgent';
  ticketTags?: string[];
  suggestedActions?: string[];
  requiresHumanAgent?: boolean;
}
