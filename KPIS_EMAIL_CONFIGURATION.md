# Configuración de KPIs por Fintech con Envío de Emails

## Descripción

El sistema de KPIs ha sido actualizado para generar reportes separados por fintech y enviarlos automáticamente por email con diferentes frecuencias:

- **STOP-YOYO**: Reportes semanales (cada lunes a las 9:00 AM)
- **Credilider, Presti, Socoda**: Reportes mensuales (primer día del mes a las 9:00 AM)

## Configuración de Variables de Entorno

Agregar las siguientes variables al archivo `.env`:

```env
# Configuración de Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_FROM="LeanCore" <noreply@leancore.com>
```

### Configuración para Gmail

1. Habilitar autenticación de 2 factores en tu cuenta de Gmail
2. Generar una contraseña de aplicación específica
3. Usar esa contraseña en `SMTP_PASS`

### Configuración para otros proveedores SMTP

- **Outlook/Hotmail**: `smtp-mail.outlook.com`, puerto 587
- **Yahoo**: `smtp.mail.yahoo.com`, puerto 587
- **SendGrid**: `smtp.sendgrid.net`, puerto 587

## Configuración de Emails por Fintech

Los emails se configuran en el método `getEmailConfigs()` del `KpisService`:

```typescript
private getEmailConfigs(): FintechEmailConfig[] {
  return [
    {
      fintechName: 'STOP-YOYO',
      emails: [
        'admin@stop.com',
        'admin@yoyo.com',
        'finanzas@stop.com'
      ],
      frequency: 'weekly'
    },
    {
      fintechName: 'Credilider',
      emails: [
        'admin@credilider.com',
        'finanzas@credilider.com'
      ],
      frequency: 'monthly'
    },
    // ... más configuraciones
  ];
}
```

## Endpoints Disponibles

### 1. Generar KPIs para una fintech específica
```
GET /kpis/fintech/:fintechName
```

Ejemplo:
```
GET /kpis/fintech/STOP-YOYO
GET /kpis/fintech/Credilider
```

### 2. Forzar envío semanal
```
GET /kpis/force-weekly
```

### 3. Forzar envío mensual
```
GET /kpis/force-monthly
```

### 4. Enviar emails a todas las fintechs
```
GET /kpis/send-emails
```

### 5. Health check
```
GET /kpis/health
```

## Cronjobs Automáticos

### Semanal (STOP-YOYO)
```typescript
@Cron('0 9 * * 1') // Lunes a las 9:00 AM
async generateWeeklyKPIs()
```

### Mensual (Otras fintechs)
```typescript
@Cron('0 9 1 * *') // Primer día del mes a las 9:00 AM
async generateMonthlyKPIs()
```

## Estructura de los Emails

Cada email incluye:
- **Asunto**: "LeanCore - KPIs [Semanal/Mensual] - [Nombre Fintech]"
- **Contenido HTML**: Diseño profesional con información del reporte
- **Adjunto**: PDF con los KPIs específicos de la fintech
- **Confidencialidad**: Advertencia de que el contenido es confidencial

## Seguridad

- Los emails se envían solo a las direcciones configuradas para cada fintech
- Cada fintech recibe únicamente sus propios KPIs
- El contenido se marca como confidencial
- No hay cruce de información entre fintechs

## Pruebas

### 1. Probar configuración de email
```bash
# Verificar que el servicio esté funcionando
curl http://localhost:3000/kpis/health
```

### 2. Probar generación para fintech específica
```bash
curl http://localhost:3000/kpis/fintech/STOP-YOYO
```

### 3. Probar envío de emails
```bash
curl http://localhost:3000/kpis/send-emails
```

### 4. Probar cronjobs manualmente
```bash
curl http://localhost:3000/kpis/force-weekly
curl http://localhost:3000/kpis/force-monthly
```

## Logs

El sistema genera logs detallados para monitoreo:

```
📊 Generando KPIs para STOP-YOYO (weekly)...
📧 Enviando KPIs semanal para STOP-YOYO a 3 destinatarios...
✅ Email enviado exitosamente a admin@stop.com
✅ KPIs enviados exitosamente para STOP-YOYO
```

## Troubleshooting

### Error de autenticación SMTP
- Verificar credenciales en variables de entorno
- Para Gmail, usar contraseña de aplicación
- Verificar que 2FA esté habilitado

### Emails no se envían
- Verificar logs del servicio
- Comprobar configuración SMTP
- Verificar que las direcciones de email sean válidas

### KPIs no se generan
- Verificar conexión a MongoDB
- Comprobar que existan datos para el período
- Revisar logs de errores

## Personalización

Para modificar las frecuencias o agregar nuevas fintechs:

1. Actualizar el método `getEmailConfigs()`
2. Agregar la nueva fintech a `getFinancialEntities()`
3. Configurar los emails correspondientes
4. Reiniciar el servicio

## Monitoreo

Recomendaciones para monitoreo en producción:

1. Configurar alertas para errores de envío de emails
2. Monitorear logs de cronjobs
3. Verificar que los emails lleguen correctamente
4. Mantener backup de configuraciones de email



