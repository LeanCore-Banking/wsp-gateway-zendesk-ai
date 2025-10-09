import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly authorizedNumbers: string[];

  constructor(private configService: ConfigService) {
    const numbers = this.configService.get<string>('AUTHORIZED_NUMBERS', '');
    this.authorizedNumbers = numbers
      .split(',')
      .map((num) => num.trim())
      .filter(Boolean);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Extraer el número de teléfono del webhook de Twilio
    const fromNumber = req.body?.From;

    if (!fromNumber) {
      this.logger.warn('No phone number found in request');
      throw new ForbiddenException('Invalid request format');
    }

    // Normalizar el número (remover espacios, guiones, etc.)
    const normalizedFrom = this.normalizePhoneNumber(fromNumber);

    // Verificar si el número está autorizado
    const isAuthorized = this.authorizedNumbers.some((authorizedNum) => {
      const normalizedAuthorized = this.normalizePhoneNumber(authorizedNum);
      return normalizedFrom === normalizedAuthorized;
    });

    if (!isAuthorized) {
      this.logger.warn(`Unauthorized number attempted access: ${fromNumber}`);
      throw new ForbiddenException('Unauthorized phone number');
    }

    this.logger.log(`Authorized access from: ${fromNumber}`);
    next();
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remover todos los caracteres no numéricos excepto el +
    return phoneNumber.replace(/[^\d+]/g, '');
  }
}

@Injectable()
export class WebhookSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WebhookSecurityMiddleware.name);
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET', '');
  }

  use(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-twilio-signature'] as string;

    if (!signature && this.webhookSecret) {
      this.logger.warn('Missing Twilio signature');
      throw new ForbiddenException('Missing webhook signature');
    }

    // Aquí puedes implementar la validación de la firma de Twilio
    // usando la librería crypto para verificar la autenticidad del webhook

    next();
  }
}
