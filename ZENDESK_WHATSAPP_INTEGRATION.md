# Integración WhatsApp con Zendesk y AI

## Descripción General

Este documento describe la integración bidireccional entre WhatsApp, Zendesk y nuestro sistema de IA para procesar mensajes automáticamente con análisis, clasificación y function-calling.

## Arquitectura

### Flujo 1: Twilio → Servidor → IA → Zendesk
```
Cliente WhatsApp
    ↓
Twilio (recibe mensaje)
    ↓ (webhook)
Nuestro Servidor
    ↓ (análisis con IA)
Gemini AI + Function Calling
    ↓ (crear ticket)
Zendesk
    ↓ (notificación)
Agente
```

### Flujo 2: Zendesk WhatsApp → Servidor → IA → Respuesta
```
Cliente WhatsApp
    ↓
Zendesk (canal WhatsApp)
    ↓ (webhook)
Nuestro Servidor
    ↓ (análisis con IA)
Gemini AI + Function Calling
    ↓ (respuesta automática)
Zendesk (comentario público)
    ↓
Cliente WhatsApp
```

## Configuración en Zendesk

### 1. Configurar el Canal de WhatsApp

1. Ve a **Admin Center** → **Channels** → **Messaging and social**
2. Configura tu canal de WhatsApp Business
3. Asegúrate de que los mensajes entrantes crean tickets automáticamente

### 2. Configurar Webhooks en Zendesk

#### Opción A: Usando Targets + Triggers

1. **Crear un Target (Webhook)**
   - Ve a **Admin Center** → **Apps and integrations** → **Targets**
   - Click en "Add target"
   - Selecciona "HTTP target"
   - Configura:
     ```
     Title: WhatsApp AI Processor
     URL: https://tu-servidor.com/webhook/zendesk/whatsapp
     Method: POST
     Content type: JSON
     ```
   - En el cuerpo del JSON:
     ```json
     {
       "id": "{{ticket.id}}",
       "type": "ticket_comment",
       "ticket_id": "{{ticket.id}}",
       "message": "{{ticket.latest_comment.value}}",
       "via": {
         "channel": "{{ticket.via}}",
         "source": {
           "from": {
             "phone": "{{ticket.requester.phone}}",
             "name": "{{ticket.requester.name}}"
           }
         }
       },
       "author": {
         "id": "{{ticket.latest_comment.author.id}}",
         "name": "{{ticket.latest_comment.author.name}}",
         "role": "{{ticket.latest_comment.author.role}}"
       },
       "ticket": {
         "id": "{{ticket.id}}",
         "subject": "{{ticket.title}}",
         "status": "{{ticket.status}}",
         "priority": "{{ticket.priority}}"
       }
     }
     ```

2. **Crear un Trigger**
   - Ve a **Admin Center** → **Objects and rules** → **Business rules** → **Triggers**
   - Click en "Add trigger"
   - Configura:
     ```
     Trigger name: Forward WhatsApp Messages to AI
     
     Conditions (ALL):
     - Ticket: Is Created
     - Ticket: Channel | Is | WhatsApp
     - Comment: Is | Public
     - Comment: Author role | Is | End-user
     
     Actions:
     - Notifications: Notify target | WhatsApp AI Processor
     ```

#### Opción B: Usando la API de Webhooks (Recomendado)

1. **Crear un Webhook usando la API de Zendesk**

   ```bash
   curl https://{subdomain}.zendesk.com/api/v2/webhooks \
     -H "Content-Type: application/json" \
     -u {email}/token:{api_token} \
     -X POST \
     -d '{
       "webhook": {
         "name": "WhatsApp AI Processor",
         "status": "active",
         "endpoint": "https://tu-servidor.com/webhook/zendesk/whatsapp",
         "http_method": "POST",
         "request_format": "json",
         "subscriptions": [
           "conditional_ticket_events"
         ]
       }
     }'
   ```

