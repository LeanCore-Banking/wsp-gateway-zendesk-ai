# 📊 KPI STOP-YOYO - Rango de Fechas Personalizado

## Descripción

Este endpoint permite generar KPIs para las entidades financieras STOP y YOYO en un **rango de fechas personalizado** especificado por el usuario.

## Endpoint

```
GET /kpis/stop-yoyo/custom
```

## Parámetros Query

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `fechaInicio` | string | **Sí** | Fecha de inicio del período (formato YYYY-MM-DD) | `2025-12-20` |
| `fechaFin` | string | **Sí** | Fecha de fin del período (formato YYYY-MM-DD) | `2025-12-29` |
| `erroresCartera` | number | No | Número de errores de cartera reportados (opcional) | `48` |

## Validaciones

- Las fechas deben estar en formato `YYYY-MM-DD`
- `fechaInicio` debe ser anterior a `fechaFin`
- Si no se especifica `erroresCartera`, se usa un valor por defecto según la entidad

## Ejemplo de Uso

### Solicitud

```bash
GET http://localhost:3000/kpis/stop-yoyo/custom?fechaInicio=2025-12-20&fechaFin=2025-12-29&erroresCartera=48
```

### Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "message": "KPIs generados exitosamente para STOP-YOYO - 2025-12-20 a 2025-12-29",
  "data": {
    "tasaAprobacion": 83.45,
    "tiempoOnboarding": 8,
    "indiceCarteraSinErrores": 99.80,
    "efectividadRecaudo": 120,
    "fechaGeneracion": "2025-12-29T18:30:00.000Z",
    "periodo": {
      "inicio": "2025-12-20T00:00:00.000Z",
      "fin": "2025-12-29T23:59:59.999Z"
    },
    "financialEntity": "STOP-YOYO"
  },
  "summary": {
    "totalLeads": 2156,
    "totalUsers": 9450,
    "totalSolicitudes": 11606,
    "totalLoans": 22750,
    "erroresCartera": 48,
    "formulas": {
      "tasaAprobacion": "(Total Users / Total Solicitudes) × 100",
      "indiceCarteraSinErrores": "((Total Loans - Errores Cartera) / Total Loans) × 100",
      "tiempoOnboarding": "Promedio de (disbursement_date - created_at) en minutos"
    }
  },
  "fileName": "leanCore-kpis-stop-yoyo-2025-12-20_2025-12-29.pdf",
  "filePath": "/absolute/path/to/pdfs-kpis/leanCore-kpis-stop-yoyo-2025-12-20_2025-12-29.pdf",
  "periodo": {
    "inicio": "2025-12-20",
    "fin": "2025-12-29"
  }
}
```

## Casos de Error

### Error 400: Parámetros Faltantes

```json
{
  "success": false,
  "error": "Se requieren los parámetros fechaInicio y fechaFin (formato YYYY-MM-DD)",
  "ejemplo": "/kpis/stop-yoyo/custom?fechaInicio=2025-12-20&fechaFin=2025-12-29&erroresCartera=50"
}
```

### Error 400: Formato de Fecha Inválido

```json
{
  "success": false,
  "error": "Las fechas deben estar en formato YYYY-MM-DD",
  "ejemplo": "fechaInicio=2025-12-20&fechaFin=2025-12-29"
}
```

### Error 400: Fecha Inválida

```json
{
  "success": false,
  "error": "Las fechas proporcionadas no son válidas. Use formato YYYY-MM-DD"
}
```

### Error 400: Rango de Fechas Inválido

```json
{
  "success": false,
  "error": "La fecha de inicio debe ser anterior a la fecha de fin"
}
```

## Métricas Calculadas

### 1. **Tasa de Aprobación**
```
(Total Users / Total Solicitudes) × 100
```
Porcentaje de solicitudes que fueron aprobadas y se convirtieron en usuarios.

### 2. **Tiempo de Onboarding**
```
Promedio de (disbursement_date - created_at) en minutos
```
Tiempo promedio que tarda un usuario desde su creación hasta el desembolso del préstamo.

### 3. **Índice de Cartera Sin Errores**
```
((Total Loans - Errores Cartera) / Total Loans) × 100
```
Porcentaje de préstamos que no tuvieron errores.

### 4. **Efectividad de Recaudo**
Valor fijo configurado en 120%.

## Archivo PDF Generado

El endpoint genera automáticamente un archivo PDF con los KPIs calculados:

- **Ubicación**: `pdfs-kpis/`
- **Nombre**: `leanCore-kpis-stop-yoyo-YYYY-MM-DD_YYYY-MM-DD.pdf`
- **Contenido**: Reporte visual con todas las métricas y gráficos

## Ejemplos de Uso

### Ejemplo 1: 10 días (20-29 de diciembre)
```bash
curl "http://localhost:3000/kpis/stop-yoyo/custom?fechaInicio=2025-12-20&fechaFin=2025-12-29&erroresCartera=48"
```

### Ejemplo 2: 1 día (25 de diciembre)
```bash
curl "http://localhost:3000/kpis/stop-yoyo/custom?fechaInicio=2025-12-25&fechaFin=2025-12-25&erroresCartera=5"
```

### Ejemplo 3: 1 mes completo (diciembre)
```bash
curl "http://localhost:3000/kpis/stop-yoyo/custom?fechaInicio=2025-12-01&fechaFin=2025-12-31&erroresCartera=180"
```

### Ejemplo 4: 3 meses (octubre - diciembre)
```bash
curl "http://localhost:3000/kpis/stop-yoyo/custom?fechaInicio=2025-10-01&fechaFin=2025-12-31&erroresCartera=500"
```

## Filtros Aplicados

El endpoint filtra automáticamente por las entidades financieras:

- **STOP**: `f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e`
- **YOYO**: `713bf1d6-9e5d-4b48-b211-7bc5ec736130`

## Colecciones de MongoDB Consultadas

- `lead`: Para solicitudes rechazadas
- `user`: Para usuarios aprobados y tiempo de onboarding
- `loan`: Para préstamos desembolsados

## Zona Horaria

- Todas las fechas se manejan en **UTC** para evitar inconsistencias
- `fechaInicio` se establece a las `00:00:00.000Z`
- `fechaFin` se establece a las `23:59:59.999Z`

## Testing

Puedes ejecutar el script de prueba:

```bash
npx ts-node test-kpis-custom-range.ts
```

Este script ejecutará:
1. Test principal: 20-29 de diciembre 2025
2. Test de 1 día: 25 de diciembre
3. Test de validación: fecha inválida

## Notas Importantes

⚠️ **Rendimiento**: Para rangos de fechas muy grandes (varios meses o años), el cálculo puede tardar más tiempo debido a:
- Consultas a múltiples colecciones
- Cálculo de promedios de onboarding
- Generación del archivo PDF

⚠️ **Datos Históricos**: El endpoint solo puede calcular KPIs para fechas donde existan datos en la base de datos.

✅ **Consistencia**: El endpoint usa las mismas fórmulas y lógica que los endpoints semanales y mensuales, garantizando consistencia en los cálculos.

## Endpoints Relacionados

- `GET /kpis/stop-yoyo/weekly` - KPIs de los últimos 7 días
- `GET /kpis/stop-yoyo/:year/:month` - KPIs de un mes específico
- `GET /kpis/health` - Health check del módulo de KPIs




