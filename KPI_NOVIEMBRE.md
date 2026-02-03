# KPI de Noviembre: Errores vs Créditos Administrados

## 📊 Descripción

Este endpoint genera un KPI específico para el mes de noviembre de 2025 que muestra:

- **Entidades Financieras**: Solo STOP-YOYO (filtrado por `financial_entity_id`)
- **Número de errores**: Errores de cartera detectados (170 para noviembre)
- **Número de créditos administrados**: Loans **DESEMBOLSADOS en noviembre** con status `arrear` o `active`
- **Créditos sin errores**: Créditos administrados menos los errores
- **Índice de cartera sin errores**: Porcentaje de créditos correctamente administrados
- **Desglose**: Cantidad de créditos por status (active y arrear)
- **Porcentaje administrados**: Proporción de créditos administrados sobre el total desembolsado

> **⚠️ Nota Importante**: Los créditos administrados son **SOLO los desembolsados en noviembre 2025** (usando `disbursement_date`) de las entidades **STOP** y **YOYO** que actualmente tienen status `active` o `arrear`.

## 🔗 Endpoint

```
GET /kpis/noviembre
```

## 📥 Respuesta

### Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "message": "KPI de Noviembre generado exitosamente",
  "data": {
    "mes": "Noviembre 2025",
    "periodo": {
      "inicio": "2025-11-01",
      "fin": "2025-11-30"
    },
    "entidadesFinancieras": ["STOP", "YOYO"],
    "errores": 170,
    "creditosAdministrados": 1500,
    "creditosSinErrores": 1330,
    "indiceCarteraSinErrores": 88.67,
    "totalLoans": 2000,
    "porcentajeAdministrados": 75.00,
    "desglose": {
      "active": 1200,
      "arrear": 300
    }
  },
  "timestamp": "2025-12-01T10:30:00.000Z"
}
```

### Respuesta de Error (500)

```json
{
  "success": false,
  "error": "MongoDB no disponible"
}
```

## 📊 Campos de la Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `mes` | string | Nombre del mes y año |
| `periodo.inicio` | string | Fecha de inicio del período (ISO 8601) |
| `periodo.fin` | string | Fecha de fin del período (ISO 8601) |
| `entidadesFinancieras` | string[] | Nombres de las entidades financieras filtradas (STOP, YOYO) |
| `errores` | number | Número de errores de cartera detectados |
| `creditosAdministrados` | number | Total de créditos con status `arrear` o `active` |
| `creditosSinErrores` | number | Créditos administrados sin errores (administrados - errores) |
| `indiceCarteraSinErrores` | number | Porcentaje de créditos sin errores sobre administrados |
| `totalLoans` | number | Total de préstamos desembolsados en el período |
| `porcentajeAdministrados` | number | Porcentaje de créditos administrados sobre el total |
| `desglose.active` | number | Cantidad de créditos con status `active` |
| `desglose.arrear` | number | Cantidad de créditos con status `arrear` (en mora) |

## 🧮 Fórmulas

### Flujo de Cálculo

```
┌─────────────────────────────────────────────┐
│  TODOS LOS LOANS EN LA BASE DE DATOS       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  FILTRO POR FECHA   │
         │  disbursement_date  │
         │  Nov 1 - Nov 30     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ LOANS DESEMBOLSADOS  │
         │   EN NOVIEMBRE       │
         │    (totalLoans)      │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ status =     │        │ status =     │
│ 'active'     │        │ 'arrear'     │
│              │        │              │
│ (active)     │        │ (arrear)     │
└──────┬───────┘        └──────┬───────┘
       │                       │
       └───────────┬───────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ CRÉDITOS            │
        │ ADMINISTRADOS       │
        │ (active + arrear)   │
        └─────────────────────┘
