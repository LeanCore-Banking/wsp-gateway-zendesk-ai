# Guía de Testing - Flujo de WhatsApp para Arreglo de Crédito

## Descripción General

Esta guía te ayudará a probar el flujo completo de WhatsApp para solicitudes de arreglo de crédito usando Postman para simular mensajes de Twilio.

## Configuración Previa

### 1. Servidor Local
```bash
# Asegúrate de que el servidor esté ejecutándose
yarn start:dev
```

### 2. Variables de Entorno
Verifica que tengas configuradas las siguientes variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `MONGODB_URI`
- `ZENDESK_*` (variables de Zendesk)

### 3. Importar Colección de Postman
1. Abre Postman
2. Importa el archivo `postman-whatsapp-schema.json`
3. Configura la variable `base_url` como `http://localhost:3000`

## Flujo de Testing

### Paso 1: Solicitud Inicial de Arreglo de Crédito

**Endpoint:** `POST /webhook/twilio/whatsapp`

**Datos de ejemplo:**
```
MessageSid: SM[UUID_ALEATORIO]
AccountSid: AC[ALFANUMERICO_ALEATORIO]
From: whatsapp:+573001234567
To: whatsapp:+57300XXXXXXX
Body: "Hola, necesito ayuda para arreglar mi crédito. Tengo problemas con mi préstamo."
NumMedia: 0
ProfileName: Juan Pérez
WaId: 573001234567
SmsStatus: received
NumSegments: 1
MessageType: text
```

**Logs esperados:**
```
🔧 [webhook] WEBHOOK TWILIO WHATSAPP - Iniciando procesamiento
📋 [webhook] Datos del webhook: [datos completos]
🤖 [processor] PROCESANDO MENSAJE WHATSAPP - Iniciando
🔧 [function-calling] EJECUTANDO FUNCIÓN: request_loan_id_from_client
💬 [function-calling] SOLICITUD DE ID DE PRÉSTAMO - Iniciando flujo
```

### Paso 2: Usuario Proporciona ID de Préstamo

**Datos de ejemplo:**
```
Body: "Mi ID de préstamo es 577b35a6"
```

**Logs esperados:**
```
🔧 [function-calling] EJECUTANDO FUNCIÓN: get_loan_by_partial_id
🔍 [function-calling] BÚSQUEDA DE PRÉSTAMO - Iniciando búsqueda por ID parcial
🔍 [function-calling] ID parcial recibido: "577b35a6"
🔍 [function-calling] Ejecutando búsqueda en MongoDB...
🔍 [function-calling] Resultados encontrados: X préstamos
```

### Paso 3: Solicitud de Reestructuración

**Datos de ejemplo:**
```
Body: "He tenido dificultades para pagar. ¿Pueden ayudarme a reestructurar mi deuda?"
```

## Escenarios de Testing

### Escenario 1: Préstamo Encontrado (ID Único)
- **Input:** ID que coincide con un solo préstamo
- **Esperado:** Información del préstamo y opciones de ayuda
- **Logs:** `✅ Préstamo único encontrado - Devolviendo resultado`

### Escenario 2: Múltiples Coincidencias
- **Input:** ID parcial que coincide con varios préstamos
- **Esperado:** Lista de opciones para que el usuario especifique
- **Logs:** `⚠️ Múltiples coincidencias encontradas (X) - Solicitando más especificidad`

### Escenario 3: Préstamo No Encontrado
- **Input:** ID que no existe en la base de datos
- **Esperado:** Mensaje de error amigable
- **Logs:** `❌ No se encontraron préstamos con ID parcial: [ID]`

### Escenario 4: Mensaje con Imagen
- **Input:** Mensaje con `NumMedia: 1` y `MediaUrl0`
- **Esperado:** Procesamiento del mensaje y la imagen
- **Logs:** Información sobre el archivo multimedia

## Monitoreo de Logs