2. **Crear un Trigger para el Webhook**

   Usa la API de Zendesk para crear el trigger:
   ```bash
   curl https://{subdomain}.zendesk.com/api/v2/triggers \
     -H "Content-Type: application/json" \
     -u {email}/token:{api_token} \
     -X POST \
     -d '{
       "trigger": {
         "title": "Forward WhatsApp Messages to AI",
         "conditions": {
           "all": [
             {"field": "via_id", "operator": "is", "value": "57"}, 
             {"field": "comment_is_public", "operator": "is", "value": "true"},
             {"field": "role", "operator": "is", "value": "end_user"}
           ]
         },
         "actions": [
           {
             "field": "notification_webhook",
             "value": ["WEBHOOK_ID_AQUI", "{\\"message\\": \\"{{ticket.latest_comment.value}}\\"}"]
           }
         ]
       }
     }'
   ```

### 3. Configurar Campos Personalizados (Opcional)

Para mejor tracking y análisis, crea estos campos personalizados:

1. **whatsapp_number** (Text)
   - Para guardar el número de teléfono del cliente
   
2. **ai_classification** (Dropdown)
   - Opciones: support, sales, complaint, inquiry, general
   
3. **ai_confidence** (Number)
   - Para guardar el nivel de confianza de la clasificación

## Configuración del Servidor

### Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Credenciales de Zendesk
ZENDESK_SUBDOMAIN=tu-empresa
ZENDESK_EMAIL=tu-email@empresa.com
ZENDESK_API_TOKEN=tu-token-api

# Credenciales de Gemini AI (ya existentes)
GEMINI_API_KEY=tu-api-key

# Opcional: Para function calling con APIs externas
EXTERNAL_API_BASE_URL=https://api.tu-sistema.com
EXTERNAL_API_KEY=tu-api-key
```

### Obtener Credenciales de Zendesk

1. Ve a **Admin Center** → **Apps and integrations** → **APIs** → **Zendesk API**
2. Habilita "Token Access"
3. Click en "Add API token"
4. Copia el token generado y guárdalo en `ZENDESK_API_TOKEN`

## Endpoints Disponibles

### 1. Webhook de Twilio WhatsApp
```
POST /webhook/twilio/whatsapp
```
Recibe mensajes directamente de Twilio.

### 2. Webhook de Zendesk General
```
POST /webhook/zendesk/ticket
```
Recibe eventos de tickets de Zendesk (cualquier canal).

### 3. Webhook de Zendesk WhatsApp
```
POST /webhook/zendesk/whatsapp
```
Endpoint específico para mensajes de WhatsApp que llegan a través de Zendesk.

## Flujo de Procesamiento

### Cuando un cliente escribe por WhatsApp a Zendesk:

1. **Recepción del Webhook**
   - Zendesk envía el webhook a `/webhook/zendesk/whatsapp`
   - Se valida que el mensaje sea del cliente (no del agente)
   - Se extrae el mensaje, ticket ID y datos del cliente

2. **Clasificación del Mensaje**
   - Se usa el `ClassifierService` para categorizar el mensaje
   - Se identifican tags, prioridad y sentimiento
   - Se determina si requiere agente humano

3. **Procesamiento con IA**
   - `GeminiService` analiza el mensaje con contexto
   - Se generan respuestas personalizadas
   - Se identifican posibles function calls

4. **Ejecución de Function Calls**
   - Si la IA detecta que necesita ejecutar acciones (ej: buscar un préstamo, consultar estado, etc.)
   - Se ejecutan las funciones correspondientes
   - Los resultados se incorporan a la respuesta

5. **Respuesta al Cliente**
   - Se agrega un comentario público al ticket en Zendesk
   - Zendesk automáticamente envía el comentario al cliente por WhatsApp
   - El ticket queda documentado con todo el contexto

## Function Calling Disponible

El sistema incluye las siguientes funciones que la IA puede ejecutar automáticamente:

- **get_user_info**: Obtiene información del usuario
- **create_support_ticket**: Crea tickets de soporte adicionales
- **check_order_status**: Consulta estado de pedidos
- **schedule_appointment**: Programa citas
- **get_product_info**: Obtiene información de productos
- **fix_loan**: Corrige inconsistencias en préstamos (específico del dominio)
- **get_loan_by_partial_id**: Busca préstamos por ID parcial
- **request_loan_id_from_client**: Solicita ID de préstamo al cliente

Puedes agregar más funciones en: `src/actions/function-calling/function-calling.service.ts`

## Logs y Debugging

El sistema incluye logging detallado en cada paso:

```
🔄 [processingId] INICIANDO PROCESAMIENTO DE MENSAJE DESDE ZENDESK
📞 [processingId] Procesando mensaje desde Zendesk
🏷️ [processingId] Clasificando mensaje
🤖 [processingId] Procesando con Gemini AI
⚡ [processingId] Ejecutando function calls
📱 [processingId] Enviando respuesta a través de Zendesk
🎉 [processingId] PROCESAMIENTO COMPLETADO EXITOSAMENTE
```

Para ver los logs en desarrollo:
```bash
npm run start:dev
```

Para ver logs en producción, configura tu sistema de logging (ej: CloudWatch, Datadog, etc.)

## Testing

### Modo de Testing (Sin Credenciales de Zendesk)

El sistema puede funcionar en modo testing si no detecta credenciales de Zendesk:

```bash
# No configurar estas variables para testing
# ZENDESK_SUBDOMAIN=
# ZENDESK_EMAIL=
# ZENDESK_API_TOKEN=
```

En modo testing, se simularán las operaciones y se loggearán sin ejecutar llamadas reales.

### Probar el Endpoint

```bash
curl -X POST http://localhost:3000/webhook/zendesk/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "id": "12345",
    "type": "ticket_comment",
    "ticket_id": "12345",
    "message": "Hola, necesito ayuda con mi crédito 577b35a6",
    "via": {
      "channel": "whatsapp",
      "source": {
        "from": {
          "phone": "+573001234567",
          "name": "Juan Pérez"
        }
      }
    },
    "author": {
      "id": "67890",
      "name": "Juan Pérez",
      "role": "end_user"
    }
  }'
