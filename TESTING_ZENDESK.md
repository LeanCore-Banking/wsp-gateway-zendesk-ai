# Guía de Testing para Zendesk

Esta guía explica cómo probar la integración con Zendesk de diferentes maneras.

## 📋 Tabla de Contenidos

- [Tests Unitarios](#tests-unitarios)
- [Tests Manuales](#tests-manuales)
- [Modo Testing (Sin Credenciales)](#modo-testing-sin-credenciales)
- [Tests de Integración con Webhooks](#tests-de-integración-con-webhooks)

---

## 🧪 Tests Unitarios

Los tests unitarios verifican cada método del `ZendeskService` de forma aislada usando mocks.

### Ejecutar Tests Unitarios

```bash
# Ejecutar solo los tests de Zendesk
npm test -- zendesk.service.spec.ts

# Ejecutar con coverage
npm test -- --coverage zendesk.service.spec.ts

# Ejecutar en modo watch (desarrollo)
npm test -- --watch zendesk.service.spec.ts
```

### Tests Incluidos

Los tests unitarios cubren:

✅ **Creación de Tickets**
- Crear ticket exitosamente
- Manejo de errores en creación

✅ **Respuestas de WhatsApp**
- Enviar respuesta vía comentario público
- Manejo de errores en respuestas

✅ **Comentarios**
- Agregar comentarios públicos
- Agregar comentarios privados

✅ **Obtención de Tickets**
- Obtener ticket por ID
- Buscar tickets por número de teléfono

✅ **Actualización de Estado**
- Actualizar a diferentes estados (solved, pending, etc.)

✅ **Modo Testing**
- Funcionamiento sin credenciales reales

---

## 🔧 Tests Manuales

Para probar con credenciales reales de Zendesk, usa el script de prueba manual.

### Configuración

1. **Configura tus credenciales en `.env`:**

```bash
ZENDESK_SUBDOMAIN=tu-empresa
ZENDESK_EMAIL=tu-email@empresa.com
ZENDESK_API_TOKEN=tu-token-api
```

2. **Instala dependencias adicionales si es necesario:**

```bash
npm install --save-dev ts-node
```

### Ejecutar Tests Manuales

```bash
npx ts-node test-zendesk-manual.ts
```

### Lo que hace el script:

1. ✅ Verifica credenciales
2. ✅ Crea un ticket de prueba
3. ✅ Agrega comentarios al ticket
4. ✅ Envía respuesta como WhatsApp
5. ✅ Obtiene información del ticket
6. ✅ Actualiza el estado del ticket
7. ✅ Busca tickets por teléfono

### Ejemplo de Output:

```
🧪 INICIANDO PRUEBAS MANUALES DE ZENDESK
═══════════════════════════════════════════════════════════

📋 Verificando credenciales...
   Subdomain: mi-empresa
   Email: admin@mi-empresa.com
   API Token: ✅ Configurado

═══════════════════════════════════════════════════════════

📝 TEST 1: Crear Ticket de Prueba
────────────────────────────────────────────────────────────
   Creando ticket...
   ✅ Ticket creado exitosamente: 12345

💬 TEST 2: Agregar Comentario al Ticket
────────────────────────────────────────────────────────────
   Agregando comentario al ticket 12345...
   ✅ Comentario agregado exitosamente

📱 TEST 3: Responder vía WhatsApp
────────────────────────────────────────────────────────────
   Respondiendo al ticket 12345...
   ✅ Respuesta enviada exitosamente

🔍 TEST 4: Obtener Información del Ticket
────────────────────────────────────────────────────────────
   Obteniendo ticket 12345...
   ✅ Ticket obtenido exitosamente:
      - ID: 12345
      - Subject: [WhatsApp SUPPORT] LOW - Test User
      - Status: open
      - Priority: low
      - Tags: whatsapp, test, automated, ai

🔄 TEST 5: Actualizar Estado del Ticket
────────────────────────────────────────────────────────────
   Marcando ticket 12345 como resuelto...
   ✅ Estado actualizado a "solved"

🔎 TEST 6: Buscar Tickets por Teléfono
────────────────────────────────────────────────────────────
   Buscando tickets para +573001234567...
   ✅ Encontrados 5 tickets

═══════════════════════════════════════════════════════════
✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE
═══════════════════════════════════════════════════════════

📊 Resumen:
   - Ticket de prueba creado: 12345
   - Comentarios agregados: 2
   - Estado final: solved
   - Tickets encontrados por teléfono: 5

✨ La integración con Zendesk está funcionando correctamente
```

---

## 🎭 Modo Testing (Sin Credenciales)

El sistema puede funcionar en **modo testing** sin necesidad de credenciales reales. Esto es útil para:

- Desarrollo local sin cuenta de Zendesk
- Tests de CI/CD
- Demos y presentaciones

### Activar Modo Testing

Simplemente **no configures** (o comenta) las variables de Zendesk en `.env`:

```bash
# ZENDESK_SUBDOMAIN=
# ZENDESK_EMAIL=
# ZENDESK_API_TOKEN=
```

### Comportamiento en Modo Testing

Cuando el servicio detecta que no hay credenciales:

```typescript
if (!this.zendeskClient) {
  this.logger.log('[TESTING MODE] Would create Zendesk ticket...');
  return 'TEST_TICKET_12345';
}
```

**Logs típicos:**
```
[WARN] Zendesk credentials not found. Service will run in testing mode.
[TESTING MODE] Would create Zendesk ticket for whatsapp:+573001234567
[TESTING MODE] Would add comment to ticket 12345: Hola...
[TESTING MODE] Would respond to WhatsApp via ticket 12345: Respuesta...
```

---

## 🌐 Tests de Integración con Webhooks

Prueba el flujo completo de webhook → procesamiento → respuesta.

### 1. Probar Webhook Local

```bash
# Iniciar servidor
npm run start:dev

# En otra terminal, enviar webhook de prueba
./test-zendesk-webhook.sh 1

# O con curl
curl -X POST http://localhost:3000/webhook/zendesk/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "id": "12345",
    "type": "ticket_comment",
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
      "role": "end_user"
    }
  }'
```

### 2. Verificar Logs del Servidor

Deberías ver algo como:

```
=== INICIO WEBHOOK ZENDESK WHATSAPP ===
📱 Mensaje WhatsApp desde Zendesk recibido
   - Ticket ID: 12345
   - From: +573001234567
   - Message: "Hola, necesito ayuda..."

🚀 Iniciando procesamiento con MessageProcessor...
🔄 [zendesk-12345-123456789] INICIANDO PROCESAMIENTO DE MENSAJE DESDE ZENDESK
🏷️ [zendesk-12345-123456789] Paso 1: Clasificando mensaje
✅ [zendesk-12345-123456789] Clasificación: support (confianza: 85.0%)
🤖 [zendesk-12345-123456789] Paso 3: Procesando con Gemini AI
✅ [zendesk-12345-123456789] Respuesta de IA generada (150 caracteres)
⚡ [zendesk-12345-123456789] Paso 4: Ejecutando 1 function calls
📱 [zendesk-12345-123456789] Paso 5: Enviando respuesta a través de Zendesk
✅ [zendesk-12345-123456789] Respuesta enviada exitosamente
🎉 [zendesk-12345-123456789] PROCESAMIENTO COMPLETADO EXITOSAMENTE

✅ Webhook de Zendesk WhatsApp procesado exitosamente en 2500ms
=== FIN WEBHOOK ZENDESK WHATSAPP ===
```

### 3. Verificar en Zendesk

1. Ve a tu cuenta de Zendesk
2. Busca el ticket con ID `12345`
3. Verifica que tenga el comentario de respuesta de la IA
4. Verifica los tags y clasificación

---

## 🐛 Troubleshooting

### Error: "API Error"

**Causa:** Credenciales incorrectas o token sin permisos

**Solución:**
1. Verifica que el subdomain, email y token sean correctos
2. Regenera el API token en Zendesk
3. Verifica que el token tenga permisos de lectura/escritura de tickets

### Error: "Cannot find module"

**Causa:** Dependencias no instaladas

**Solución:**
```bash
npm install
```

### Tests fallan con "Timeout"

**Causa:** Zendesk API lenta o problemas de red

**Solución:**
```bash
# Aumentar timeout en jest.config.js
module.exports = {
  testTimeout: 30000, // 30 segundos
};
```

### Modo Testing no se activa

**Causa:** Variables de entorno todavía configuradas

**Solución:**
```bash
# Verificar que las variables NO estén configuradas
echo $ZENDESK_SUBDOMAIN  # Debería estar vacío
```

---

## 📊 Cobertura de Tests

Para generar reporte de cobertura:

```bash
# Generar reporte de cobertura
npm test -- --coverage

# Ver reporte en navegador
open coverage/lcov-report/index.html
```

---

## ✅ Checklist de Testing

Antes de desplegar a producción:

- [ ] Tests unitarios pasan al 100%
- [ ] Tests manuales con credenciales reales exitosos
- [ ] Webhook local responde correctamente
- [ ] Tickets se crean en Zendesk correctamente
- [ ] Respuestas llegan al cliente por WhatsApp
- [ ] Function calling se ejecuta correctamente
- [ ] Logs son claros y útiles
- [ ] Manejo de errores funciona correctamente
- [ ] Modo testing funciona sin credenciales

---

## 📚 Recursos Adicionales

- [Documentación de Zendesk API](https://developer.zendesk.com/api-reference/)
- [Guía de Integración WhatsApp](./ZENDESK_WHATSAPP_INTEGRATION.md)
- [Tests del Webhook Controller](./src/integration/webhook/webhook.controller.spec.ts)
- [Tests del Zendesk Service](./src/integration/zendesk/zendesk.service.spec.ts)


