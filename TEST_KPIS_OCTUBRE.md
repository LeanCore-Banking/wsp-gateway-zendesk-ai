# Test de KPIs para Octubre 2025

## Descripción

Este test genera PDFs de KPIs para todas las fintechs excepto STOP-YOYO, usando un período específico: **desde el 10 de octubre de 2025 hacia atrás 30 días**.

## Período de Análisis

- **Fecha inicio**: 11 de septiembre de 2025
- **Fecha fin**: 10 de octubre de 2025 (viernes)
- **Duración**: 30 días
- **Fintechs procesadas**: Credilider, Presti, Socoda (excluye STOP-YOYO)

## Cómo Ejecutar

### 1. Ejecutar el Test
```bash
npm run test:kpis:octubre
```

### 2. Ubicación de los PDFs
Los PDFs se guardan en:
```
/pdfs-octubre-2025/
├── leanCore-kpis-credlider-octubre-2025.pdf
├── leanCore-kpis-presti-octubre-2025.pdf
└── leanCore-kpis-socoda-octubre-2025.pdf
```

## Funcionalidades del Test

### ✅ **Generación de PDFs Individuales**
- Un PDF por cada fintech
- Diseño profesional con el branding de LeanCore
- Datos específicos del período solicitado

### ✅ **Cálculos con Período Personalizado**
- **Tasa de aprobación**: Basada en leads vs users del período específico
- **Índice de cartera sin errores**: Errores ajustados proporcionalmente (30 días = ~4.3 semanas)
- **Tiempo de onboarding**: Calculado con datos del período personalizado
- **Tiempo promedio de desembolso**: 10 días (mock)
- **Efectividad de recaudo**: 120% (mock)

### ✅ **Manejo de Datos**
- Usa datos reales de MongoDB cuando está disponible
- Fallback a datos mockeados cuando MongoDB no está disponible
- Logs detallados del proceso

### ✅ **Información Detallada**
Cada PDF incluye:
- Nombre de la fintech
- Período de análisis (fechas exactas)
- 6 KPIs principales con valores calculados
- Diseño responsivo y profesional

## Ejemplo de Salida

```
🧪 Generando KPIs para octubre 2025 (todas las fintechs excepto STOP-YOYO)...

✅ Servicios inicializados correctamente
✅ Conexión a MongoDB establecida

📅 === Período de análisis ===
   - Fecha inicio: 2025-09-11
   - Fecha fin: 2025-10-10
   - Días de análisis: 30 días

📁 Directorio creado: /pdfs-octubre-2025

📊 === Procesando Credilider ===
   🔍 Generando KPIs para Credilider...
   - Tasa de aprobación: 78.45%
   - Tiempo de onboarding: 42 minutos
   - Índice cartera sin errores: 97.2%
   - Tiempo promedio desembolso: 10 días
   - Efectividad de recaudo: 120%
✅ PDF generado exitosamente para Credilider
   - Archivo: leanCore-kpis-credlider-octubre-2025.pdf
   - Ruta: /pdfs-octubre-2025/leanCore-kpis-credlider-octubre-2025.pdf
   - Tamaño: 245.67 KB

📋 === RESUMEN FINAL ===
📁 Directorio de salida: /pdfs-octubre-2025
📅 Período analizado: 2025-09-11 a 2025-10-10
🏢 Fintechs procesadas: Credilider, Presti, Socoda

✅ Credilider: leanCore-kpis-credlider-octubre-2025.pdf
✅ Presti: leanCore-kpis-presti-octubre-2025.pdf
✅ Socoda: leanCore-kpis-socoda-octubre-2025.pdf

📊 Total exitosos: 3
❌ Total fallidos: 0

🎉 ¡PDFs generados exitosamente!
📂 Revisa la carpeta: /pdfs-octubre-2025
```

## Personalización

### Cambiar el Período
Para modificar las fechas, edita estas líneas en `test-kpis-octubre.ts`:

```typescript
// Definir el período específico
const fechaFin = new Date('2025-10-10'); // Cambiar fecha fin
const fechaInicio = new Date(fechaFin);
fechaInicio.setDate(fechaInicio.getDate() - 30); // Cambiar días hacia atrás
```

### Agregar/Quitar Fintechs
Modifica esta línea en `test-kpis-octubre.ts`:

```typescript
const fintechsToProcess = ['Credilider', 'Presti', 'Socoda']; // Modificar lista
```

### Cambiar Directorio de Salida
Modifica esta línea:

```typescript
const outputDir = path.join(__dirname, 'pdfs-octubre-2025'); // Cambiar nombre
```

## Troubleshooting

### Error: MongoDB no disponible
- **Síntoma**: "⚠️ MongoDB no disponible"
- **Solución**: El test continuará con datos mockeados
- **Resultado**: PDFs se generarán con datos de prueba

### Error: No se pueden crear PDFs
- **Síntoma**: Error de Puppeteer
- **Solución**: Verificar que Puppeteer esté instalado correctamente
- **Comando**: `npm install puppeteer`

### Error: Permisos de escritura
- **Síntoma**: No se puede crear el directorio
- **Solución**: Verificar permisos de escritura en el directorio del proyecto

## Integración con el Sistema Principal

Este test utiliza los mismos métodos del servicio principal:

- `generateKPIsForFintechWithCustomPeriod()`: Método principal para períodos personalizados
- `generatePDF()`: Generación de PDFs con diseño profesional
- `calculateTasaAprobacionByEntityIdsWithPeriod()`: Cálculo de tasa de aprobación
- `calculateIndiceCarteraSinErroresByEntityIdsWithPeriod()`: Cálculo de índice de cartera
- `calculateTiempoOnboardingByEntityIdsWithPeriod()`: Cálculo de tiempo de onboarding

## Próximos Pasos

1. **Ejecutar el test**: `npm run test:kpis:octubre`
2. **Revisar los PDFs** generados en `/pdfs-octubre-2025/`
3. **Verificar los datos** calculados para cada fintech
4. **Personalizar fechas** si es necesario
5. **Integrar con sistema de emails** para envío automático

## Notas Importantes

- ✅ **STOP-YOYO excluido**: Como solicitado, no se procesa esta fintech
- ✅ **Período exacto**: 30 días hacia atrás desde el 10 de octubre de 2025
- ✅ **Datos reales**: Usa MongoDB cuando está disponible
- ✅ **Fallback mock**: Datos de prueba cuando MongoDB no está disponible
- ✅ **PDFs profesionales**: Diseño consistente con el branding LeanCore