```

## Seguridad

### Validación de Webhooks

Para producción, se recomienda:

1. **Validar la firma del webhook de Zendesk**
   ```typescript
   // En webhook.controller.ts
   import * as crypto from 'crypto';
   
   private validateZendeskSignature(payload: string, signature: string): boolean {
     const secret = this.configService.get('ZENDESK_WEBHOOK_SECRET');
     const hash = crypto.createHmac('sha256', secret)
                       .update(payload)
                       .digest('base64');
     return hash === signature;
   }
   ```

2. **Usar HTTPS** en producción
3. **Configurar rate limiting** para prevenir abuso
4. **Whitelist de IPs** de Zendesk si es posible

## Monitoreo

### Métricas Recomendadas

- Tiempo de procesamiento de webhooks
- Tasa de éxito de function calls
- Número de mensajes procesados por hora
- Tasa de error por tipo de mensaje
- Tiempo de respuesta de la IA

### Alertas Recomendadas

- Webhooks fallidos > 5% en 5 minutos
- Tiempo de procesamiento > 10 segundos
- Errores de la API de Zendesk
- Errores de la API de Gemini

## Troubleshooting

### El webhook no se recibe

1. Verifica que la URL sea accesible públicamente
2. Verifica que el trigger en Zendesk esté activo
3. Revisa los logs de Zendesk en Admin Center → Logs → Audit log
4. Prueba el endpoint con curl manualmente

### La respuesta no llega al cliente

1. Verifica que los comentarios sean públicos (`public: true`)
2. Verifica que el ticket tenga el canal de WhatsApp configurado
3. Revisa los logs del servidor para ver si hay errores en `respondToWhatsAppMessage`

### Function calls no se ejecutan

1. Verifica que las funciones estén registradas en `FunctionCallingService`
2. Revisa los logs de Gemini para ver si está detectando la necesidad de function calls
3. Verifica que los parámetros requeridos estén presentes

## Próximos Pasos

- [ ] Implementar caché de respuestas frecuentes
- [ ] Agregar soporte para imágenes y archivos multimedia
- [ ] Implementar contexto conversacional (mantener historial)
- [ ] Agregar métricas y dashboard de monitoreo
- [ ] Implementar A/B testing de respuestas de IA
- [ ] Integrar con más sistemas externos

## Soporte

Para preguntas o problemas:
1. Revisa los logs del servidor
2. Verifica la configuración de Zendesk
3. Prueba los endpoints individualmente
4. Contacta al equipo de desarrollo


