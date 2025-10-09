# Testing del Flujo de IA con Function Calling

Esta guía explica cómo probar el flujo completo de procesamiento de mensajes con IA, incluyendo detección de IDs de crédito, consultas a MongoDB y ejecución de fix de créditos.

## 🚀 Comandos Rápidos

```bash
# Probar el flujo completo de IA con function calling
yarn test:ai

# Probar solo la integración con Zendesk (sin WhatsApp)
yarn test:zendesk:basic

# Verificar configuración de Zendesk
yarn verify:zendesk

# Probar todo el flujo con Zendesk (requiere WhatsApp configurado)
yarn test:zendesk:full
```

## 🧪 Test del Flujo de IA (`yarn test:ai`)

Este test prueba el procesamiento completo con Gemini AI y function calling.

### Escenarios de Prueba

#### 📝 Test 1: Mensaje con ID de Crédito Completo

**Input:**
```
"Hola, tengo un problema con el crédito 577b35a6. 
El cliente hizo un pago hace 3 días pero no se refleja en las cuotas."
```

**Esperado:**
- ✅ La IA detecta el ID: `577b35a6`
- ✅ Ejecuta `get_loan_by_partial_id(partial_id="577b35a6")`
- ✅ Ejecuta `fix_loan(loan_id="...", financial_entity_id="...")`
- ✅ Responde: "Ejecuté la corrección del crédito. Verifica el estado nuevamente y avísame si persiste el problema."

**Flujo:**
```
Mensaje → Gemini AI → Detecta ID → Busca en MongoDB → Ejecuta Fix → Responde
```

---

#### 📝 Test 2: Mensaje sin ID de Crédito

**Input:**
```
"El sistema no está reflejando el pago de mi cliente. ¿Qué hago?"
```

**Esperado:**
- ✅ La IA detecta que falta información
- ✅ NO ejecuta function calls
- ✅ Responde: "Necesito el ID del crédito para ayudarte. ¿Puedes proporcionarlo?"

**Flujo:**
```
Mensaje → Gemini AI → Falta ID → Solicita ID → Responde
```

---

#### 📝 Test 3: Cliente Reporta que el Problema Persiste

**Input:**
```
"Ya revisé y el crédito sigue igual, no cambió nada"
```

**Esperado:**
- ✅ La IA detecta keywords: "sigue igual", "no cambió"
- ✅ Escala automáticamente a agentes humanos
- ✅ Responde: "He escalado tu caso a Jhonatan o Jose. Te contactarán en breve para resolverlo."
- ✅ Crea ticket con prioridad HIGH
- ✅ Agrega tags: `escalado`, `requiere-agente-humano`

**Flujo:**
```
Mensaje → Gemini AI → Detecta persistencia → Escala → Crea ticket HIGH → Notifica agentes
```

---

#### 📝 Test 4: Mensaje con ID Parcial de Crédito

**Input:**
```
"El crédito 577b no está mostrando bien las cuotas"
```

**Esperado:**
- ✅ La IA detecta el ID parcial: `577b`
- ✅ Ejecuta `get_loan_by_partial_id(partial_id="577b")`
- ✅ Si encuentra múltiples resultados, solicita más especificidad
- ✅ Si encuentra uno solo, ejecuta el fix

**Flujo:**
```
Mensaje → Gemini AI → Detecta ID parcial → Busca en MongoDB → 
  Si 1 resultado → Fix
  Si múltiples → Solicita más dígitos
```

---

## 🔍 Qué se Prueba

### 1. Procesamiento con Gemini AI
- ✅ Clasificación del mensaje
- ✅ Generación de respuestas cortas (2-4 líneas)
- ✅ Detección de IDs de crédito en el texto
- ✅ Identificación de problemas (pagos, cuotas, errores)

### 2. Function Calling
- ✅ `get_loan_by_partial_id` - Buscar préstamos en MongoDB
- ✅ `fix_loan` - Ejecutar corrección de créditos
- ✅ Validación de parámetros
- ✅ Manejo de errores

### 3. Lógica de Escalamiento
- ✅ Detección de palabras clave ("sigue igual", "no cambió", etc.)
- ✅ Escalamiento automático a Jhonatan o Jose
- ✅ Creación de ticket con prioridad alta
- ✅ Tags apropiados (`escalado`, `requiere-agente-humano`)

### 4. Generación de Respuestas
- ✅ Respuestas cortas y directas (máx 2-4 líneas)
- ✅ Sin saludos largos ni despedidas formales
- ✅ Técnicas pero comprensibles
- ✅ Contexto apropiado (SaaS de créditos)

---

## 📋 Requisitos Previos

### Variables de Entorno Necesarias

```bash
# Gemini AI (REQUERIDO)
GEMINI_API_KEY=tu-api-key

# MongoDB (REQUERIDO para get_loan_by_partial_id)
MONGODB_URI=mongodb://localhost:27017/tu-base-datos

# Zendesk (Opcional para este test)
ZENDESK_SUBDOMAIN=tu-empresa
ZENDESK_EMAIL=tu-email@empresa.com
ZENDESK_API_TOKEN=tu-token-api

# API Externa (Opcional para fix_loan)
# Si no está configurada, el fix_loan mostrará un error controlado
```

### MongoDB Configurado

Para que `get_loan_by_partial_id` funcione, necesitas:
- MongoDB corriendo
- Base de datos con colección de préstamos
- Conexión configurada en `MONGODB_URI`