### 1. Logs del Webhook Controller
```
🔧 [webhook-TIMESTAMP] WEBHOOK TWILIO WHATSAPP - Iniciando procesamiento
📋 [webhook-TIMESTAMP] MessageSid: [SID]
📋 [webhook-TIMESTAMP] From: [NUMERO]
📋 [webhook-TIMESTAMP] Body: [MENSAJE]
⏱️ [webhook-TIMESTAMP] Tiempo de procesamiento: Xms
```

### 2. Logs del Message Processor
```
🤖 [processor-TIMESTAMP] PROCESANDO MENSAJE WHATSAPP - Iniciando
🔍 [processor-TIMESTAMP] Mensaje parseado: [DATOS]
🧠 [processor-TIMESTAMP] Clasificando mensaje con IA...
🔧 [processor-TIMESTAMP] Procesando con IA...
📧 [processor-TIMESTAMP] Creando ticket en Zendesk...
📱 [processor-TIMESTAMP] Enviando respuesta por WhatsApp...
```

### 3. Logs del Function Calling Service
```
🔧 [FUNCION-TIMESTAMP] EJECUTANDO FUNCIÓN: [NOMBRE]
🔍 [FUNCION-TIMESTAMP] Buscando definición de función...
✅ [FUNCION-TIMESTAMP] Función encontrada: [DESCRIPCION]
📋 [FUNCION-TIMESTAMP] Parámetros recibidos: [JSON]
🔍 [FUNCION-TIMESTAMP] Validando parámetros...
✅ [FUNCION-TIMESTAMP] Función ejecutada exitosamente
📤 [FUNCION-TIMESTAMP] Resultado: [JSON]
```

## Verificación de Resultados

### 1. Base de Datos MongoDB
- Verifica que se puedan buscar préstamos en la colección `middleware.loan`
- Confirma que los IDs parciales funcionen correctamente

### 2. Zendesk
- Revisa que se creen tickets cuando corresponda
- Verifica que la información del préstamo se incluya en el ticket

### 3. WhatsApp (Twilio)
- Confirma que se envíen respuestas apropiadas
- Verifica que el formato de los mensajes sea correcto

## Troubleshooting

### Error: "No se encontraron préstamos"
- Verifica la conexión a MongoDB
- Confirma que la colección `middleware.loan` existe
- Revisa que los datos de prueba estén en la base de datos

### Error: "Function not found"
- Verifica que las funciones estén registradas en `initializeFunctions()`
- Confirma que los nombres de las funciones coincidan

### Error de Twilio
- Verifica las credenciales de Twilio
- Confirma que el número de WhatsApp esté configurado

## Datos de Prueba Recomendados

### IDs de Préstamo para Testing
```
577b35a6 - ID completo de ejemplo
577b - ID parcial que debería encontrar múltiples resultados
999999 - ID que no debería existir (para probar error)
```

### Números de Teléfono
```
+573001234567 - Usuario principal de prueba
+573009876543 - Usuario secundario
+573005555555 - Usuario para casos especiales
```

## Comandos Útiles

### Ver logs en tiempo real
```bash
# En el directorio del proyecto
yarn start:dev | grep -E "(🔧|🔍|📋|✅|❌|⚠️)"
```

### Verificar conexión MongoDB
```bash
# Conectar a MongoDB y verificar colección
mongosh "mongodb://localhost:27017/tu_base_de_datos"
db.middleware.loan.find().limit(5)
```

### Reiniciar servidor
```bash
# Si necesitas reiniciar el servidor
yarn start:dev
```

## Notas Importantes

1. **Orden de Ejecución:** Ejecuta las peticiones en orden secuencial para simular una conversación real
2. **Timing:** Espera unos segundos entre peticiones para permitir el procesamiento completo
3. **Logs:** Mantén la consola del servidor visible para monitorear el flujo
4. **Variables:** Usa variables de Postman para generar IDs únicos en cada petición
5. **Persistencia:** Recuerda que cada mensaje se procesa independientemente

## Contacto y Soporte

Si encuentras problemas durante el testing:
1. Revisa los logs completos en la consola
2. Verifica la configuración de variables de entorno
3. Confirma que todos los servicios externos estén disponibles
4. Consulta la documentación de cada servicio integrado