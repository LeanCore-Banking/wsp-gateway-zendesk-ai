import { Injectable, Logger } from '@nestjs/common';
import {
  WhatsAppMessage,
  MessageClassification,
  //ProcessedMessage,
} from '../../common/interfaces/message.interface';

@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);

  classifyMessage(message: WhatsAppMessage): MessageClassification {
    try {
      const classification = this.performClassification(message.Body);

      this.logger.log(
        `Message classified: ${classification.category} (${(classification.confidence * 100).toFixed(1)}%)`,
      );
      return classification;
    } catch (error) {
      this.logger.error(`Error classifying message: ${error.message}`);
      throw error;
    }
  }

  private performClassification(messageBody: string): MessageClassification {
    // Análisis básico por palabras clave (se mejorará con Gemini AI)
    const lowerBody = messageBody.toLowerCase();

    // Palabras clave para diferentes categorías
    const keywords = {
      support: [
        'ayuda',
        'problema',
        'error',
        'no funciona',
        'soporte',
        'help',
        'issue',
        'bug',
        'crédito',
        'credito',
       'pagos',
       'pago',
       'pagar',
       'pagar crédito',
       'pagar crédito',
      ],
      sales: [
        'precio',
        'comprar',
        'vender',
        'cotización',
        'presupuesto',
        'price',
        'buy',
        'sell',
        'quote',
      ],
      complaint: [
        'queja',
        'reclamo',
        'molesto',
        'enojado',
        'mal servicio',
        'complaint',
        'angry',
        'upset',
      ],
      inquiry: [
        'información',
        'consulta',
        'pregunta',
        'info',
        'question',
        'inquiry',
        'ask',
      ],
    };

    let bestMatch = { category: 'other' as const, confidence: 0.3 };

    // Analizar las palabras clave para cada categoría 
    for (const [category, words] of Object.entries(keywords)) {
      const matches = words.filter((word) => lowerBody.includes(word)).length;
      const confidence = Math.min(0.9, 0.3 + matches * 0.2);

      if (matches > 0 && confidence > bestMatch.confidence) {
        bestMatch = { category: category as any, confidence };
      }
    }

    // Determinar si requiere agente humano
    const urgentKeywords = [
      'urgente',
      'emergencia',
      'inmediato',
      'urgent',
      'emergency',
      'immediate',
      'cliente esperando',
      'cliente esperando respuesta',
      'cliente esperando en la tienda',
    ];
    const requiresHuman =
      urgentKeywords.some((word) => lowerBody.includes(word)) ||
      (bestMatch.category as string) === 'complaint' ||
      bestMatch.confidence < 0.6;

    // Generar etiquetas
    const tags = this.generateTags(messageBody, bestMatch.category);

    // Sugerir acciones
    const suggestedActions = this.generateSuggestedActions(
      bestMatch.category,
      requiresHuman,
    );

    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      requiresHumanAgent: requiresHuman,
      tags,
      suggestedActions,
    };
  }

  private analyzeSentiment(
    messageBody: string,
  ): 'positive' | 'negative' | 'neutral' {
    const lowerBody = messageBody.toLowerCase();

    const positiveWords = [
      'gracias',
      'excelente',
      'bueno',
      'perfecto',
      'genial',
      'thanks',
      'excellent',
      'good',
      'perfect',
      'great',
    ];
    const negativeWords = [
      'malo',
      'terrible',
      'horrible',
      'odio',
      'molesto',
      'bad',
      'terrible',
      'horrible',
      'hate',
      'angry',
    ];

    const positiveCount = positiveWords.filter((word) =>
      lowerBody.includes(word),
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerBody.includes(word),
    ).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private determinePriority(
    classification: MessageClassification,
    sentiment: 'positive' | 'negative' | 'neutral',
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (classification.requiresHumanAgent && sentiment === 'negative') {
      return 'urgent';
    }

    if (classification.category === 'complaint' || sentiment === 'negative') {
      return 'high';
    }

    if (
      classification.category === 'support' ||
      classification.confidence > 0.8
    ) {
      return 'medium';
    }

    return 'low';
  }

  private generateTags(messageBody: string, category: string): string[] {
    const tags = [category];
    const lowerBody = messageBody.toLowerCase();

    // Agregar etiquetas específicas basadas en contenido
    if (lowerBody.includes('factura') || lowerBody.includes('billing'))
      tags.push('billing');
    if (lowerBody.includes('técnico') || lowerBody.includes('technical'))
      tags.push('technical');
    if (lowerBody.includes('cuenta') || lowerBody.includes('account'))
      tags.push('account');
    if (lowerBody.includes('producto') || lowerBody.includes('product'))
      tags.push('product');

    return tags;
  }

  private generateSuggestedActions(
    category: string,
    requiresHuman: boolean,
  ): string[] {
    const actions: string[] = [];

    if (requiresHuman) {
      actions.push('assign_to_agent');
    }

    switch (category) {
      case 'support':
        actions.push('check_knowledge_base', 'create_ticket');
        break;
      case 'sales':
        actions.push('send_pricing_info', 'schedule_demo');
        break;
      case 'complaint':
        actions.push('escalate_to_manager', 'create_high_priority_ticket');
        break;
      case 'inquiry':
        actions.push('provide_information', 'send_faq');
        break;
      default:
        actions.push('general_response');
    }

    return actions;
  }
}
