# 🚀 Pipeline de GitHub Actions - UVA App

## ✅ Configuración Completada

Se ha creado un pipeline completo de GitHub Actions para compilar APKs y AABs de la aplicación UVA con las siguientes características:

### 📦 Archivos Creados

1. **`.github/workflows/build-android.yml`** - Pipeline principal de APK
2. **`.github/workflows/build-android-bundle.yml`** - Pipeline para AAB (Google Play Store)
3. **`scripts/amplify-pull.sh`** - Script headless para Amplify Pull (CI/CD y local)
4. **`docs/github-actions-pipeline.md`** - Documentación completa
5. **`scripts/trigger-pipeline.sh`** - Script para activar pipelines desde CLI

### 🎯 Características Principales

#### ✅ Configuración Automática de Ambientes Amplify

- **main** → ambiente `main` (producción)
- **test** → ambiente `test` (testing)
- **develop** → ambiente `develop` (desarrollo)
- **feature/\***, **fix/\***, **hotfix/\*** → ambiente `develop`

#### ✅ Compilación Inteligente

- **APK Debug**: Todas las ramas
- **APK Release**: Solo `main` y `test`
- **AAB Release**: Manual y tags de release

#### ✅ Reutilización de Scripts Existentes

- Aprovecha `npm run build` para compilación web
- Usa `npx cap sync android` para sincronización
- Mantiene compatibilidad con scripts locales

#### ✅ Gestión de Artifacts

- Nomenclatura única con timestamps
- Retención diferenciada (30-90 días)
- Clasificación por tipo y ambiente

## 🛠️ Pasos para Activar el Pipeline

### 1. Configurar Secrets en GitHub

Ve a **Settings > Secrets and variables > Actions** y añade:

```
AWS_ACCESS_KEY_ID = tu_access_key
AWS_SECRET_ACCESS_KEY = tu_secret_key
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/...
```

**Nota**: La región `us-east-1` y el App ID están hardcodeados en los workflows.

### 2. Verificar Permisos AWS

El usuario AWS debe tener permisos para:

- Amplify (AmplifyBackendDeployFullAccess)
- CloudFormation (CloudFormationFullAccess)
- IAM (IAMFullAccess)
- S3 (S3FullAccess)
- DynamoDB (DynamoDBFullAccess)

### 3. Probar el Pipeline

```bash
# Hacer un push a una rama de feature
git checkout -b feature/test-pipeline
git commit --allow-empty -m "test: probar pipeline"
git push origin feature/test-pipeline
```

### 4. Monitorear Resultados

- Ve a **Actions** en tu repositorio GitHub
- Verifica que el workflow se ejecute correctamente
- Descarga los APKs generados desde la sección **Artifacts**

## 🎪 Solución Definitiva: Amplify Headless Mode

El pipeline usa **modo headless completo** para evitar cualquier problema de navegador en CI/CD:

### ✅ Enfoque Actual (100% Automatizado)

```bash
# 1. Instalar la versión más reciente de Amplify CLI
npm install -g @aws-amplify/cli@latest

# 2. Configurar variables de entorno para desactivar navegador
export AMPLIFY_CLI_DISABLE_BROWSER_AUTH=true

# 3. Usar configuración JSON completa (modo headless)
AMPLIFY_JSON='{"projectName":"UVA","appId":"d2l8hh51bqhq16","envName":"develop"}'
PROVIDERS_JSON='{"awscloudformation":{"configLevel":"project","useProfile":false,"accessKeyId":"KEY","secretAccessKey":"SECRET","region":"us-east-1"}}'
FRONTEND_JSON='{"frontend":"javascript","framework":"angular","config":{"SourceDir":"src","DistributionDir":"www","BuildCommand":"npm run build","StartCommand":"ionic serve"}}'

# 4. Ejecutar amplify pull con configuración completa
amplify pull \
  --amplify "$AMPLIFY_JSON" \
  --providers "$PROVIDERS_JSON" \
  --frontend "$FRONTEND_JSON" \
  --yes
```

### 🛡️ Características de Seguridad

1. **No requiere browser auth**: `AMPLIFY_CLI_DISABLE_BROWSER_AUTH=true`
2. **Credenciales via environment**: No se almacenan en archivos
3. **Configuración JSON inline**: Todo se pasa como parámetros
4. **Versión CLI actualizada**: `@aws-amplify/cli@latest` evita bugs conocidos

