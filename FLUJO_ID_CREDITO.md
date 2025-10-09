# Flujo de Procesamiento de IDs de Crédito

Este documento explica cómo el sistema maneja diferentes escenarios con IDs de créditos.

## 📋 Escenarios Posibles

### ✅ Escenario 1: ID Correcto y Encontrado

**Mensaje del Cliente:**
```
"El crédito 577b35a6 tiene problemas con el pago"
```

**Flujo:**
```
1. IA detecta ID: "577b35a6"
2. Ejecuta: get_loan_by_partial_id(partial_id="577b35a6")
3. MongoDB retorna: { success: true, loan: { _id: "577b35a6-...", ... } }
4. Ejecuta: fix_loan(loan_id="577b35a6-...", financial_entity_id="...")
5. API retorna: { success: true, fixed: true }
6. Respuesta FINAL al cliente: 
   "Ejecuté la corrección del crédito. Verifica el estado nuevamente 
    y avísame si persiste el problema."
```

---

### ❌ Escenario 2: ID Incorrecto (No Encontrado en BD)

**Mensaje del Cliente:**
```
"El crédito 999xyz tiene problemas"
```

**Flujo:**
```
1. IA detecta ID: "999xyz"
2. Ejecuta: get_loan_by_partial_id(partial_id="999xyz")
3. MongoDB retorna: { success: false, message: "No se encontró", loans: [] }
4. Sistema detecta que falló ⚠️
5. Ajusta la respuesta automáticamente ✅
6. Respuesta FINAL al cliente:
   "No encontré el crédito con ese ID. Verifica que el ID sea correcto 
    y vuelve a intentar, o te conecto con Jhonatan o Jose para que 
    revisen manualmente."
```

**Logs del Sistema:**
```
⚡ Ejecutando function calls...
🔍 Búsqueda de préstamo por ID parcial: 999xyz
❌ No se encontraron préstamos con ID parcial: 999xyz
⚠️  ID de crédito no encontrado, ajustando respuesta
📱 Enviando respuesta ajustada al cliente
```

---

### ⚠️ Escenario 3: ID Parcial con Múltiples Resultados

**Mensaje del Cliente:**
```
"El crédito 577 tiene problemas"
```

**Flujo:**
```
1. IA detecta ID: "577"
2. Ejecuta: get_loan_by_partial_id(partial_id="577")
3. MongoDB retorna: { 
     success: true, 
     message: "Se encontraron 5 préstamos",
     loans: [...]
   }
4. Sistema detecta múltiples resultados
5. NO ejecuta fix_loan (necesita ID más específico)
6. Respuesta al cliente:
   "Se encontraron 5 préstamos que coinciden con '577'. 
    Por favor proporciona más dígitos para identificar el crédito exacto."
```

---

### 🔧 Escenario 4: ID Correcto pero Fix Falla

**Mensaje del Cliente:**
```
"El crédito 577b35a6 tiene problemas"
```

**Flujo:**
```
1. IA detecta ID: "577b35a6"
2. Ejecuta: get_loan_by_partial_id(partial_id="577b35a6")
3. MongoDB retorna: { success: true, loan: {...} } ✅
4. Ejecuta: fix_loan(loan_id="...", financial_entity_id="...")
5. API retorna: { success: false, error: "..." } ❌
6. Sistema detecta que el fix falló ⚠️
7. Ajusta la respuesta automáticamente ✅
8. Respuesta FINAL al cliente:
   "No pude ejecutar la corrección automática. He escalado tu caso 
    a Jhonatan o Jose para que lo revisen manualmente. Te contactarán pronto."
```

---

### 🚫 Escenario 5: Sin ID en el Mensaje

**Mensaje del Cliente:**
```
"Mi cliente hizo un pago pero no se refleja"
```

**Flujo:**
```
1. IA detecta que NO hay ID
2. NO ejecuta funciones
3. Respuesta directa al cliente:
   "Necesito el ID del crédito para ayudarte. ¿Puedes proporcionarlo?"
```

---

### 🔄 Escenario 6: Problema Persiste Después del Fix

**Mensaje del Cliente (follow-up):**
```
"Ya revisé y el crédito sigue igual, no cambió nada"
```

