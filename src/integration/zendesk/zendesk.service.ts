import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProcessedMessage } from '../../common/interfaces/message.interface';
import {
  ZendeskClient,
  AITicketResponse,
  ZendeskTicket,
} from './zendesk.interfaces';
import zendesk from 'zendesk-node-api';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ZendeskService {
  private readonly logger = new Logger(ZendeskService.name);
  private readonly zendeskClient: ZendeskClient;
  private readonly axiosClient: AxiosInstance | null;
  private readonly subdomain: string;
  private readonly email: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.subdomain = this.configService.get<string>('ZENDESK_SUBDOMAIN') || '';
    this.email = this.configService.get<string>('ZENDESK_EMAIL') || '';
    this.apiToken = this.configService.get<string>('ZENDESK_API_TOKEN') || '';
    this.baseUrl = `https://${this.subdomain}.zendesk.com/api/v2`;

    if (!this.subdomain || !this.email || !this.apiToken) {
      this.logger.warn(
        'Zendesk credentials not found. Service will run in testing mode.',
      );
      // Crear clientes mock para testing
      this.zendeskClient = null as any;
      this.axiosClient = null;
      return;
    }

    // Inicializar cliente de Zendesk (mantener para compatibilidad)
    this.zendeskClient = zendesk({
      url: `https://${this.subdomain}.zendesk.com`,
      email: this.email,
      token: this.apiToken,
    });

    // Inicializar cliente axios para llamadas directas
    const auth = Buffer.from(`${this.email}/token:${this.apiToken}`).toString('base64');
    this.axiosClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Zendesk client initialized for: ${this.baseUrl}`);
  }

  async createTicket(
    message: ProcessedMessage,
    aiResponse: AITicketResponse,
  ): Promise<string> {
    // Modo de testing si no hay credenciales
    if (!this.axiosClient) {
      this.logger.log(
        `[TESTING MODE] Would create Zendesk ticket for ${message.from}: ${this.generateTicketSubject(message)}`,
      );
      return 'TEST_TICKET_12345';
    }

    try {
      // Preparar el payload según la documentación oficial de Zendesk
      // https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#create-ticket
      const ticketData = {
        ticket: {
          subject: this.generateTicketSubject(message),
          comment: {
            body: this.generateTicketDescription(message, aiResponse),
          },
          priority: aiResponse.ticketPriority || 'normal',
          status: 'new' as const,
          tags: [
            'whatsapp',
            'ai-processed',
            ...message.classification.tags,
            ...(aiResponse.ticketTags || []),
          ],
          requester: {
            name: message.profileName || `WhatsApp User ${message.from}`,
            email: this.generateRequesterEmail(message.from),
          },
        },
      };

      this.logger.debug('Creating ticket with data:', JSON.stringify(ticketData, null, 2));
      
      // Hacer la llamada directa a la API REST de Zendesk
      const response = await this.axiosClient.post('/tickets.json', ticketData);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!response.data || !response.data.ticket || !response.data.ticket.id) {
        this.logger.error('Invalid response from Zendesk API');
        this.logger.error('Response received:', JSON.stringify(response.data, null, 2));
        throw new Error('Zendesk API returned invalid response structure');
      }
      
      const ticketId = response.data.ticket.id;
      this.logger.log(`Ticket created successfully: ${ticketId}`);
      return ticketId.toString();
    } catch (error: any) {
      this.logger.error(`Failed to create Zendesk ticket: ${error.message}`);
      if (error.response) {
        this.logger.error(`API Response Status: ${error.response.status}`);
        this.logger.error(`API Response Data:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async addCommentToTicket(
    ticketId: string,
    comment: string,
    isPublic: boolean = true,
  ): Promise<void> {
    // Modo de testing si no hay credenciales
    if (!this.axiosClient) {
      this.logger.log(
        `[TESTING MODE] Would add comment to ticket ${ticketId}: ${comment.substring(0, 50)}...`,
      );
      return;
    }

    try {
      const updateData = {
        ticket: {
          comment: {
            body: comment,
            public: isPublic,
          },
        },
      };

      await this.axiosClient.put(`/tickets/${ticketId}.json`, updateData);
      this.logger.log(`Comment added to ticket ${ticketId}`);
    } catch (error: any) {
      this.logger.error(`Failed to add comment to ticket: ${error.message}`);
      if (error.response) {
        this.logger.error(`API Response:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Responde a un mensaje de WhatsApp agregando un comentario público al ticket
   * Este comentario será enviado automáticamente por Zendesk al cliente vía WhatsApp
   */
  async respondToWhatsAppMessage(
    ticketId: string,
    message: string,
  ): Promise<void> {
    // Modo de testing si no hay credenciales
    if (!this.zendeskClient) {
      this.logger.log(
        `[TESTING MODE] Would respond to WhatsApp via ticket ${ticketId}: ${message}`,
      );
      return;
    }

    try {
      // Los comentarios públicos en tickets de WhatsApp se envían automáticamente al cliente
      await this.addCommentToTicket(ticketId, message, true);
      this.logger.log(
        `WhatsApp response sent via ticket ${ticketId} comment`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to respond to WhatsApp message: ${error.message}`,
      );
      throw error;
    }
  }

  async getTicketById(ticketId: string): Promise<ZendeskTicket> {
    if (!this.axiosClient) {
      this.logger.log(`[TESTING MODE] Would get ticket ${ticketId}`);
      // Retornar un ticket mock para testing
      return {
        id: parseInt(ticketId),
        subject: 'Mock Ticket',
        description: 'Mock Description',
        status: 'open',
        priority: 'normal',
        tags: ['test'],
        custom_fields: [],
        requester_id: 12345,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ZendeskTicket;
    }

    try {
      const response = await this.axiosClient.get(`/tickets/${ticketId}.json`);
      return response.data.ticket;
    } catch (error: any) {
      this.logger.error(`Failed to get ticket: ${error.message}`);
      if (error.response) {
        this.logger.error(`API Response:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async searchTicketsByPhoneNumber(
    phoneNumber: string,
  ): Promise<ZendeskTicket[]> {
    if (!this.axiosClient) {
      this.logger.log(`[TESTING MODE] Would search tickets for ${phoneNumber}`);
      return [];
    }

    try {
      const query = `type:ticket custom_field_whatsapp_number:${phoneNumber}`;
      const response = await this.axiosClient.get(`/search.json`, {
        params: { query },
      });
      return response.data.results || [];
    } catch (error: any) {
      this.logger.error(`Failed to search tickets: ${error.message}`);
      if (error.response) {
        this.logger.error(`API Response:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async updateTicketStatus(
    ticketId: string,
    status: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed',
  ): Promise<void> {
    if (!this.axiosClient) {
      this.logger.log(
        `[TESTING MODE] Would update ticket ${ticketId} status to ${status}`,
      );
      return;
    }

    try {
      const updateData = {
        ticket: {
          status: status,
        },
      };

      await this.axiosClient.put(`/tickets/${ticketId}.json`, updateData);
      this.logger.log(`Ticket ${ticketId} status updated to ${status}`);
    } catch (error: any) {
      this.logger.error(`Failed to update ticket status: ${error.message}`);
      if (error.response) {
        this.logger.error(`API Response:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  private generateTicketSubject(message: ProcessedMessage): string {
    const category = message.classification.category;
    const priority = message.priority;
    return `[WhatsApp ${category.toUpperCase()}] ${priority.toUpperCase()} - ${message.profileName || message.from}`;
  }

  /**
   * Genera un email válido para el requester
   * No se puede usar el dominio @subdomain.zendesk.com porque está reservado para soporte
   */
  private generateRequesterEmail(from: string): string {
    // Si ya es un email válido, usarlo directamente
    if (from.includes('@')) {
      return from;
    }
    
    // Limpiar el "from" para crear un email válido
    // Remover caracteres especiales excepto números
    let cleanFrom = from
      .replace(/[^0-9]/g, '') // Solo permitir números
      .trim();
    
    // Si está vacío después de limpiar, usar un placeholder
    if (!cleanFrom) {
      cleanFrom = Date.now().toString(); // Usar timestamp como fallback
    }
    
    // Usar el formato de tu dominio: numero@stopyoyo.com.co
    // Este formato es válido y no causa conflictos con Zendesk
    return `${cleanFrom}@stopyoyo.com.co`;
  }

  private generateTicketDescription(
    message: ProcessedMessage,
    aiResponse: AITicketResponse,
  ): string {
    return `
**Mensaje de WhatsApp recibido:**
${message.body}

**Información del contacto:**
- Número: ${message.from}
- Nombre: ${message.profileName || 'No disponible'}
- Timestamp: ${message.timestamp.toISOString()}

**Clasificación automática:**
- Categoría: ${message.classification.category}
- Subcategoría: ${message.classification.subcategory || 'N/A'}
- Confianza: ${(message.classification.confidence * 100).toFixed(1)}%
- Sentimiento: ${message.sentiment}
- Prioridad: ${message.priority}
- Requiere agente humano: ${message.classification.requiresHumanAgent ? 'Sí' : 'No'}

**Etiquetas:** ${message.classification.tags.join(', ')}

**Acciones sugeridas:** ${message.classification.suggestedActions.join(', ')}

${aiResponse.message ? `**Respuesta de IA:** ${aiResponse.message}` : ''}

---
*Este ticket fue creado automáticamente por el sistema de IA.*
    `.trim();
  }
}