### 📄 Script Independiente

Creamos `scripts/amplify-pull.sh` para uso local o testing:

```bash
# Dar permisos de ejecución
chmod +x scripts/amplify-pull.sh

# Configurar variables y ejecutar
export AWS_ACCESS_KEY_ID="tu_key"
export AWS_SECRET_ACCESS_KEY="tu_secret"
export AMPLIFY_ENV="develop"
./scripts/amplify-pull.sh
```

## 📱 Identidad de la App en Google Play

> ⚠️ La ficha original `com.makesens.uvaapp` fue **cerrada por Google** por falta de
> actualizaciones durante 6 meses. Ese `applicationId` quedó quemado: no se puede
> reutilizar ni existe ruta de actualización para los usuarios instalados.

| Dato | Valor |
|---|---|
| `applicationId` actual | `com.makesens.appuva` |
| `applicationId` anterior (quemado) | `com.makesens.uvaapp` |
| ID de organización en Play Console | `4727280100437498477` |
| Consola | <https://play.google.com/console/u/0/developers/4727280100437498477> |

### Firma

El keystore (`android/keys/keystore.jks`) **no está atado a un package ni a una
organización**: es solo un par de llaves. El mismo keystore firma la ficha nueva sin
cambios. Alias y contraseñas se inyectan desde secrets del CI vía `signing.properties`
(ver `signingConfigs.release` en `android/app/build.gradle`), nunca desde el repo.

Al ser una ficha nueva, Play fija su llave de firma en la **primera subida**. Verificar
que los secrets del keystore sigan accesibles tras el cambio de organización.

### Dónde vive el package

Cambiar el `applicationId` implica tocar estos archivos en conjunto:

- `android/app/build.gradle` — `namespace` y `applicationId`
- `android/app/src/main/AndroidManifest.xml` — atributo `package`
- `android/app/src/main/res/values/strings.xml` — `package_name` y `custom_url_scheme`
- `android/app/src/main/java/com/makesens/appuva/MainActivity.java` — declaración `package` (y la ruta del archivo)
- `capacitor.config.ts` — `appId`

> La subida a Play es **manual**: el pipeline solo genera el AAB firmado y lo publica
> como artifact de GitHub Actions. No hay integración con la Play Developer API.

---

## 🚀 Comandos Rápidos

### Compilar Bundle para Play Store

```bash
# Usando GitHub CLI
gh workflow run build-android-bundle.yml -f environment=main -f build_type=release

# Usando el script incluido
./scripts/trigger-pipeline.sh bundle main release
```

### Probar Amplify Pull localmente

```bash
# Ver ayuda del script
./scripts/amplify-pull.sh --help

# Ejecutar con configuración manual
export AWS_ACCESS_KEY_ID="tu_key"
export AWS_SECRET_ACCESS_KEY="tu_secret"
export AMPLIFY_ENV="develop"
./scripts/amplify-pull.sh
```

### Ver Estado de Workflows

```bash
gh run list --workflow=build-android.yml --limit=5
```

### Descargar Artifacts

```bash
gh run download [RUN_ID] --dir ./artifacts
```

## 📊 Configuración de Ambientes

| Rama        | Ambiente Amplify | APK Debug | APK Release | Descripción |
| ----------- | ---------------- | --------- | ----------- | ----------- |
| `main`      | `main`           | ✅        | ✅          | Producción  |
| `test`      | `test`           | ✅        | ✅          | Testing     |
| `develop`   | `develop`        | ✅        | ❌          | Desarrollo  |
| `feature/*` | `develop`        | ✅        | ❌          | Features    |
| `fix/*`     | `develop`        | ✅        | ❌          | Bugfixes    |
| `hotfix/*`  | `develop`        | ✅        | ❌          | Hotfixes    |

## 🔧 Mantenimiento

### Actualizar App ID de Amplify

Editar en ambos workflows y script:

```yaml
env:
  AMPLIFY_APP_ID: d2l8hh51bqhq16 # Cambiar aquí
```

### Cambiar Región AWS

Editar en ambos workflows:

```yaml
env:
  AWS_REGION: us-east-1 # Cambiar aquí si es necesario
```