Si no tienes MongoDB, el test mostrará un error controlado en ese paso, pero seguirá con los demás tests.

---

## 🎯 Ejecutar los Tests

### Test Completo de IA

```bash
yarn test:ai
```

**Output esperado:**

```
🧪 PRUEBAS DE FLUJO DE IA CON FUNCTION CALLING
════════════════════════════════════════════════════════════════════════════════

✅ Servicios inicializados correctamente

📝 TEST 1: Mensaje con problema de crédito (ID incluido)
────────────────────────────────────────────────────────────────────────────────
   📨 Mensaje: "Hola, tengo un problema con el crédito 577b35a6..."
   👤 Cliente: Juan Pérez
   📊 Clasificación: support
   ⚡ Prioridad: high

   🤖 Procesando con Gemini AI...

   ✅ Respuesta de la IA:
   💬 "Ejecuté la corrección del crédito. Verifica el estado nuevamente y avísame si persiste el problema."

   ⚡ Function Calls detectados: 2

   🔧 Función: get_loan_by_partial_id
   📋 Parámetros: { "partial_id": "577b35a6" }
   ⏳ Ejecutando función...
   ✅ Función ejecutada exitosamente
   📊 Resultado: {
     "success": true,
     "loan": { "_id": "577b35a6-...", "user_nit": "123456789" }
   }

   🔧 Función: fix_loan
   📋 Parámetros: { 
     "loan_id": "577b35a6-...",
     "financial_entity_id": "713bf1d6-..."
   }
   ⏳ Ejecutando función...
   ✅ Función ejecutada exitosamente
   📊 Resultado: { "success": true, "fixed": true }

   🎫 Crear ticket: SÍ
   ⚡ Prioridad del ticket: high
   🏷️  Tags: support, negative, loan, payment, urgent, fix-ejecutado

═══════════════════════════════════════════════════════════════════════════════
✅ PRUEBAS COMPLETADAS
═══════════════════════════════════════════════════════════════════════════════
```

---

## 🔧 Tests de Zendesk

### Test Básico (Sin WhatsApp)

```bash
yarn test:zendesk:basic
```

Prueba:
- ✅ Crear tickets
- ✅ Agregar comentarios
- ✅ Obtener información
- ✅ Actualizar estados

### Verificar Configuración

```bash
yarn verify:zendesk
```

Verifica:
- ✅ Credenciales correctas
- ✅ Conectividad con API
- ✅ Permisos del token
- ✅ URLs utilizadas

---

## 🐛 Troubleshooting

### Error: "GEMINI_API_KEY is required"

**Solución:** Configura tu API key de Gemini en `.env`

```bash
GEMINI_API_KEY=tu-api-key-aqui
```

### Error: "Cannot connect to MongoDB"

**Opciones:**

1. **Configurar MongoDB local:**
   ```bash
   # Instalar MongoDB
   brew install mongodb-community
   
   # Iniciar MongoDB
   brew services start mongodb-community
   
   # Configurar en .env
   MONGODB_URI=mongodb://localhost:27017/tu-base-datos
   ```

2. **Usar MongoDB en la nube:**
   ```bash
   # MongoDB Atlas
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
   ```

3. **Ejecutar sin MongoDB:**
   - Los tests seguirán funcionando
   - Los function calls de MongoDB mostrarán error controlado
   - Los demás tests continuarán

### La IA no detecta los IDs de crédito

**Causa:** El modelo puede variar según la respuesta de Gemini

**Solución:**
- Verifica que el prompt esté claro
- Revisa los logs de Gemini para ver qué está entendiendo
- Ajusta el prompt si es necesario

### Function calls no se ejecutan

**Verificar:**
1. Que el formato del prompt incluya las funciones disponibles
2. Que la respuesta de Gemini incluya `FUNCTION_CALL:`
3. Que los parámetros sean válidos

---

## 📊 Interpretando los Resultados

### Respuestas Correctas de la IA

✅ **Con ID de crédito:**
```
"Ejecuté la corrección del crédito. Verifica el estado nuevamente y avísame si persiste el problema."
```

✅ **Sin ID de crédito:**
```
"Necesito el ID del crédito para ayudarte. ¿Puedes proporcionarlo?"
```

✅ **Problema persiste:**
```
"He escalado tu caso a Jhonatan o Jose. Te contactarán en breve para resolverlo."
```

### Function Calls Esperados

✅ **Para mensaje con ID:**
```json
[
  {
    "name": "get_loan_by_partial_id",
    "parameters": { "partial_id": "577b35a6" }
  },
  {
    "name": "fix_loan",
    "parameters": {
      "loan_id": "577b35a6-full-uuid",
      "financial_entity_id": "713bf1d6-..."
    }
  }
]
```

---

## 💡 Tips para Mejores Resultados

1. **Usa mensajes realistas** en los tests
2. **Incluye contexto** (ej: "mi cliente", "el pago", "hace 3 días")
3. **Prueba edge cases** (IDs parciales, IDs incorrectos, etc.)
4. **Verifica los logs** para entender el comportamiento de la IA
5. **Ajusta el prompt** si las respuestas no son las esperadas

---

## 📚 Documentación Relacionada

- [Integración WhatsApp con Zendesk](./ZENDESK_WHATSAPP_INTEGRATION.md)
- [Testing de Zendesk](./TESTING_ZENDESK.md)
- [Tests Específicos](./run-specific-tests.md)

