# 📊 Módulo de KPIs de Soporte

Este módulo genera reportes semanales de KPIs de soporte con datos reales de la base de datos y genera PDFs con diseño profesional.

## 🎯 Características

### KPIs Implementados

1. **Tasa de Aprobación** (77%)
   - **Cálculo**: Porcentaje de solicitudes aprobadas sobre el total recibidas
   - **Consulta**: Cuenta `leads` vs `users` por `financial_entity_id` en MongoDB (últimos 7 días)
   - **Colecciones**: `middleware.lead` y `middleware.user`
   - **Filtro**: Solo registros con `created_at >= hace 7 días`

2. **Tiempo de Onboarding** (50 minutos)
   - **Mock**: Datos hardcodeados como solicitado
   - **Descripción**: Tiempo promedio desde registro hasta verificación y firma digital

3. **Tiempo Promedio de Desembolso** (10 días)
   - **Mock**: Datos hardcodeados como solicitado
   - **Descripción**: Tiempo promedio desde aprobación hasta entrega del crédito

4. **Índice de Cartera Sin Errores** (1577)
   - **Mock**: Datos hardcodeados como solicitado
   - **Descripción**: Créditos correctamente administrados sin incidencias operativas

5. **Efectividad de Recaudo** (120%)
   - **Mock**: Datos hardcodeados como solicitado
   - **Descripción**: Porcentaje de pagos recibidos sobre total de cuotas generadas

## 🕐 Cronjob Semanal

```typescript
@Cron('0 9 * * 1')  // Todos los lunes a las 9:00 AM
async generateWeeklyKPIs()
```

**Configuración del cronjob:**
- **Frecuencia**: Semanal (lunes)
- **Hora**: 9:00 AM
- **Acción**: Genera KPIs y PDF automáticamente
- **Logs**: Registra el proceso completo

## 🔗 Endpoints Disponibles

### 1. Generar y Descargar PDF
```http
GET /kpis/generate-pdf
```
- **Descripción**: Genera KPIs y descarga PDF
- **Respuesta**: Archivo PDF para descarga
- **Headers**: `Content-Type: application/pdf`

### 2. Obtener Datos de KPIs
```http
GET /kpis/data
```
- **Descripción**: Retorna solo los datos JSON de KPIs
- **Respuesta**: JSON con todos los KPIs calculados

### 3. Forzar Generación
```http
GET /kpis/force-generate
```
- **Descripción**: Ejecuta manualmente el cronjob de KPIs
- **Uso**: Para testing o generación inmediata

### 4. Health Check
```http
GET /kpis/health
```
- **Descripción**: Verifica que el módulo esté funcionando
- **Respuesta**: Estado del módulo y endpoints disponibles

## 📊 Consultas a MongoDB

### Entidades Financieras Soportadas

1. **STOP**: `f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e`
2. **YOYO**: `713bf1d6-9e5d-4b48-b211-7bc5ec736130`

### Consultas por Entidad

```javascript
// Fecha de hace 7 días
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

// Contar leads (últimos 7 días)
db.lead.countDocuments({
  financial_entity_id: "f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e",
  created_at: { $gte: sevenDaysAgo.toISOString() }
})

// Contar users (últimos 7 días)
db.user.countDocuments({
  financial_entity_id: "f0f6b280-b6f8-4b2c-ba3c-0ead0c15590e",
  created_at: { $gte: sevenDaysAgo.toISOString() }
})

// Calcular tasa de aprobación
tasaAprobacion = (totalUsers / totalLeads) * 100
```

## 📄 Generación de PDF

### Características del PDF

- **Formato**: A4
- **Diseño**: Similar a la imagen proporcionada
- **Colores**: Gradientes y paleta de colores moderna
- **Layout**: Grid responsivo con cards de KPIs
- **Contenido**: Logo LeanCore, KPIs, tabla resumen, fecha

### Template HTML

El PDF se genera desde un template HTML con:
- **CSS**: Estilos modernos con gradientes
- **Layout**: Grid de 2x3 para los KPIs
- **Responsive**: Se adapta al formato A4
- **Print-friendly**: Optimizado para impresión

## 🧪 Testing

### Script de Prueba
```bash
yarn test:kpis
```

**El script prueba:**
1. ✅ Cálculo de KPIs con datos reales de MongoDB
2. ✅ Generación de PDF con template HTML
3. ✅ Ejecución manual del cronjob
4. ✅ Guardado del PDF localmente para verificación

### Verificación Manual

1. **Datos de KPIs**:
   ```bash
   curl http://localhost:3000/kpis/data
   ```

2. **Descargar PDF**:
   ```bash
   curl -O http://localhost:3000/kpis/generate-pdf
   ```

3. **Forzar generación**:
   ```bash
   curl http://localhost:3000/kpis/force-generate
   ```

## 📁 Estructura del Módulo

```
src/kpis/
├── kpis.module.ts          # Módulo principal
├── kpis.service.ts         # Lógica de negocio y cronjob
├── kpis.controller.ts      # Endpoints REST
├── interfaces/
│   └── kpi.interface.ts    # Tipos TypeScript
└── templates/              # (Futuro: templates HTML)
```

## 🔧 Configuración

### Variables de Entorno

```env
MONGODB_URI=mongodb://localhost:27017/middleware
```

### Dependencias

```json
{
  "@nestjs/schedule": "^6.0.1",
  "puppeteer": "^24.23.0"
}
```

## 📈 Logs y Monitoreo

### Logs del Cronjob

```
🔄 Iniciando generación semanal de KPIs...
📊 Calculando KPIs...
🔍 Calculando tasa de aprobación...
📋 Procesando entidad: STOP (f0f6b280-...)
   - Total leads: 150
   - Total users: 115
   - Tasa de aprobación: 76.67%
📋 Procesando entidad: YOYO (713bf1d6-...)
   - Total leads: 200
   - Total users: 154
   - Tasa de aprobación: 77.00%
📊 RESUMEN TASA DE APROBACIÓN:
   - Total leads: 350
   - Total users: 269
   - Tasa general: 76.86%
📄 Generando PDF con KPIs...
✅ PDF generado exitosamente
✅ KPIs semanales generados exitosamente
```

## 🚀 Uso en Producción

### 1. Iniciar la aplicación
```bash
yarn start:prod
```

### 2. El cronjob se ejecutará automáticamente
- **Día**: Todos los lunes
- **Hora**: 9:00 AM
- **Acción**: Genera KPIs y PDF

### 3. Acceder a los endpoints
- **PDF**: `GET /kpis/generate-pdf`
- **Datos**: `GET /kpis/data`
- **Health**: `GET /kpis/health`

## 🔮 Próximas Mejoras

1. **Templates HTML externos**: Mover HTML a archivos separados
2. **Email automático**: Enviar PDF por correo semanalmente
3. **Storage**: Guardar PDFs en AWS S3 o similar
4. **Más KPIs**: Implementar cálculos reales para todos los KPIs
5. **Dashboard web**: Interfaz web para visualizar KPIs
6. **Alertas**: Notificaciones cuando KPIs estén por debajo del objetivo

---

**Módulo desarrollado para LeanCore - Sistema de Administración de Créditos** 🚀