**Flujo:**
```
1. IA detecta keywords: "sigue igual", "no cambió"
2. Sistema activa escalamiento automático ⚡
3. NO ejecuta funciones de fix
4. Crea ticket con prioridad HIGH
5. Tags: "escalado", "requiere-agente-humano"
6. Respuesta al cliente:
   "He escalado tu caso a Jhonatan o Jose. Te contactarán en breve 
    para resolverlo."
```

---

## 🔍 Detección de Problemas

El sistema ajusta automáticamente la respuesta si detecta:

### 1. **ID No Encontrado**
```typescript
if (loanSearchResult.success === false) {
  return "No encontré el crédito con ese ID. Verifica que el ID sea correcto...";
}
```

### 2. **Fix Falló**
```typescript
if (fixLoanResult.success === false) {
  return "No pude ejecutar la corrección automática. He escalado tu caso...";
}
```

### 3. **Problema Persiste**
```typescript
const keywords = ['sigue igual', 'no cambió', 'persiste', 'todavía', ...];
if (message.includes(keyword)) {
  return "He escalado tu caso a Jhonatan o Jose...";
}
```

---

## 🎯 Ventajas del Sistema

✅ **Respuestas Honestas** - No dice que hizo algo si falló  
✅ **Escalamiento Automático** - Deriva a humanos cuando es necesario  
✅ **Transparencia** - Indica claramente qué pasó  
✅ **Sin Loops** - Evita ejecutar fix si no encontró el ID  
✅ **Usuario Informado** - Siempre sabe el estado de su solicitud  

---

## 📊 Matriz de Decisiones

| Condición | get_loan | fix_loan | Respuesta al Cliente |
|-----------|----------|----------|---------------------|
| ID encontrado + fix exitoso | ✅ | ✅ | "Ejecuté la corrección. Verifica..." |
| ID NO encontrado | ❌ | ⏭️ No ejecuta | "No encontré el crédito con ese ID..." |
| ID encontrado + fix falla | ✅ | ❌ | "No pude ejecutar la corrección. Escalado a agentes..." |
| Sin ID en mensaje | ⏭️ | ⏭️ | "Necesito el ID del crédito..." |
| Problema persiste | ⏭️ | ⏭️ | "He escalado tu caso a Jhonatan o Jose..." |
| ID múltiple | ⚠️ | ⏭️ No ejecuta | "Se encontraron X préstamos. Proporciona más dígitos..." |

---

## 🧪 Ejemplos de Respuestas Reales

### ID Incorrecto
```
Cliente: "El crédito abc123 tiene problemas"
Sistema: "No encontré el crédito con ese ID. Verifica que el ID sea 
         correcto y vuelve a intentar, o te conecto con Jhonatan o 
         Jose para que revisen manualmente."
```

### Fix Falló
```
Cliente: "El crédito 577b35a6 no refleja el pago"
Sistema: [Busca en BD ✅, Intenta fix ❌]
Sistema: "No pude ejecutar la corrección automática. He escalado tu 
         caso a Jhonatan o Jose para que lo revisen manualmente. 
         Te contactarán pronto."
```

### Todo Exitoso
```
Cliente: "El crédito 577b35a6 tiene inconsistencias"
Sistema: [Busca en BD ✅, Ejecuta fix ✅]
Sistema: "Ejecuté la corrección del crédito. Verifica el estado 
         nuevamente y avísame si persiste el problema."
```

---

## 🔐 Seguridad y Validación

El sistema valida:

1. ✅ **Formato del ID** - Solo alfanuméricos
2. ✅ **Existencia en BD** - get_loan verifica que exista
3. ✅ **Resultado del fix** - Verifica que se ejecutó correctamente
4. ✅ **Evita ejecutar fix sin ID** - Primero busca, luego corrige
5. ✅ **Escala automáticamente** - Si algo falla, deriva a humanos

---

## 💡 Mejoras Futuras

Posibles mejoras al flujo:

- [ ] Sugerencias de IDs similares si no se encuentra
- [ ] Guardar historial de correcciones por crédito
- [ ] Notificar a agentes automáticamente cuando hay escalamiento
- [ ] Métricas de éxito de correcciones automáticas
- [ ] Re-intentar fix con diferentes parámetros si falla


