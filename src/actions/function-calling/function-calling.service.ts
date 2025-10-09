import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FunctionCall } from '../../common/interfaces/message.interface';
import { HttpClientService } from '../http-client/http-client.service';
import { MongoClientService } from '../../database/services/mongo-client.service';
import type {
  FunctionParameters,
  FunctionArguments,
  FunctionExecutionResult,
  AIFunctionDefinition,
} from './function-calling.interfaces';

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParameters;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiresAuth?: boolean;
}

@Injectable()
export class FunctionCallingService {
  private readonly logger = new Logger(FunctionCallingService.name);
  private readonly availableFunctions: Map<string, FunctionDefinition> =
    new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClientService: HttpClientService,
    private readonly mongoClientService: MongoClientService,
  ) {
    this.initializeFunctions();
  }

  private initializeFunctions(): void {
    // Definir funciones disponibles para la IA
    const functions: FunctionDefinition[] = [
      {
        name: 'get_user_info',
        description: 'Obtiene información del usuario desde el sistema externo',
        parameters: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'Número de teléfono del usuario',
            },
          },
          required: ['phone_number'],
        },
        endpoint: '/api/users/info',
        method: 'GET',
        requiresAuth: true,
      },
      {
        name: 'create_support_ticket',
        description: 'Crea un ticket de soporte en el sistema externo',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Título del ticket',
            },
            description: {
              type: 'string',
              description: 'Descripción detallada del problema',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Prioridad del ticket',
            },
            category: {
              type: 'string',
              description: 'Categoría del ticket',
            },
          },
          required: ['title', 'description'],
        },
        endpoint: '/api/tickets',
        method: 'POST',
        requiresAuth: true,
      },
      {
        name: 'check_order_status',
        description: 'Consulta el estado de un pedido',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'ID del pedido a consultar',
            },
          },
          required: ['order_id'],
        },
        endpoint: '/api/orders/status',
        method: 'GET',
        requiresAuth: true,
      },
      {
        name: 'schedule_appointment',
        description: 'Programa una cita o reunión',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Fecha de la cita (YYYY-MM-DD)',
            },
            time: {
              type: 'string',
              format: 'time',
              description: 'Hora de la cita (HH:MM)',
            },
            service_type: {
              type: 'string',
              description: 'Tipo de servicio solicitado',
            },
            notes: {
              type: 'string',
              description: 'Notas adicionales',
            },
          },
          required: ['date', 'time', 'service_type'],
        },
        endpoint: '/api/appointments',
        method: 'POST',
        requiresAuth: true,
      },
      {
        name: 'get_product_info',
        description: 'Obtiene información detallada de un producto',
        parameters: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'ID del producto',
            },
            sku: {
              type: 'string',
              description: 'SKU del producto',
            },
          },
          required: [],
        },
        endpoint: '/api/products/info',
        method: 'GET',
        requiresAuth: false,
      },
      {
        name: 'fix_loan',
        description:
          'Corrige inconsistencias en créditos cuando algún pago no se ha aplicado a las cuotas o algún valor de las cuotas tiene inconsistencias',
        parameters: {
          type: 'object',
          properties: {
            loan_id: {
              type: 'string',
              description: 'ID del préstamo que necesita ser corregido',
            },
            financial_entity_id: {
              type: 'string',
              description:
                'ID de la entidad financiera (YOYO: 713bf1d6-9e5d-4b48-b211-7bc5ec736130, STOP: f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e)',
              enum: [
                '713bf1d6-9e5d-4b48-b211-7bc5ec736130',
                'f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e',
              ],
            },
          },
          required: ['loan_id', 'financial_entity_id'],
        },
        endpoint: 'https://api.fintech-middleware.leancore.co:5002/fix-loan',
        method: 'POST',
        requiresAuth: false,
      },
      {
        name: 'get_loan_by_partial_id',
        description:
          'Busca un préstamo en la base de datos MongoDB usando un ID parcial (ej: 577b35a6) para obtener el ID completo del préstamo',
        parameters: {
          type: 'object',
          properties: {
            partial_id: {
              type: 'string',
              description:
                'ID parcial del préstamo proporcionado por el cliente (ej: 577b35a6)',
            },
          },
          required: ['partial_id'],
        },
        requiresAuth: false,
      },
      {
        name: 'request_loan_id_from_client',
        description:
          'Solicita al cliente que proporcione el ID del préstamo cuando reporta problemas con pagos o créditos pero no incluye el ID',
        parameters: {
          type: 'object',
          properties: {
            client_message: {
              type: 'string',
              description:
                'Mensaje del cliente describiendo el problema con el crédito',
            },
          },
          required: ['client_message'],
        },
        requiresAuth: false,
      },
    ];

    functions.forEach((func) => {
      this.availableFunctions.set(func.name, func);
    });

    this.logger.log(`Initialized ${functions.length} functions for AI calling`);
  }

  /**
   * Obtiene todas las funciones disponibles para la IA
   */
  getAvailableFunctions(): FunctionDefinition[] {
    return Array.from(this.availableFunctions.values());
  }

  /**
   * Obtiene una función específica por nombre
   */
  getFunction(name: string): FunctionDefinition | undefined {
    return this.availableFunctions.get(name);
  }

  /**
   * Ejecuta una función llamada por la IA
   */
  async executeFunction(
    functionCall: FunctionCall,
  ): Promise<FunctionExecutionResult> {
    const executionId = `${functionCall.name}-${Date.now()}`;
    this.logger.log(
      `🔧 [${executionId}] EJECUTANDO FUNCIÓN: ${functionCall.name}`,
    );

    try {
      this.logger.log(`🔍 [${executionId}] Buscando definición de función...`);

      const functionDef = this.availableFunctions.get(functionCall.name);
      if (!functionDef) {
        throw new Error(`Function ${functionCall.name} not found`);
      }

      this.logger.log(
        `✅ [${executionId}] Función encontrada: ${functionDef.description}`,
      );
      this.logger.log(
        `📋 [${executionId}] Parámetros recibidos:`,
        JSON.stringify(functionCall.parameters, null, 2),
      );

      // Validar parámetros requeridos
      this.logger.log(`🔍 [${executionId}] Validando parámetros...`);
      this.validateParameters(functionCall.parameters, functionDef);
      this.logger.log(`✅ [${executionId}] Parámetros válidos`);

      let result: unknown;

      // Manejar funciones especiales
      if (functionCall.name === 'request_loan_id_from_client') {
        this.logger.log(
          `💬 [${executionId}] Ejecutando función especial: Solicitar ID de préstamo`,
        );
        result = await this.handleRequestLoanIdFromClient(
          functionCall.parameters,
        );
      } else if (functionCall.name === 'get_loan_by_partial_id') {
        this.logger.log(
          `🔍 [${executionId}] Ejecutando función especial: Buscar préstamo por ID parcial`,
        );
        this.logger.log(
          `🔍 [${executionId}] ID parcial a buscar: ${functionCall.parameters.partial_id}`,
        );
        result = await this.handleGetLoanByPartialId(functionCall.parameters);
      } else {
        // Ejecutar la función externa
        this.logger.log(
          `🌐 [${executionId}] Ejecutando función externa: ${functionCall.name}`,
        );
        this.logger.log(
          `🌐 [${executionId}] Endpoint: ${functionDef.method} ${functionDef.endpoint}`,
        );
        result = await this.callExternalFunction(
          functionDef,
          functionCall.parameters,
        );
      }

      this.logger.log(`✅ [${executionId}] Función ejecutada exitosamente`);
      this.logger.log(
        `📤 [${executionId}] Resultado:`,
        JSON.stringify(result, null, 2),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `❌ [${executionId}] Error ejecutando función ${functionCall.name}:`,
        error,
      );
      this.logger.error(`❌ [${executionId}] Stack trace:`, error.stack);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Valida los parámetros de la función
   */
  private validateParameters(
    args: FunctionArguments,
    functionDef: FunctionDefinition,
  ): void {
    const required = functionDef.parameters.required || [];

    for (const param of required) {
      if (
        !(param in args) ||
        args[param] === undefined ||
        args[param] === null
      ) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }

  /**
   * Llama a la función externa
   */
  private async callExternalFunction(
    functionDef: FunctionDefinition,
    args: FunctionArguments,
  ): Promise<unknown> {
    // Manejar funciones especiales que no requieren endpoint
    if (functionDef.name === 'request_loan_id_from_client') {
      return this.handleRequestLoanIdFromClient(args);
    }

    if (functionDef.name === 'get_loan_by_partial_id') {
      return this.handleGetLoanByPartialId(args);
    }

    if (!functionDef.endpoint) {
      throw new Error(`No endpoint defined for function ${functionDef.name}`);
    }

    // Determinar si el endpoint es una URL completa o relativa
    let url: string;
    if (
      functionDef.endpoint.startsWith('http://') ||
      functionDef.endpoint.startsWith('https://')
    ) {
      // URL completa
      url = functionDef.endpoint;
    } else {
      // Endpoint relativo, usar base URL
      const baseUrl =
        this.configService.get<string>('EXTERNAL_API_BASE_URL') ||
        'http://localhost:3001';
      url = `${baseUrl}${functionDef.endpoint}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Agregar autenticación si es requerida
    if (functionDef.requiresAuth) {
      const apiKey = this.configService.get<string>('EXTERNAL_API_KEY');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    let response;
    switch (functionDef.method) {
      case 'GET': {
        // Para GET, agregar parámetros como query string
        const stringArgs: Record<string, string> = {};
        Object.entries(args).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            stringArgs[key] = String(value);
          }
        });
        const queryParams = new URLSearchParams(stringArgs).toString();
        const getUrl = queryParams ? `${url}?${queryParams}` : url;
        response = await this.httpClientService.get(getUrl, { headers });
        break;
      }

      case 'POST': {
        response = await this.httpClientService.post(url, args, { headers });
        break;
      }

      case 'PUT': {
        response = await this.httpClientService.put(url, args, { headers });
        break;
      }

      case 'DELETE': {
        response = await this.httpClientService.delete(url, { headers });
        break;
      }

      default:
        throw new Error(`Unsupported HTTP method: ${functionDef.method}`);
    }

    return response;
  }

  /**
   * Maneja la función especial para solicitar ID de préstamo al cliente
   */
  private handleRequestLoanIdFromClient(
    args: FunctionArguments,
  ): Promise<unknown> {
    this.logger.log(
      '💬 SOLICITUD DE ID DE PRÉSTAMO - Iniciando flujo de solicitud',
    );
    this.logger.log('💬 Parámetros recibidos:', JSON.stringify(args, null, 2));

    const message =
      args.message ||
      'Por favor, proporciona el ID de tu préstamo (ejemplo: 577b35a6) para poder ayudarte mejor.';

    const response = {
      success: true,
      message,
      action: 'request_loan_id',
    };

    this.logger.log(
      '💬 Respuesta generada:',
      JSON.stringify(response, null, 2),
    );
    this.logger.log('💬 SOLICITUD DE ID DE PRÉSTAMO - Flujo completado');

    return Promise.resolve(response);
  }

  /**
   * Maneja la búsqueda de préstamo por ID parcial en MongoDB
   */
  private async handleGetLoanByPartialId(
    args: FunctionArguments,
  ): Promise<unknown> {
    const partialId = args.partial_id as string;

    this.logger.log(
      '🔍 BÚSQUEDA DE PRÉSTAMO - Iniciando búsqueda por ID parcial',
    );
    this.logger.log(`🔍 ID parcial recibido: "${partialId}"`);
    this.logger.log('🔍 Parámetros completos:', JSON.stringify(args, null, 2));

    if (!partialId) {
      this.logger.error('❌ Error: partial_id parameter is required');
      throw new Error('partial_id parameter is required');
    }

    try {
      this.logger.log('🔍 Ejecutando búsqueda en MongoDB...');
      // Buscar directamente en MongoDB usando el MongoClientService
      const loans =
        await this.mongoClientService.findLoansByPartialId(partialId);

      this.logger.log(`🔍 Resultados encontrados: ${loans.length} préstamos`);

      if (loans.length > 0) {
        this.logger.log(
          '🔍 Préstamos encontrados:',
          JSON.stringify(
            loans.map((loan) => ({
              id: (loan as any)._id,
              user_nit: (loan as any).user_nit,
              promissory_note_number: (loan as any).promissory_note_number,
            })),
            null,
            2,
          ),
        );
      }

      if (loans.length === 0) {
        this.logger.log(
          `❌ No se encontraron préstamos con ID parcial: ${partialId}`,
        );
        return {
          success: false,
          message: `No se encontraron préstamos con el ID parcial: ${partialId}`,
          loans: [],
        };
      }

      if (loans.length === 1) {
        this.logger.log('✅ Préstamo único encontrado - Devolviendo resultado');
        return {
          success: true,
          message: 'Préstamo encontrado',
          loan: loans[0],
        };
      }

      // Si hay múltiples coincidencias, devolver la lista para que el usuario elija
      this.logger.log(
        `⚠️ Múltiples coincidencias encontradas (${loans.length}) - Solicitando más especificidad`,
      );
      return {
        success: true,
        message: `Se encontraron ${loans.length} préstamos que coinciden con "${partialId}". Por favor, proporciona más dígitos para una búsqueda más específica.`,
        loans: loans.map((loan) => ({
          id: (loan as any)._id,
          user_nit: (loan as any).user_nit,
          promissory_note_number: (loan as any).promissory_note_number,
        })),
      };
    } catch (error) {
      this.logger.error('❌ Error searching loans by partial ID:', error);
      this.logger.error('❌ Stack trace:', error.stack);
      return {
        success: false,
        error:
          'No se pudo encontrar el préstamo con el ID parcial proporcionado',
        partial_id: args.partial_id,
      };
    }
  }

  /**
   * Obtiene las definiciones de funciones en formato para Gemini AI
   */
  getFunctionDefinitionsForAI(): AIFunctionDefinition[] {
    return this.getAvailableFunctions().map((func) => ({
      name: func.name,
      description: func.description,
      parameters: func.parameters,
    }));
  }
}
