# 📱 Integración con Slack para UVA App

## Configuración de Slack Webhook

### 1. Crear Webhook en Slack

1. Ve a tu workspace de Slack
2. Navega a **Administración** → **Gestionar apps**
3. Busca e instala **Incoming Webhooks**
4. Haz clic en **Añadir configuración**
5. Selecciona el canal donde quieres recibir las notificaciones
6. Copia la **URL del webhook** (algo como `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

### 2. Configurar GitHub Secrets

1. Ve a tu repositorio en GitHub
2. Navega a **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en **New repository secret**
4. Añade:
   - **Name**: `SLACK_WEBHOOK_URL`
   - **Value**: La URL del webhook que copiaste

### 3. Configurar Canal de Slack

Se recomienda crear un canal específico para las notificaciones de builds:

```
#uva-app-builds
```

### 4. Personalizar Mensajes (Opcional)

Puedes personalizar los mensajes editando el archivo `.github/workflows/build-android.yml`:

```yaml
custom_payload: |
  {
    "text": "📱 Nueva APK generada para UVA App",
    "attachments": [
      {
        "color": "good",
        "fields": [
          {
            "title": "Rama",
            "value": "${{ steps.extract-branch.outputs.branch }}",
            "short": true
          }
        ]
      }
    ]
  }
```

## Mensajes que se Envían

### ✅ Build Exitoso

- **Título**: "📱 Nueva APK generada para UVA App"
- **Información**: Rama, commit, autor, ambiente
- **Estado**: APK debug y release generados
- **Acciones**: Botones para descargar APK y ver commit

### ❌ Build Fallido

- **Título**: "❌ Error al generar APK para UVA App"
- **Información**: Rama, commit, autor, error
- **Acciones**: Botón para ver los logs

## Canales Recomendados

- `#uva-app-builds` - Para todas las notificaciones de builds
- `#uva-app-releases` - Solo para releases a producción (main)
- `#uva-app-dev` - Para builds de desarrollo

## Personalización Avanzada

### Filtrar por Rama

```yaml
- name: 📬 Send APK to Slack
  if: success() && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
```

### Diferentes Canales por Ambiente

```yaml
env:
  SLACK_WEBHOOK_URL: ${{ github.ref == 'refs/heads/main' && secrets.SLACK_WEBHOOK_PROD || secrets.SLACK_WEBHOOK_DEV }}
```

### Menciones Específicas

```yaml
'text': '📱 Nueva APK generada para UVA App <@U12345678>'
```

## Solución de Problemas

### Error: "Invalid webhook URL"

- Verifica que la URL del webhook sea correcta
- Asegúrate de que el webhook esté activo en Slack

### Error: "Missing SLACK_WEBHOOK_URL"

- Verifica que el secret esté configurado en GitHub
- Asegúrate de que el nombre del secret sea exacto

### Mensajes no se Envían

- Verifica que el canal de Slack exista
- Confirma que el webhook tenga permisos en el canal

## Ejemplo de Mensaje

```json
{
  "text": "📱 Nueva APK generada para UVA App",
  "attachments": [
    {
      "color": "good",
      "fields": [
        {
          "title": "Rama",
          "value": "feature/auth-improvements",
          "short": true
        },
        {
          "title": "Autor",
          "value": "jose.salamanca",
          "short": true
        },
        {
          "title": "APK Debug",
          "value": "✅ Generado",
          "short": true
        },
        {
          "title": "APK Release",
          "value": "❌ Solo para main/test",
          "short": true
        }
      ],
      "actions": [
        {
          "type": "button",
          "text": "📥 Descargar APK",
          "url": "https://github.com/user/repo/actions/runs/123456"
        }
      ]
    }
  ]
}
```
