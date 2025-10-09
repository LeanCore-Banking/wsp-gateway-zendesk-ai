# Ejecutar Tests Específicos de Zendesk

## 🎯 Ejecutar Solo Tests Básicos (Sin WhatsApp)

### Opción 1: Script de Prueba Manual

El script `test-zendesk-basic.ts` prueba solo las funcionalidades que **NO requieren** tener el canal de WhatsApp configurado:

```bash
npx ts-node test-zendesk-basic.ts
```

**Lo que prueba:**
- ✅ Crear tickets
- ✅ Agregar comentarios públicos
- ✅ Agregar comentarios privados (notas internas)
- ✅ Obtener información de tickets
- ✅ Actualizar estado de tickets

**NO prueba:**
- ❌ Responder vía WhatsApp (requiere canal configurado)
- ❌ Enviar mensajes a clientes

---

### Opción 2: Tests Unitarios Específicos

Puedes ejecutar solo grupos específicos de tests usando `describe.only` o `it.only`:

#### Ejecutar solo tests de creación y comentarios:

```bash
# Ejecutar todos los tests excepto el grupo de WhatsApp
npm test -- zendesk.service.spec.ts -t "createTicket|addCommentToTicket|getTicketById|updateTicketStatus"
```

#### Ejecutar solo un grupo específico:

```bash
# Solo tests de creación
npm test -- zendesk.service.spec.ts -t "createTicket"

# Solo tests de comentarios
npm test -- zendesk.service.spec.ts -t "addCommentToTicket"

# Solo tests de obtención
npm test -- zendesk.service.spec.ts -t "getTicketById"

# Solo tests de actualización
npm test -- zendesk.service.spec.ts -t "updateTicketStatus"
```

---

## 🔧 Modificar Tests Temporalmente

También puedes modificar temporalmente el archivo de tests para ejecutar solo lo que necesitas:

### Opción A: Usar `describe.only`

En `src/integration/zendesk/zendesk.service.spec.ts`:

```typescript
// Cambiar esto:
describe('createTicket', () => {

// Por esto:
describe.only('createTicket', () => {  // ← Agrega .only
```

Esto ejecutará SOLO ese grupo de tests.

### Opción B: Comentar tests

Comenta temporalmente los tests que no quieres ejecutar:

```typescript
/*
describe('respondToWhatsAppMessage', () => {
  // ... tests que requieren WhatsApp
});
*/
```

### Opción C: Usar `skip`

```typescript
describe.skip('respondToWhatsAppMessage', () => {
  // Estos tests se saltarán
});
```

---

## 📋 Comparación de Opciones

| Opción | Ventajas | Desventajas | Usa credenciales reales |
|--------|----------|-------------|------------------------|
| `test-zendesk-basic.ts` | ✅ Prueba real end-to-end<br>✅ Fácil de ejecutar<br>✅ Output claro | ❌ Requiere credenciales | Sí |
| Tests unitarios con `-t` | ✅ Rápido<br>✅ No requiere credenciales<br>✅ Usa mocks | ❌ No prueba API real | No (usa mocks) |
| Tests con `.only` | ✅ Control preciso<br>✅ Fácil de modificar | ❌ Debes recordar revertir cambios | No (usa mocks) |

---

## 🚀 Ejemplo Completo

### Paso 1: Configurar `.env`

```bash
ZENDESK_SUBDOMAIN=tu-empresa
ZENDESK_EMAIL=tu-email@empresa.com
ZENDESK_API_TOKEN=tu-token-api
```

### Paso 2: Ejecutar pruebas básicas

```bash
npx ts-node test-zendesk-basic.ts
```

### Paso 3: Ver el output