### Añadir Nuevos Ambientes

Modificar la lógica en el step "Determine Amplify environment":

```bash
elif [[ "${{ github.ref }}" == "refs/heads/nueva-rama" ]]; then
  echo "env_name=nuevo-ambiente" >> $GITHUB_OUTPUT
```

### Actualizar Framework Config

Si cambias la estructura del proyecto, actualizar en workflows:

```json
{
  "frontend": "javascript",
  "framework": "angular",
  "config": {
    "SourceDir": "src",
    "DistributionDir": "www",
    "BuildCommand": "npm run build",
    "StartCommand": "ionic serve"
  }
}
```

## 🔍 Variables de Entorno del Pipeline

| Variable                           | Valor            | Descripción                           |
| ---------------------------------- | ---------------- | ------------------------------------- |
| `AMPLIFY_APP_ID`                   | `d2l8hh51bqhq16` | ID de la aplicación Amplify           |
| `AWS_REGION`                       | `us-east-1`      | Región de AWS para Amplify            |
| `JAVA_VERSION`                     | `17`             | Versión de Java para Android          |
| `NODE_VERSION`                     | `20`             | Versión de Node.js                    |
| `AMPLIFY_CLI_DISABLE_BROWSER_AUTH` | `true`           | Desactiva autenticación por navegador |

## 🐛 Solución de Problemas

### Error: "Amplify CLI opens browser"

✅ **Solucionado**: Modo headless con `AMPLIFY_CLI_DISABLE_BROWSER_AUTH=true`

### Error: "Cannot find app with appId"

- Verificar que el App ID sea correcto
- Confirmar permisos AWS para Amplify

### Error: "Invalid credentials"

- Verificar secrets en GitHub Actions
- Confirmar que las credenciales AWS tengan permisos suficientes

### Error: "Frontend configuration not found"

- El pipeline incluye configuración completa para Ionic/Angular
- Verificar que la estructura del proyecto no haya cambiado

## 📚 Documentación Adicional

- **Documentación completa**: [`docs/github-actions-pipeline.md`](docs/github-actions-pipeline.md)
- **Documentación del proyecto**: [`README.md`](README.md)
- **Documentación de build Android**: [`docs/android-build.md`](docs/android-build.md)

---

**¡El pipeline está listo para usar! 🎉**

### ⚡ Inicio Rápido

1. **Configurar secrets**: `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`
2. **Push a cualquier rama**: El pipeline se ejecutará automáticamente
3. **Descargar APKs**: Desde la sección Artifacts en GitHub Actions

### 🎯 Beneficios de esta Solución

- ✅ **100% Automatizado**: No requiere interacción manual
- ✅ **Robusto**: Usa la versión más reciente de Amplify CLI
- ✅ **Seguro**: Credenciales via environment variables
- ✅ **Flexible**: Script independiente para uso local
- ✅ **Bien documentado**: Logs detallados y manejo de errores

Para cualquier problema, consulta la documentación completa o los logs del workflow en GitHub Actions.

## 🚀 ¿Cómo empezar?

### 1. Configurar Secrets en GitHub

```bash
# Ir a: Settings → Secrets and variables → Actions
# Agregar:
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 2. Hacer push a cualquier rama

```bash
git push origin feature/mi-nueva-feature
```

### 3. Ver resultados

- **GitHub Actions**: Ir a la pestaña "Actions" del repositorio
- **Slack**: Recibir notificaciones automáticas en tu canal configurado
- **Artifacts**: Descargar APK/AAB desde GitHub o enlaces en Slack

## 📬 Integración con Slack

### Configuración

1. Crear webhook en Slack (ver [docs/slack-integration.md](docs/slack-integration.md))
2. Agregar `SLACK_WEBHOOK_URL` a los secrets de GitHub
3. ¡Listo! Recibirás notificaciones automáticas

### Notificaciones que Envía

- ✅ **Build exitoso**: APK/AAB generado con información del commit
- ❌ **Build fallido**: Error con enlace a los logs
- 📱 **APK builds**: Para todas las ramas
- 📦 **Bundle AAB**: Para releases y Google Play

### Canales Recomendados

- `#uva-app-builds` - Todas las notificaciones
- `#uva-app-releases` - Solo releases importantes
