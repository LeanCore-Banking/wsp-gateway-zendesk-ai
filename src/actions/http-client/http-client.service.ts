import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HttpRequestOptions,
  HttpResponse,
  HttpMethod,
  RequestData,
  QueryParams,
} from './http-client.interfaces';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private readonly defaultTimeout: number;
  private readonly defaultRetries: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTimeout =
      this.configService.get<number>('HTTP_TIMEOUT') || 10000;
    this.defaultRetries = this.configService.get<number>('HTTP_RETRIES') || 3;
  }

  /**
   * Realiza una petición GET
   */
  async get<T = unknown>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, options);
  }

  /**
   * Realiza una petición POST
   */
  async post<T = unknown>(
    url: string,
    data?: RequestData,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('POST', url, data, options);
  }

  /**
   * Realiza una petición PUT
   */
  async put<T = unknown>(
    url: string,
    data?: RequestData,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, options);
  }

  /**
   * Realiza una petición DELETE
   */
  async delete<T = unknown>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, options);
  }

  /**
   * Realiza una petición PATCH
   */
  async patch<T = unknown>(
    url: string,
    data?: RequestData,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('PATCH', url, data, options);
  }

  /**
   * Método principal para realizar peticiones HTTP
   */
  private async makeRequest<T>(
    method: HttpMethod,
    url: string,
    data?: RequestData,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const {
      headers = {},
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
    } = options;

    this.logger.log(`Making ${method} request to: ${url}`);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const requestOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: controller.signal,
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
          if (typeof data === 'string') {
            requestOptions.body = data;
          } else if (data instanceof FormData) {
            requestOptions.body = data;
            // Remove Content-Type header for FormData to let browser set it
            if (requestOptions.headers) {
              delete requestOptions.headers['Content-Type'];
            }
          } else {
            requestOptions.body = JSON.stringify(data);
          }
        }

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        let responseData: T;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = (await response.text()) as unknown as T;
        }

        const result: HttpResponse<T> = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: this.headersToObject(response.headers),
        };

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        this.logger.log(
          `${method} request to ${url} completed successfully (${response.status})`,
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Attempt ${attempt}/${retries} failed for ${method} ${url}: ${error.message}`,
        );

        if (attempt === retries) {
          break;
        }

        // Esperar antes del siguiente intento (backoff exponencial)
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }

    this.logger.error(`All ${retries} attempts failed for ${method} ${url}`);
    throw lastError || new Error(`Request failed after ${retries} attempts`);
  }

  /**
   * Convierte Headers a objeto plano
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Función de delay para reintentos
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verifica si una URL es válida
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Construye una URL con parámetros de consulta
   */
  buildUrlWithParams(baseUrl: string, params: QueryParams): string {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }
}