```
🧪 PRUEBAS BÁSICAS DE ZENDESK (Sin canal WhatsApp)
═══════════════════════════════════════════════════════════

📋 Verificando credenciales...
   Subdomain: mi-empresa
   Email: admin@mi-empresa.com
   API Token: ✅ Configurado

✅ Credenciales configuradas correctamente
   URL de Zendesk: https://mi-empresa.zendesk.com

═══════════════════════════════════════════════════════════

📝 TEST 1: Crear Ticket
────────────────────────────────────────────────────────────
   📤 Creando ticket...
   ✅ Ticket creado exitosamente!
   🎫 Ticket ID: 12345
   🔗 URL: https://mi-empresa.zendesk.com/agent/tickets/12345

💬 TEST 2: Agregar Comentario Público
────────────────────────────────────────────────────────────
   💬 Agregando comentario público al ticket 12345...
   ✅ Comentario público agregado exitosamente

🔒 TEST 3: Agregar Comentario Privado (Nota Interna)
────────────────────────────────────────────────────────────
   🔒 Agregando comentario privado al ticket 12345...
   ✅ Comentario privado agregado exitosamente

🔍 TEST 4: Obtener Información del Ticket
────────────────────────────────────────────────────────────
   📥 Obteniendo información del ticket 12345...
   ✅ Información obtenida exitosamente:
      🎫 ID: 12345
      📝 Subject: [WhatsApp SUPPORT] LOW - Test User
      📊 Status: pending
      ⚡ Priority: low
      🏷️  Tags: test, automated, no-whatsapp

🔄 TEST 5: Actualizar Estado del Ticket
────────────────────────────────────────────────────────────
   ⏸️  Actualizando ticket 12345 a "pending"...
   ✅ Estado actualizado a "pending"
   ✅ Actualizando ticket 12345 a "solved"...
   ✅ Estado actualizado a "solved"

═══════════════════════════════════════════════════════════
✅ TODAS LAS PRUEBAS BÁSICAS COMPLETADAS EXITOSAMENTE
═══════════════════════════════════════════════════════════

📊 Resumen de Operaciones:
   ✅ Ticket creado: 12345
   ✅ Comentarios agregados: 2 (1 público, 1 privado)
   ✅ Información obtenida correctamente
   ✅ Estados actualizados: pending → solved

🔗 Verifica el ticket en Zendesk:
   https://mi-empresa.zendesk.com/agent/tickets/12345

✨ La integración básica con Zendesk está funcionando correctamente

💡 Próximos pasos:
   1. Verifica el ticket en tu dashboard de Zendesk
   2. Revisa los comentarios (público y privado)
   3. Una vez configures el canal de WhatsApp, prueba el flujo completo
```

### Paso 4: Verificar en Zendesk

1. Abre el link que aparece en el output
2. Verifica que el ticket se haya creado
3. Verifica que tenga 2 comentarios (1 público, 1 privado)
4. Verifica que el estado sea "solved"

---

## ⚠️ Notas Importantes

### Sin Canal de WhatsApp

Hasta que configures el canal de WhatsApp en Zendesk, **NO ejecutes:**

- ❌ `respondToWhatsAppMessage()` con tickets que no sean de WhatsApp
- ❌ El script `test-zendesk-manual.ts` (completo)
- ❌ Tests del webhook `/webhook/zendesk/whatsapp`

### Con Credenciales de Prueba

Si estás en un ambiente de testing/staging:
- ✅ Usa el script básico
- ✅ Verifica que los tickets se creen correctamente
- ✅ Prueba agregar comentarios
- ✅ Prueba cambiar estados

---

## 🐛 Troubleshooting

### Error: "Invalid credentials"

```bash
# Verifica que las variables estén bien configuradas
echo $ZENDESK_SUBDOMAIN
echo $ZENDESK_EMAIL
echo $ZENDESK_API_TOKEN
```

### Error: "Permission denied"

El API token necesita estos permisos:
- ✅ Read tickets
- ✅ Write tickets
- ✅ Create tickets

### El ticket se crea pero no aparece

Espera unos segundos y refresca el dashboard de Zendesk.

---

## ✅ Checklist Pre-Testing

Antes de ejecutar las pruebas:

- [ ] Variables de entorno configuradas en `.env`
- [ ] Subdomain correcto (sin .zendesk.com)
- [ ] Email correcto (el que creó el token)
- [ ] API Token con permisos adecuados
- [ ] Conexión a internet estable
- [ ] Zendesk accesible (no en mantenimiento)

---

## 📚 Scripts Disponibles

```bash
# Pruebas básicas (sin WhatsApp)
npx ts-node test-zendesk-basic.ts

# Pruebas completas (requiere WhatsApp configurado)
npx ts-node test-zendesk-manual.ts

# Tests unitarios específicos
npm test -- zendesk.service.spec.ts -t "createTicket"

# Tests unitarios todos
npm test -- zendesk.service.spec.ts

# Tests del webhook
./test-zendesk-webhook.sh 1
```


