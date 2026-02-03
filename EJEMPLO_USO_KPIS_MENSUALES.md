# 📊 KPIs Mensuales para STOP-YOYO

## 🎯 Funcionalidad Implementada

Ahora puedes generar KPIs para STOP-YOYO de cualquier mes específico que elijas.

## 🚀 Formas de Usar

### 1. **Via API REST (Recomendado)**

```bash
# Generar KPIs de Mayo 2025
curl -X GET "http://localhost:3000/kpis/stop-yoyo/2025/5" \
  --output "leanCore-kpis-stop-yoyo-mayo-2025.pdf"

# Generar KPIs de Junio 2025
curl -X GET "http://localhost:3000/kpis/stop-yoyo/2025/6" \
  --output "leanCore-kpis-stop-yoyo-junio-2025.pdf"

# Generar KPIs de Octubre 2025
curl -X GET "http://localhost:3000/kpis/stop-yoyo/2025/10" \
  --output "leanCore-kpis-stop-yoyo-octubre-2025.pdf"
```

### 2. **Via Script de Test**

```bash
# Ejecutar test para múltiples meses
yarn test:kpis:stop-yoyo-mes
```

Este script generará KPIs para:
- Mayo 2025
- Junio 2025
- Julio 2025
- Agosto 2025
- Septiembre 2025
- Octubre 2025

### 3. **Via Código (Programáticamente)**

```typescript
import { KpisService } from './src/kpis/kpis.service';

// Generar KPIs de Mayo 2025
const result = await kpisService.generateKPIsForStopYoyoByMonth(2025, 5);

if (result.success) {
  console.log(`PDF generado: ${result.fileName}`);
  // result.pdfBuffer contiene el PDF
  // result.data contiene los KPIs calculados
}
```

## 📅 Parámetros

- **Año**: Número entre 2020-2030
- **Mes**: Número entre 1-12
  - 1 = Enero
  - 2 = Febrero
  - 3 = Marzo
  - 4 = Abril
  - 5 = Mayo
  - 6 = Junio
  - 7 = Julio
  - 8 = Agosto
  - 9 = Septiembre
  - 10 = Octubre
  - 11 = Noviembre
  - 12 = Diciembre

## 📊 KPIs Generados

Para cada mes se generan:

1. **Tasa de Aprobación**: % de solicitudes aprobadas
2. **Tiempo de Onboarding**: Tiempo promedio en minutos
3. **Índice de Cartera Sin Errores**: % de créditos sin incidencias
4. **Efectividad de Recaudo**: % de pagos recibidos a tiempo

## 📁 Archivos Generados

Los PDFs se guardan con el formato:
```
leanCore-kpis-stop-yoyo-[mes]-[año].pdf
```

Ejemplos:
- `leanCore-kpis-stop-yoyo-mayo-2025.pdf`
- `leanCore-kpis-stop-yoyo-junio-2025.pdf`
- `leanCore-kpis-stop-yoyo-octubre-2025.pdf`

## 🔍 Logs Detallados

El sistema muestra logs claros indicando:
- ✅ **DATOS REALES**: Cuando MongoDB está disponible
- ❌ **SIN DATOS**: Cuando no hay datos reales disponibles
- 📊 **Resultados**: Conteos exactos de leads, users, loans, etc.

## 📋 Ejemplos de Uso

### Generar KPIs de Mayo 2025:
```bash
curl -X GET "http://localhost:3000/kpis/stop-yoyo/2025/5" \
  --output "kpis-mayo-2025.pdf"
```

### Generar KPIs de Diciembre 2024:
```bash
curl -X GET "http://localhost:3000/kpis/stop-yoyo/2024/12" \
  --output "kpis-diciembre-2024.pdf"
```

### Verificar endpoints disponibles:
```bash
curl -X GET "http://localhost:3000/kpis/health"
```

## ⚠️ Notas Importantes

1. **Datos Reales**: El sistema usa datos reales de MongoDB cuando está disponible
2. **Sin Datos**: Cuando no hay datos reales, retorna 0 en lugar de valores simulados
3. **Período Completo**: Cada consulta incluye todo el mes especificado (desde el día 1 hasta el último día)
4. **Validación**: El sistema valida que el año esté entre 2020-2030 y el mes entre 1-12

## 🎉 ¡Listo para Usar!

Ahora puedes generar KPIs de cualquier mes específico para STOP-YOYO de forma fácil y rápida.











