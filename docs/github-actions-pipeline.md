# 🚀 GitHub Actions Pipeline - UVA App

Este documento describe el pipeline de GitHub Actions configurado para compilar automáticamente APKs y AABs de la aplicación UVA.

## 📋 Tabla de Contenidos

- [Workflows Disponibles](#workflows-disponibles)
- [Configuración de Secrets](#configuración-de-secrets)
- [Ambientes de Amplify](#ambientes-de-amplify)
- [Triggers y Ramas](#triggers-y-ramas)
- [Artifacts y Salidas](#artifacts-y-salidas)
- [Troubleshooting](#troubleshooting)

## 🔧 Workflows Disponibles

### 1. Build Android APK (`build-android.yml`)

**Propósito**: Compilar APKs automáticamente en cada push a ramas específicas.

**Características**:

- ✅ Compilación automática en push a branches
- ✅ Configuración automática de ambiente Amplify
- ✅ Generación de APK debug y release
- ✅ Upload de artifacts con nombres únicos
- ✅ Resumen detallado del build

**Se ejecuta en**:

- `feature/**`
- `fix/**`
- `hotfix/**`
- `develop`
- `test`
- `main`

### 2. Build Android Bundle (`build-android-bundle.yml`)

**Propósito**: Generar AAB (Android App Bundle) para Google Play Store.

**Características**:

- ✅ Ejecutión manual con parámetros
- ✅ Compilación automática en tags y main
- ✅ Selección de ambiente y tipo de build
- ✅ Generación de AAB para Play Store
- ✅ Upload de artifacts con retención extendida

**Se ejecuta en**:

- Manual (workflow_dispatch)
- Push a `main`
- Tags `v*`

## 🔐 Configuración de Secrets

Para que el pipeline funcione correctamente, necesitas configurar los siguientes secrets en tu repositorio de GitHub:

### GitHub Repository Secrets

Ve a **Settings > Secrets and variables > Actions** y añade:

| Secret                  | Descripción           | Valor             |
| ----------------------- | --------------------- | ----------------- |
| `AWS_ACCESS_KEY_ID`     | AWS Access Key ID     | Tu AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | Tu AWS Secret Key |

### Obtener Credenciales de AWS

1. **Accede a AWS Console**
2. **Ve a IAM > Users**
3. **Crea un usuario para CI/CD** con permisos de Amplify
4. **Genera Access Keys**
5. **Añade los secrets al repositorio**

### Permisos Necesarios

El usuario de AWS necesita estos permisos:

- `AmplifyBackendDeployFullAccess`
- `AWSAmplifyConsoleFullAccess`
- `CloudFormationFullAccess`
- `IAMFullAccess`
- `S3FullAccess`
- `DynamoDBFullAccess`

## 🌍 Ambientes de Amplify

El pipeline configura automáticamente el ambiente correcto según la rama:

| Rama         | Ambiente Amplify | Descripción |
| ------------ | ---------------- | ----------- |
| `main`       | `main`           | Producción  |
| `test`       | `test`           | Testing     |
| `develop`    | `develop`        | Desarrollo  |
| `feature/**` | `develop`        | Desarrollo  |
| `fix/**`     | `develop`        | Desarrollo  |
| `hotfix/**`  | `develop`        | Desarrollo  |

### Configuración Manual

Para el workflow de Bundle, puedes seleccionar manualmente:

- **Ambiente**: `develop`, `test`, `main`
- **Tipo de Build**: `debug`, `release`

## 🔄 Triggers y Ramas

### Automatic Triggers

```yaml
# Push a ramas específicas
push:
  branches:
    - 'feature/**'
    - 'fix/**'
    - 'hotfix/**'
    - 'develop'
    - 'test'
    - 'main'

# Pull requests a ramas principales
pull_request:
  branches:
    - 'develop'
    - 'main'
```

### Manual Triggers

```yaml
# Activación manual para Bundle
workflow_dispatch:
  inputs:
    environment:
      description: 'Ambiente de Amplify'
      required: true
      default: 'develop'
      type: choice
      options:
        - develop
        - test
        - main
```

## 📦 Artifacts y Salidas

### Nomenclatura de Artifacts

Los artifacts se generan con nombres únicos:

```
UVA-APK-{BRANCH_NAME}-{TIMESTAMP}-{TYPE}
UVA-Bundle-{BRANCH_NAME}-{TIMESTAMP}-{TYPE}
```

**Ejemplo**: `UVA-APK-feature-auth-20241201_143022-debug`

### Tipos de Artifacts

| Tipo               | Descripción           | Retención | Ramas        |
| ------------------ | --------------------- | --------- | ------------ |
| **APK Debug**      | APK para testing      | 30 días   | Todas        |
| **APK Release**    | APK para distribución | 90 días   | main, test   |
| **Bundle Debug**   | AAB para testing      | 30 días   | Manual       |
| **Bundle Release** | AAB para Play Store   | 90 días   | Manual, main |

### Ubicación de Archivos

Los artifacts se almacenan en:

- **APK Debug**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **APK Release**: `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- **Bundle Debug**: `android/app/build/outputs/bundle/debug/app-debug.aab`
- **Bundle Release**: `android/app/build/outputs/bundle/release/app-release.aab`

## 🔍 Monitoring y Logs

### Build Summary

Cada workflow genera un resumen con:

- 📊 Información del build
- 📱 Tamaño de los artifacts
- 🎯 Configuración del ambiente
- ✅ Estado de la compilación

### Logs Detallados

Los workflows incluyen logs detallados para:

- Configuración de Amplify
- Compilación web
- Sincronización de Capacitor
- Compilación de Android
- Upload de artifacts

## 🛠️ Troubleshooting

### Problemas Comunes

#### 1. Error de Credenciales AWS

```
Error: Unable to configure AWS credentials
```

**Solución**: Verifica que los secrets `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` estén configurados correctamente.

#### 2. Error de Amplify Pull

```
Error: Cannot find app with appId: d2l8hh51bqhq16
```

**Solución**: Verifica que el appId sea correcto y que tengas permisos para acceder a la aplicación de Amplify.

#### 3. Error de Compilación Android

```
Error: Could not find or load main class GradleWrapperMain
```

**Solución**: El workflow corrige automáticamente este problema dando permisos de ejecución al gradlew.

#### 4. Error de Dependencias

```
Error: npm ci failed
```

**Solución**:

- Verifica que `package-lock.json` esté actualizado
- Revisa que no haya conflictos de dependencias
- Considera actualizar Node.js en el workflow

### Logs de Debugging

Para debugging avanzado, puedes:

1. **Habilitar logs detallados**:

   ```yaml
   - name: Debug step
     run: |
       set -x  # Habilitar verbose
       your-command
   ```

2. **Verificar variables de entorno**:

   ```yaml
   - name: Debug environment
     run: |
       echo "Node version: $(node -v)"
       echo "NPM version: $(npm -v)"
       echo "Java version: $(java -version)"
   ```

3. **Revisar archivos generados**:
   ```yaml
   - name: List build outputs
     run: |
       find android/app/build/outputs -type f -name "*.apk" -o -name "*.aab"
   ```

## 🚀 Uso del Pipeline

### Para Releases

1. **Generar Bundle para Play Store**:

   - Ve a **Actions > Build Android Bundle**
   - Clic en **Run workflow**
   - Selecciona:
     - Environment: `main`
     - Build type: `release`
   - Clic en **Run workflow**

2. **Crear Release Tag**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
   → Se compilará automáticamente un Bundle release

### Descargar Artifacts

1. **Ve a Actions > Workflow run**
2. **Scroll hasta la sección Artifacts**
3. **Clic en el artifact que necesites**
4. **Se descargará automáticamente**

## 🔄 Mantenimiento

### Actualización de Dependencias

El pipeline puede requerir actualizaciones periódicas:

- **GitHub Actions**: Actualizar versiones de actions
- **Node.js**: Actualizar versión de Node
- **Java**: Actualizar versión de Java
- **Android SDK**: Actualizar API level y build tools

### Monitoreo

Revisa periódicamente:

- ✅ Tiempo de compilación
- ✅ Tamaño de artifacts
- ✅ Tasa de éxito de builds
- ✅ Uso de secrets y permisos

---

**¡El pipeline está listo para usar! 🎉**

Para más información sobre el proyecto, consulta el [README principal](../README.md).
