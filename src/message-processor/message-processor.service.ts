import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from '../integration/twilio/twilio.service';
import { ZendeskService } from '../integration/zendesk/zendesk.service';
import { GeminiService } from '../inference/gemini/gemini.service';
import { ClassifierService } from '../inference/classifier/classifier.service';
import { FunctionCallingService } from '../actions/function-calling/function-calling.service';
import {
  ProcessedMessage,
  AIResponse,
  FunctionCall,
} from '../common/interfaces/message.interface';
import {
  WebhookData,
  ZendeskWebhookData,
} from './message-processor.interfaces';

@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger(MessageProcessorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioService: TwilioService,
    private readonly zendeskService: ZendeskService,
    private readonly geminiService: GeminiService,
    private readonly classifierService: ClassifierService,
    private readonly functionCallingService: FunctionCallingService,
  ) {}

  /**
   * Procesa un mensaje de WhatsApp completo desde webhook hasta respuesta
   */
  async processWhatsAppMessage(webhookData: WebhookData): Promise<void> {
    const processingId = `${webhookData.MessageSid}-${Date.now()}`;
    this.logger.log(`🔄 [${processingId}] INICIANDO PROCESAMIENTO DE MENSAJE`);

    try {
      this.logger.log(
        `📞 [${processingId}] Procesando mensaje de ${webhookData.From}`,
      );

      // 1. Parsear mensaje de Twilio
      this.logger.log(
        `🔍 [${processingId}] Paso 1: Parseando mensaje de Twilio...`,
      );
      const whatsappMessage =
        this.twilioService.parseWebhookMessage(webhookData);
      this.logger.log(
        `✅ [${processingId}] Mensaje parseado: ${whatsappMessage.Body.substring(0, 50)}...`,
      );

      // 2. Clasificar mensaje
      this.logger.log(`🏷️ [${processingId}] Paso 2: Clasificando mensaje...`);
      const classification =
        this.classifierService.classifyMessage(whatsappMessage);
      this.logger.log(
        `✅ [${processingId}] Clasificación: ${classification.category} (confianza: ${(classification.confidence * 100).toFixed(1)}%)`,
      );
      this.logger.log(
        `🏷️ [${processingId}] Tags: ${classification.tags.join(', ')}`,
      );
      this.logger.log(
        `👤 [${processingId}] Requiere agente humano: ${classification.requiresHumanAgent ? 'SÍ' : 'NO'}`,
      );

      // 3. Crear mensaje procesado
      this.logger.log(
        `📝 [${processingId}] Paso 3: Creando mensaje procesado...`,
      );
      const processedMessage: ProcessedMessage = {
        id: whatsappMessage.MessageSid,
        from: whatsappMessage.From,
        to: whatsappMessage.To,
        body: whatsappMessage.Body,
        timestamp: new Date(),
        classification: classification,
        sentiment: classification.tags?.includes('positive')
          ? 'positive'
          : classification.tags?.includes('negative')
            ? 'negative'
            : 'neutral',
        priority: this.determinePriority(classification),
        mediaUrls: whatsappMessage.MediaUrl0
          ? [whatsappMessage.MediaUrl0]
          : undefined,
        profileName: whatsappMessage.ProfileName,
      };
      this.logger.log(
        `✅ [${processingId}] Mensaje procesado - Prioridad: ${processedMessage.priority}, Sentimiento: ${processedMessage.sentiment}`,
      );

      // 4. Procesar con Gemini AI
      this.logger.log(
        `🤖 [${processingId}] Paso 4: Procesando con Gemini AI...`,
      );
      const aiResponse = await this.processWithAI(processedMessage);
      this.logger.log(
        `✅ [${processingId}] Respuesta de IA generada (${aiResponse.message.length} caracteres)`,
      );
      this.logger.log(
        `🎫 [${processingId}] Crear ticket: ${aiResponse.shouldCreateTicket ? 'SÍ' : 'NO'}`,
      );

      if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
        this.logger.log(
          `⚡ [${processingId}] Function calls detectados: ${aiResponse.functionCalls.length}`,
        );
        aiResponse.functionCalls.forEach((fc, index) => {
          this.logger.log(`   ${index + 1}. ${fc.name}: ${fc.description}`);
        });
      }

      // 5. Ejecutar function calls si existen
      if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
        this.logger.log(
          `⚡ [${processingId}] Paso 5: Ejecutando function calls...`,
        );
        const functionResults = await this.executeFunctionCalls(
          aiResponse.functionCalls,
          processedMessage,
        );
        this.logger.log(
          `✅ [${processingId}] Function calls ejecutados exitosamente`,
        );
        
        // Ajustar respuesta si el ID de crédito no se encontró
        aiResponse.message = this.adjustResponseBasedOnResults(
          aiResponse.message,
          functionResults,
        );
      } else {
        this.logger.log(
          `⏭️ [${processingId}] Paso 5: No hay function calls para ejecutar`,
        );
      }

      // 6. Crear ticket en Zendesk si es necesario
      let ticketId: string | undefined;
      if (aiResponse.shouldCreateTicket) {
        this.logger.log(
          `🎫 [${processingId}] Paso 6: Creando ticket en Zendesk...`,
        );
        ticketId = await this.createZendeskTicket(processedMessage, aiResponse);
        this.logger.log(`✅ [${processingId}] Ticket creado: ${ticketId}`);
      } else {
        this.logger.log(
          `⏭️ [${processingId}] Paso 6: No se requiere crear ticket`,
        );
      }

      // 7. Enviar respuesta por WhatsApp
      this.logger.log(
        `📱 [${processingId}] Paso 7: Enviando respuesta por WhatsApp...`,
      );
      await this.sendWhatsAppResponse(processedMessage, aiResponse, ticketId);
      this.logger.log(`✅ [${processingId}] Respuesta enviada exitosamente`);

      this.logger.log(
        `🎉 [${processingId}] PROCESAMIENTO COMPLETADO EXITOSAMENTE`,
      );
    } catch (error) {
      this.logger.error(`❌ [${processingId}] ERROR EN PROCESAMIENTO:`, error);
      this.logger.error(`❌ [${processingId}] Stack trace:`, error.stack);

      // Enviar mensaje de error al usuario
      this.logger.log(
        `📱 [${processingId}] Enviando mensaje de error al usuario...`,
      );
      await this.sendErrorResponse(webhookData.From);
      this.logger.log(`📱 [${processingId}] Mensaje de error enviado`);
    }
  }

  /**
   * Procesa el mensaje con Gemini AI
   */
  private async processWithAI(message: ProcessedMessage): Promise<AIResponse> {
    try {
      // Procesar con Gemini
      const aiResponse =
        await this.geminiService.processWithFunctionCalling(message);

      return aiResponse;
    } catch (error) {
      this.logger.error('Error processing with AI:', error);

      // Respuesta de fallback
      return {
        message:
          'Gracias por tu mensaje. Un agente se pondrá en contacto contigo pronto.',
        shouldCreateTicket: true,
        ticketPriority: 'normal',
        ticketTags: ['ai-fallback'],
      };
    }
  }

  /**
   * Ejecuta las function calls de la IA
   * Retorna los resultados para poder ajustar la respuesta si es necesario
   */
  private async executeFunctionCalls(
    functionCalls: FunctionCall[],
    message: ProcessedMessage,
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    let loanId: string | null = null;
    let financialEntityId: string | null = null;
    
    // Paso 1: Ejecutar get_loan_by_partial_id primero
    const getLoanCall = functionCalls.find(fc => fc.name === 'get_loan_by_partial_id');
    if (getLoanCall) {
      try {
        this.logger.log(`Executing function: ${getLoanCall.name}`);
        
        const result = await this.functionCallingService.executeFunction(getLoanCall);
        
        this.logger.log(
          `Function ${getLoanCall.name} executed successfully:`,
          result,
        );
        
        results.set(getLoanCall.name, result);
        
        // Si encontró exactamente 1 préstamo, guardar el ID completo y financial_entity_id
        if (result.success && (result.data as any)?.loan) {
          const loan = (result.data as any).loan;
          loanId = loan._id;
          financialEntityId = loan.financial_entity_id; // Tomar del préstamo encontrado
          
          this.logger.log(`✅ ID completo obtenido: ${loanId}`);
          this.logger.log(`📋 Datos del préstamo:`);
          this.logger.log(`   - user_nit: ${loan.user_nit}`);
          this.logger.log(`   - financial_entity_id: ${financialEntityId}`);
          this.logger.log(`   - promissory_note_number: ${loan.promissory_note_number}`);
          
          // Identificar la marca
          const marca = financialEntityId === 'f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e' ? 'STOP' : 
                       financialEntityId === '713bf1d6-9e5d-4b48-b211-7bc5ec736130' ? 'YOYO' : 
                       'UNKNOWN';
          this.logger.log(`   - Marca: ${marca}`);
        }
        else if (result.success && (result.data as any)?.loans) {
          this.logger.log(`⚠️  Múltiples préstamos encontrados: ${(result.data as any).loans.length}`);
        }
      } catch (error) {
        this.logger.error(`Error executing function ${getLoanCall.name}:`, error);
        results.set(getLoanCall.name, { success: false, error: error.message });
      }
    }
    
    // Paso 2: Ejecutar fix_loan SOLO si se encontró un ID único con su financial_entity_id
    const fixLoanCall = functionCalls.find(fc => fc.name === 'fix_loan');
    if (fixLoanCall && loanId && financialEntityId) {
      try {
        this.logger.log(`🔧 Executing function: fix_loan con datos reales del préstamo`);
        this.logger.log(`   - loan_id: ${loanId}`);
        this.logger.log(`   - financial_entity_id: ${financialEntityId}`);
        
        // Reemplazar con los datos reales del préstamo encontrado
        const fixLoanCallWithRealId: FunctionCall = {
          name: 'fix_loan',
          parameters: {
            loan_id: loanId,
            financial_entity_id: financialEntityId,
          },
          description: `Fix loan ${loanId}`,
        };
        
        const result = await this.functionCallingService.executeFunction(fixLoanCallWithRealId);
        
        this.logger.log('✅ Function fix_loan executed successfully:', result);
        
        results.set('fix_loan', result);
      } catch (error) {
        this.logger.error('❌ Error executing function fix_loan:', error);
        results.set('fix_loan', { success: false, error: error.message });
      }
    } else if (fixLoanCall && !loanId) {
      this.logger.warn('⚠️  No se ejecuta fix_loan porque no se encontró un ID único de préstamo');
      results.set('fix_loan', { 
        success: false, 
        error: 'No se encontró ID único para ejecutar fix' 
      });
    } else if (fixLoanCall && !financialEntityId) {
      this.logger.warn('⚠️  No se ejecuta fix_loan porque no se encontró financial_entity_id');
      results.set('fix_loan', { 
        success: false, 
        error: 'No se encontró financial_entity_id del préstamo' 
      });
    }
    
    // Paso 3: Ejecutar otras funciones que no sean get_loan ni fix_loan
    for (const functionCall of functionCalls) {
      if (functionCall.name !== 'get_loan_by_partial_id' && functionCall.name !== 'fix_loan') {
        try {
          this.logger.log(`Executing function: ${functionCall.name}`);
          
          const result = await this.functionCallingService.executeFunction(functionCall);
          
          this.logger.log(`Function ${functionCall.name} executed successfully:`, result);
          
          results.set(functionCall.name, result);
        } catch (error) {
          this.logger.error(`Error executing function ${functionCall.name}:`, error);
          results.set(functionCall.name, { success: false, error: error.message });
        }
      }
    }
    
    return results;
  }

  /**
   * Crea un ticket en Zendesk
   */
  private async createZendeskTicket(
    message: ProcessedMessage,
    aiResponse: AIResponse,
  ): Promise<string> {
    try {
      const ticketId = await this.zendeskService.createTicket(
        message,
        aiResponse,
      );
      this.logger.log(`Zendesk ticket created: ${ticketId}`);
      return ticketId;
    } catch (error) {
      this.logger.error('Error creating Zendesk ticket:', error);
      throw error;
    }
  }

  /**
   * Envía respuesta por WhatsApp
   */
  private async sendWhatsAppResponse(
    message: ProcessedMessage,
    aiResponse: AIResponse,
    ticketId?: string,
  ): Promise<void> {
    try {
      let responseMessage = aiResponse.message;

      // Agregar información del ticket si existe
      if (ticketId) {
        responseMessage += `\n\nNúmero de ticket: ${ticketId}`;
      }

      await this.twilioService.sendWhatsAppMessage(
        message.from,
        responseMessage,
      );

      this.logger.log(`WhatsApp response sent to ${message.from}`);
    } catch (error) {
      this.logger.error('Error sending WhatsApp response:', error);
      throw error;
    }
  }

  /**
   * Envía mensaje de error
   */
  private async sendErrorResponse(from: string): Promise<void> {
    try {
      const errorMessage =
        'Lo sentimos, ha ocurrido un error procesando tu mensaje. Por favor, intenta nuevamente más tarde.';

      await this.twilioService.sendWhatsAppMessage(from, errorMessage);

      this.logger.log(`Error response sent to ${from}`);
    } catch (error) {
      this.logger.error('Error sending error response:', error);
    }
  }

  /**
   * Ajusta la respuesta de la IA basado en los resultados de los function calls
   */
  private adjustResponseBasedOnResults(
    originalMessage: string,
    functionResults: Map<string, any>,
  ): string {
    // Verificar si get_loan_by_partial_id falló (ID no encontrado)
    const loanSearchResult = functionResults.get('get_loan_by_partial_id');
    
    if (loanSearchResult) {
      // Caso 1: ID no encontrado
      if (loanSearchResult.success === false) {
        this.logger.warn(
          '⚠️  ID de crédito no encontrado en la base de datos, ajustando respuesta',
        );
        return 'No encontré el crédito con ese ID. Verifica que el ID sea correcto y vuelve a intentar, o te conecto con Jhonatan o Jose para que revisen manualmente.';
      }
      
      // Caso 2: Múltiples coincidencias (se encontraron más de 1)
      if (loanSearchResult.loans && loanSearchResult.loans.length > 1) {
        this.logger.warn(
          `⚠️  Se encontraron ${loanSearchResult.loans.length} coincidencias, solicitando ID más específico`,
        );
        return `Se encontraron varios créditos con ese ID parcial. Por favor proporciona más dígitos del ID para identificar el crédito exacto.`;
      }
    }

    // Verificar si fix_loan falló
    const fixLoanResult = functionResults.get('fix_loan');
    if (fixLoanResult && fixLoanResult.success === false) {
      this.logger.warn('⚠️  Fix de crédito falló, ajustando respuesta');
      return 'No pude ejecutar la corrección automática. He escalado tu caso a Jhonatan o Jose para que lo revisen manualmente. Te contactarán pronto.';
    }

    // Si todo salió bien, mantener el mensaje original
    this.logger.log('✅ Function calls exitosos, manteniendo respuesta original de la IA');
    return originalMessage;
  }

  /**
   * Determina la prioridad basada en la clasificación
   */
  private determinePriority(
    classification: any,
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (
      classification.category === 'complaint' ||
      classification.tags.includes('urgent')
    ) {
      return 'urgent';
    }

    if (
      classification.category === 'support' ||
      classification.requiresHumanAgent
    ) {
      return 'high';
    }

    if (classification.category === 'sales') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Procesa webhook de estado de mensaje de Twilio
   */
  processMessageStatus(webhookData: any): void {
    try {
      this.logger.log(
        `Processing message status: ${webhookData.MessageStatus} for ${webhookData.MessageSid}`,
      );

      // Aquí podrías actualizar el estado en Zendesk o en tu base de datos
      // Por ejemplo, marcar como entregado, leído, etc.
    } catch (error) {
      this.logger.error('Error processing message status:', error);
    }
  }

  /**
   * Procesa webhook de Zendesk
   */
  async processZendeskWebhook(webhookData: ZendeskWebhookData): Promise<void> {
    try {
      this.logger.log(
        `Processing Zendesk webhook: ${webhookData.type} for ticket ${webhookData.id}`,
      );

      // Procesar mensajes entrantes de WhatsApp desde Zendesk
      if (
        webhookData.type === 'ticket_comment' &&
        webhookData.via?.channel === 'whatsapp'
      ) {
        await this.processZendeskWhatsAppMessage(webhookData);
      }
      // Procesar respuestas de agentes desde el panel web de Zendesk
      else if (
        webhookData.type === 'ticket_comment' &&
        webhookData.via?.channel === 'web'
      ) {
        await this.handleZendeskAgentResponse(webhookData);
      }
    } catch (error) {
      this.logger.error('Error processing Zendesk webhook:', error);
    }
  }

  /**
   * Procesa mensajes de WhatsApp que llegan a través de Zendesk
   */
  async processZendeskWhatsAppMessage(
    webhookData: ZendeskWebhookData,
  ): Promise<void> {
    const processingId = `zendesk-${webhookData.id}-${Date.now()}`;
    this.logger.log(
      `🔄 [${processingId}] INICIANDO PROCESAMIENTO DE MENSAJE DESDE ZENDESK`,
    );

    try {
      // Extraer información del webhook
      const ticketId =
        webhookData.ticket?.id || webhookData.ticket_id || webhookData.id;
      const messageBody = webhookData.message || webhookData.body || '';
      const via = webhookData.via as any;
      const phoneNumber = via?.source?.from?.phone || '***';
      const userName = via?.source?.from?.name || 'Usuario';

      // Validar que tengamos la información necesaria
      if (!messageBody || !ticketId) {
        this.logger.warn(
          `[${processingId}] Webhook sin mensaje o ticket ID, ignorando`,
        );
        return;
      }

      // Verificar que el mensaje sea del cliente (no del agente)
      if (webhookData.author?.role === 'agent') {
        this.logger.log(
          `[${processingId}] Mensaje de agente detectado, ignorando`,
        );
        return;
      }

      this.logger.log(`📞 [${processingId}] Procesando mensaje desde Zendesk:`);
      this.logger.log(`   - Ticket ID: ${ticketId}`);
      this.logger.log(`   - Mensaje: "${messageBody}"`);
      this.logger.log(`   - Teléfono: ${phoneNumber}`);
      this.logger.log(`   - Usuario: ${userName}`);

      // 1. Clasificar mensaje
      this.logger.log(`🏷️ [${processingId}] Paso 1: Clasificando mensaje...`);
      const classification = this.classifierService.classifyMessage({
        Body: messageBody,
        From: phoneNumber,
        To: '',
        MessageSid: ticketId,
        ProfileName: userName,
      } as any);

      this.logger.log(
        `✅ [${processingId}] Clasificación: ${classification.category} (confianza: ${(classification.confidence * 100).toFixed(1)}%)`,
      );

      // 2. Crear mensaje procesado
      this.logger.log(
        `📝 [${processingId}] Paso 2: Creando mensaje procesado...`,
      );
      const processedMessage: ProcessedMessage = {
        id: ticketId,
        from: phoneNumber,
        to: '',
        body: messageBody,
        timestamp: new Date(),
        classification: classification,
        sentiment: classification.tags?.includes('positive')
          ? 'positive'
          : classification.tags?.includes('negative')
            ? 'negative'
            : 'neutral',
        priority: this.determinePriority(classification),
        profileName: userName,
      };

      this.logger.log(
        `✅ [${processingId}] Mensaje procesado - Prioridad: ${processedMessage.priority}`,
      );

      // 3. Procesar con Gemini AI
      this.logger.log(
        `🤖 [${processingId}] Paso 3: Procesando con Gemini AI...`,
      );
      const aiResponse = await this.processWithAI(processedMessage);
      this.logger.log(
        `✅ [${processingId}] Respuesta de IA generada (${aiResponse.message.length} caracteres)`,
      );

      // 4. Ejecutar function calls si existen
      if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
        this.logger.log(
          `⚡ [${processingId}] Paso 4: Ejecutando ${aiResponse.functionCalls.length} function calls...`,
        );
        const functionResults = await this.executeFunctionCalls(
          aiResponse.functionCalls,
          processedMessage,
        );
        this.logger.log(
          `✅ [${processingId}] Function calls ejecutados exitosamente`,
        );
        
        // Ajustar respuesta si el ID de crédito no se encontró
        aiResponse.message = this.adjustResponseBasedOnResults(
          aiResponse.message,
          functionResults,
        );
      } else {
        this.logger.log(
          `⏭️ [${processingId}] Paso 4: No hay function calls para ejecutar`,
        );
      }

      // 5. Responder a través de Zendesk
      this.logger.log(
        `📱 [${processingId}] Paso 5: Enviando respuesta a través de Zendesk...`,
      );
      await this.zendeskService.respondToWhatsAppMessage(
        ticketId,
        aiResponse.message,
      );
      this.logger.log(`✅ [${processingId}] Respuesta enviada exitosamente`);

      this.logger.log(
        `🎉 [${processingId}] PROCESAMIENTO COMPLETADO EXITOSAMENTE`,
      );
    } catch (error) {
      this.logger.error(`❌ [${processingId}] ERROR EN PROCESAMIENTO:`, error);
      this.logger.error(`❌ [${processingId}] Stack trace:`, error.stack);

      // Intentar enviar mensaje de error
      try {
        const ticketId =
          webhookData.ticket?.id || webhookData.ticket_id || webhookData.id;
        await this.zendeskService.respondToWhatsAppMessage(
          ticketId,
          'Lo sentimos, ha ocurrido un error procesando tu mensaje. Un agente se pondrá en contacto contigo pronto.',
        );
      } catch (errorResponse) {
        this.logger.error(
          `❌ [${processingId}] Error enviando mensaje de error:`,
          errorResponse,
        );
      }
    }
  }

  /**
   * Maneja respuesta de agente de Zendesk
   */
  private async handleZendeskAgentResponse(
    webhookData: ZendeskWebhookData,
  ): Promise<void> {
    try {
      // Obtener información del ticket
      const ticket = await this.zendeskService.getTicketById(webhookData.id);

      if (ticket && ticket.custom_fields) {
        // Buscar el número de teléfono en los campos personalizados
        const phoneField = ticket.custom_fields.find(
          (field: any) => field.id === 'phone_number',
        );

        if (phoneField && phoneField.value) {
          // Enviar respuesta por WhatsApp
          await this.twilioService.sendWhatsAppMessage(
            String(phoneField.value),
            webhookData.body ||
              'Un agente ha respondido a tu consulta. Revisa tu ticket para más detalles.',
          );
        }
      }
    } catch (error) {
      this.logger.error('Error handling Zendesk agent response:', error);
    }
  }
}
