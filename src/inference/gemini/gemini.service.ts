import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ProcessedMessage,
  AIResponse,
  FunctionCall,
} from '../../common/interfaces/message.interface';
import { GeminiModel, AvailableFunction } from './gemini.interfaces';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GeminiModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    // Intentar con el nombre completo del modelo incluyendo "models/"
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash', // Modelo con prefijo completo
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
  }

  async processMessage(message: ProcessedMessage): Promise<AIResponse> {
    try {
      const prompt = this.buildPrompt(message);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parsear la respuesta para extraer función calls si existen
      const aiResponse = this.parseAIResponse(text, message);

      this.logger.log(`AI response generated for message ${message.id}`);
      return aiResponse;
    } catch (error) {
      this.logger.error(
        `Error processing message with Gemini: ${error.message}`,
      );
      throw error;
    }
  }

  async processWithFunctionCalling(
    message: ProcessedMessage,
  ): Promise<AIResponse> {
    try {
      const functions = this.getAvailableFunctions();
      const prompt = this.buildFunctionCallingPrompt(message, functions);

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const aiResponse = this.parseAIResponse(text, message);

      this.logger.log(
        `AI response with function calling generated for message ${message.id}`,
      );
      return aiResponse;
    } catch (error) {
      this.logger.error(
        `Error processing message with function calling: ${error.message}`,
      );
      throw error;
    }
  }

  private buildPrompt(message: ProcessedMessage): string {
    return `
Eres un asistente de IA de soporte técnico para un SaaS de administración de créditos (STOP/YOYO).

CONTEXTO DEL NEGOCIO:
- Nuestros clientes son tiendas que usan nuestro sistema para administrar créditos
- Los mensajes son reportes de problemas con créditos de sus clientes finales
- Ejemplos: pagos no reflejados, inconsistencias en cuotas, errores en el sistema

INFORMACIÓN DEL MENSAJE:
- Número de teléfono: ${message.from}
- Nombre del contacto: ${message.profileName || 'No disponible'}
- Mensaje: "${message.body}"
- Clasificación: ${message.classification.category}
- Sentimiento: ${message.sentiment}
- Prioridad: ${message.priority}
- Requiere agente humano: ${message.classification.requiresHumanAgent ? 'Sí' : 'No'}

INSTRUCCIONES:
1. Responde de forma CORTA y DIRECTA (máximo 2-3 líneas)
2. Si el mensaje requiere un agente humano, indica que Jhonatan o Jose lo atenderán
3. Si detectas que el cliente reporta que algo "sigue igual" o "no cambió", escala a agentes humanos
4. Sé técnico pero comprensible
5. No uses saludos largos ni despedidas formales

FORMATO DE RESPUESTA:
Responde SOLO con el mensaje que se enviará al usuario por WhatsApp. Máximo 2-3 líneas.

EJEMPLOS DE RESPUESTAS CORRECTAS:
- "He escalado tu caso a Jhonatan o Jose. Te contactarán en breve para resolverlo."
- "Necesito el ID del crédito para ayudarte. ¿Puedes proporcionarlo?"
- "Entendido. Verificando tu caso ahora mismo."
    `.trim();
  }

  private buildFunctionCallingPrompt(
    message: ProcessedMessage,
    functions: AvailableFunction[],
  ): string {
    const functionsDescription = functions
      .map((f) => `- ${f.name}: ${f.description}`)
      .join('\n');

    return `Eres soporte técnico para un SaaS de créditos (STOP/YOYO). Los clientes son tiendas que reportan problemas con créditos de sus clientes finales.

MENSAJE DEL CLIENTE:
"${message.body}"

FUNCIONES DISPONIBLES:
${functionsDescription}

ANALIZA Y RESPONDE:

1. Si el mensaje menciona un ID de crédito (como "577b35a6" o "577b"):
   - Ejecuta: get_loan_by_partial_id(partial_id="577b35a6")
   - Ejecuta: fix_loan(loan_id="id_completo", financial_entity_id="713bf1d6-9e5d-4b48-b211-7bc5ec736130")
   - Responde: "Ejecuté la corrección del crédito. Verifica el estado nuevamente y avísame si persiste el problema."

2. Si NO menciona ID pero reporta problema:
   - NO ejecutes funciones
   - Responde: "Necesito el ID del crédito para ayudarte. ¿Puedes proporcionarlo?"

3. Si dice "sigue igual", "no cambió", "persiste":
   - NO ejecutes funciones
   - Responde: "He escalado tu caso a Jhonatan o Jose. Te contactarán en breve para resolverlo."

FORMATO DE RESPUESTA REQUERIDO:
FUNCTION_CALL: funcion(param="valor")
RESPONSE: mensaje corto (max 2-4 líneas)

O solo:
RESPONSE: mensaje corto (max 2-4 líneas)

Responde ahora:`.trim();
  }

  private parseAIResponse(text: string, message: ProcessedMessage): AIResponse {
    const functionCalls: FunctionCall[] = [];
    let responseMessage = text;
    let shouldCreateTicket = false;
    let ticketPriority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
    let ticketTags: string[] = [];

    // Buscar function calls en la respuesta
    const functionCallRegex = /FUNCTION_CALL:\s*(\w+)\((.*?)\)/g;
    let match;

    while ((match = functionCallRegex.exec(text)) !== null) {
      const functionName = match[1];
      const parametersString = match[2];

      // Parsear parámetros
      const parameters: Record<string, any> = {};
      const paramRegex = /(\w+)="([^"]+)"/g;
      let paramMatch;

      while ((paramMatch = paramRegex.exec(parametersString)) !== null) {
        parameters[paramMatch[1]] = paramMatch[2];
      }

      functionCalls.push({
        name: functionName,
        parameters,
        description: `Execute ${functionName} with parameters: ${JSON.stringify(parameters)}`,
      });
    }

    // Extraer solo la respuesta del usuario
    const responseMatch = text.match(/RESPONSE:\s*(.+)/s);
    if (responseMatch) {
      responseMessage = responseMatch[1].trim();
    }

    // Detectar si el cliente indica que el problema persiste
    const persistsProblemKeywords = [
      'sigue igual',
      'no cambió',
      'no cambio',
      'persiste',
      'continua',
      'continúa',
      'aún',
      'aun',
      'todavía',
      'todavia',
      'mismo error',
      'mismo problema',
      'no se solucionó',
      'no se soluciono',
    ];
    
    const messageBodyLower = message.body.toLowerCase();
    const problemPersists = persistsProblemKeywords.some(keyword => 
      messageBodyLower.includes(keyword)
    );

    // Si el problema persiste o la respuesta menciona escalamiento, siempre crear ticket y requerir agente
    const needsEscalation = problemPersists || 
      responseMessage.toLowerCase().includes('jhonatan') ||
      responseMessage.toLowerCase().includes('jose') ||
      responseMessage.toLowerCase().includes('escalado');

    // Determinar si se debe crear un ticket
    shouldCreateTicket =
      needsEscalation ||
      message.classification.requiresHumanAgent ||
      message.priority === 'high' ||
      message.priority === 'urgent' ||
      functionCalls.length > 0;

    // Si necesita escalamiento, aumentar prioridad
    if (needsEscalation) {
      ticketPriority = 'high';
      ticketTags.push('escalado', 'requiere-agente-humano');
    } else {
      // Mapear prioridad del mensaje a prioridad del ticket
      switch (message.priority) {
        case 'urgent':
          ticketPriority = 'urgent';
          break;
        case 'high':
          ticketPriority = 'high';
          break;
        case 'medium':
          ticketPriority = 'normal';
          break;
        default:
          ticketPriority = 'low';
      }
    }

    // Generar tags para el ticket
    ticketTags = [
      ...ticketTags,
      message.classification.category,
      message.sentiment,
      ...message.classification.tags,
    ];

    // Si hay function calls de fix_loan, agregar tag específico
    if (functionCalls.some(fc => fc.name === 'fix_loan')) {
      ticketTags.push('fix-ejecutado');
    }

    return {
      message: responseMessage,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      shouldCreateTicket,
      ticketPriority,
      ticketTags,
      requiresHumanAgent: needsEscalation || message.classification.requiresHumanAgent,
    };
  }

  private getAvailableFunctions(): AvailableFunction[] {
    return [
      {
        name: 'get_user_info',
        description: 'Obtener información del usuario desde sistemas externos',
        parameters: ['user_id', 'phone_number'],
      },
      {
        name: 'check_order_status',
        description: 'Verificar el estado de un pedido',
        parameters: ['order_id'],
      },
      {
        name: 'get_account_balance',
        description: 'Consultar el saldo de la cuenta del usuario',
        parameters: ['account_id'],
      },
      {
        name: 'schedule_appointment',
        description: 'Programar una cita o reunión',
        parameters: ['date', 'time', 'service_type'],
      },
      {
        name: 'send_invoice',
        description: 'Enviar una factura al usuario',
        parameters: ['invoice_id', 'email'],
      },
      {
        name: 'update_user_profile',
        description: 'Actualizar información del perfil del usuario',
        parameters: ['field', 'value'],
      },
    ];
  }
}