```

### Créditos Administrados
```sql
Créditos Administrados = Count(loans WHERE 
  disbursement_date >= '2025-11-01' 
  AND disbursement_date <= '2025-11-30'
  AND financial_entity_id IN [
    '713bf1d6-9e5d-4b48-b211-7bc5ec736130',  -- YOYO
    'f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e'   -- STOP
  ]
  AND status IN ['arrear', 'active']
)
```
**Filtros aplicados**: 
- Fecha de desembolso en noviembre 2025
- Solo entidades STOP y YOYO
- Status `active` o `arrear`

### Créditos Sin Errores
```
Créditos Sin Errores = Créditos Administrados - Errores
```

### Índice de Cartera Sin Errores
```
Índice = (Créditos Sin Errores / Créditos Administrados) × 100
```

### Porcentaje Administrados
```
Porcentaje = (Créditos Administrados / Total Loans Desembolsados) × 100
```

## 🎯 Uso

### Con curl

```bash
curl -X GET http://localhost:3000/kpis/noviembre
```

### Con HTTPie

```bash
http GET http://localhost:3000/kpis/noviembre
```

### Con JavaScript/Fetch

```javascript
fetch('http://localhost:3000/kpis/noviembre')
  .then(response => response.json())
  .then(data => {
    console.log('KPI Noviembre:', data);
    console.log('Errores:', data.data.errores);
    console.log('Créditos Administrados:', data.data.creditosAdministrados);
  });
```

## 📝 Notas

1. **Período**: Noviembre 2025 (2025-11-01 a 2025-11-30)
2. **Entidades**: Solo STOP-YOYO (IDs: `713bf1d6-9e5d-4b48-b211-7bc5ec736130` y `f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e`)
3. **Filtro Principal**: `disbursement_date` - Solo créditos desembolsados en noviembre
4. **Créditos Administrados**: De los desembolsados en noviembre de STOP-YOYO, cuenta los que tienen status:
   - `active`: Créditos activos al corriente
   - `arrear`: Créditos en mora
5. **Lógica de Conteo**: 
   ```
   1. Filtra loans por financial_entity_id (STOP-YOYO)
   2. Filtra por disbursement_date en rango de noviembre 2025
   3. De esos, cuenta los que tienen status 'active' o 'arrear'
   4. Excluye créditos con otros status (paid, cancelled, etc.)
   ```
6. **Errores**: Configurado en 170 errores para noviembre 2025
7. **Total Loans**: Solo cuenta los de STOP-YOYO desembolsados en noviembre
8. **Base de Datos**: Requiere conexión a MongoDB para consultar la colección `loan`

## 🔧 Personalización

Si necesitas consultar un mes diferente o parametrizar los errores, puedes crear una nueva ruta similar en el controlador:

```typescript
@Get('kpi-mes/:year/:month')
async getKPIMensual(
  @Param('year') year: string,
  @Param('month') month: string,
  @Query('errores') errores?: string
) {
  // Implementación similar
}
```

## ✅ Verificación

Para verificar que el endpoint funciona correctamente:

1. Asegúrate de que el servidor esté corriendo
2. Verifica la conexión a MongoDB
3. Ejecuta una petición GET a `/kpis/noviembre`
4. Revisa los logs del servidor para ver las consultas realizadas

## 💡 Ejemplo Práctico

Supongamos que en tu base de datos tienes:

### Escenario
```
Total de loans en BD: 50,000

Loans desembolsados en Noviembre: 18
├─ status: 'active' → 1 crédito
├─ status: 'arrear' → 5 créditos  
├─ status: 'paid' → 10 créditos
└─ status: 'cancelled' → 2 créditos
```

### Resultado del KPI
```json
{
  "errores": 170,
  "creditosAdministrados": 6,        // 1 active + 5 arrear
  "creditosSinErrores": 0,           // Negativo ajustado a 0
  "indiceCarteraSinErrores": 0.00,   // 0% (más errores que créditos)
  "totalLoans": 18,                  // Solo los de noviembre
  "porcentajeAdministrados": 33.33,  // 6/18 * 100
  "desglose": {
    "active": 1,
    "arrear": 5
  }
}
```

### Explicación
- ✅ **Incluye**: Créditos de noviembre con status `active` o `arrear` (6 total)
- ❌ **Excluye**: 
  - Créditos de noviembre con otros status (`paid`, `cancelled`, etc.)
  - Créditos de meses anteriores (aunque tengan status `active` o `arrear`)
- 📊 **Índice sin errores**: En este ejemplo hay más errores (170) que créditos (6), resultando en 0%

## 📚 Ver También

- [KPIS_MODULE.md](./KPIS_MODULE.md) - Documentación completa del módulo de KPIs
- [EJEMPLO_USO_KPIS_MENSUALES.md](./EJEMPLO_USO_KPIS_MENSUALES.md) - Ejemplos de uso de KPIs

