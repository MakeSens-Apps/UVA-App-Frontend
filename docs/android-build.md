# Compilación Android - Guía Completa

## 🚀 Compilación Rápida (Recomendado)

### Desarrollo (Entorno actual)

```bash
# Configurar todo y compilar en un solo comando
npm run android:full

# O paso a paso:
npm run android:setup  # Configurar plataforma
npm run android:build  # Compilar APK
npm run android:bundle # Compilar Bundle para Play Store
```

### Producción (Entorno main)

```bash
# Compilar para producción (mantiene entorno main activo)
npm run android:prod

# Compilar para producción y restaurar entorno original
npm run android:prod-safe
```

## 📋 Requisitos del Sistema

### macOS

- **Homebrew** instalado
- **Node.js** y **npm**
- **Android Studio** (para SDK)
- **OpenJDK 17**
- **Gradle**

Los scripts instalarán automáticamente las dependencias faltantes.

## 🔧 Solución de Problemas Comunes

### Error: "JAVA_HOME is set to an invalid directory"

**Solución:** Ejecutar `npm run android:setup`

### Error: "resource mipmap/ic_launcher_background not found"

**Solución:** Los scripts corrigen automáticamente las referencias de iconos

### Error: "Could not find or load main class GradleWrapperMain"

**Solución:** Los scripts instalan Gradle globalmente como respaldo

### Error: "android platform has not been added yet"

**Solución:** Ejecutar `npx cap add android` o `npm run android:setup`

## 📱 Archivos de Salida

### APK (para instalación directa)

- **Debug:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release:** `android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Bundle (para Google Play Store)

- **Release:** `android/app/build/outputs/bundle/release/app-release.aab`

## 🔄 Proceso de Desarrollo

### Desarrollo Local

1. **Primera vez:** `npm run android:full`
2. **Cambios menores:** `npm run android:build`
3. **Cambios mayores:** `npm run android:setup && npm run android:build`

### Compilación para Producción

1. **APK/Bundle de producción:** `npm run android:prod-safe` (recomendado)
2. **Solo producción:** `npm run android:prod`
3. **Solo Bundle para Play Store:** `npm run android:bundle`

### Comandos Manuales (Alternativa)

```bash
# Cambiar al entorno de producción
amplify env checkout main
amplify pull --yes

# Compilar normalmente
npm run android:build

# Restaurar entorno de desarrollo
amplify env checkout develop
amplify pull --yes
```

## 🛡️ Mantenimiento

### Respaldo de Configuraciones

La carpeta `android/` está incluida en Git para mantener todas las configuraciones.

### Regeneración Automática

Los scripts pueden regenerar la plataforma Android completamente si es necesario.

### Variables de Entorno

Todas las variables se configuran automáticamente en los scripts.
