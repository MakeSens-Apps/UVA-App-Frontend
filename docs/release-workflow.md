# 🚀 Workflow de Releases y Versiones para UVA App

## 📋 Resumen del Proceso

El pipeline está diseñado para generar automáticamente **versiones únicas** para cada Bundle AAB, garantizando que nunca se repitan en Google Play Store.

```
Desarrollo → Release/Tag → Bundle AAB → Google Play Store
     ↓           ↓            ↓              ↓
  feature/*    v1.0.0    Firmado +       Producción
              (GitHub)   Versionado
```

## 🔢 Sistema de Versiones

### **Version Name** (Visible al usuario)

- **Release/Tag**: `v1.0.0` → `1.0.0`
- **Manual**: Lo que especifiques en el workflow
- **Automático**: `1.0.YYYYMMDDHHMM` (ej: `1.0.202412201430`)

### **Version Code** (Identificador único)

- **Manual**: Número entero que especifiques
- **Automático**: `YYYYMMDDHHMM` (ej: `202412201430`)

### **Ejemplos de Versiones**

```bash
# Release v1.0.0
Version Name: 1.0.0
Version Code: 202412201430

# Release v2.1.5
Version Name: 2.1.5
Version Code: 202412201435

# Manual
Version Name: 1.5.0
Version Code: 150
```

## 🛠️ Formas de Crear Releases

### 1. **GitHub Release** (Recomendado)

```bash
# Crear tag
git tag v1.0.0
git push origin v1.0.0

# Crear release en GitHub UI
1. Ve a: Releases → Create new release
2. Tag: v1.0.0
3. Title: "Release v1.0.0"
4. Description: Changelog
5. Publish release

# Resultado: Bundle AAB automático con versión 1.0.0
```

### 2. **Tag Directo**

```bash
# Push tag directo
git tag v1.2.0
git push origin v1.2.0

# Resultado: Bundle AAB automático con versión 1.2.0
```

### 3. **Workflow Manual**

```bash
# GitHub → Actions → Build Android Bundle → Run workflow
# Especificar:
# - Environment: main/test/develop
# - Build type: release/debug
# - Version name: 1.0.0 (opcional)
# - Version code: 100 (opcional)
```

### 4. **Push a Main**

```bash
# Push directo a main
git push origin main

# Resultado: Bundle AAB automático con versión temporal
```

## 🔐 Firmado de Producción

### **Configuración Automática**

- **Releases/Tags**: Uso automático de keystore de producción
- **Otros builds**: Usa debug signing por defecto

### **Secrets Requeridos**

```bash
# GitHub → Settings → Secrets and variables → Actions
KEYSTORE_BASE64=tu_keystore_en_base64
KEYSTORE_PASSWORD=contraseña_del_keystore
KEY_ALIAS=alias_de_la_clave
KEY_PASSWORD=contraseña_de_la_clave
```

### **Validación Automática**

El pipeline valida automáticamente:

- ✅ Existencia de todos los secrets
- ✅ Validez del keystore
- ✅ Correcta configuración del alias
- ✅ Acceso a la clave privada

## 📦 Tipos de Bundle Generados

### **Release Bundle** (Producción)

- ✅ Firmado con keystore de producción
- ✅ Listo para Google Play Store
- ✅ Optimizado para distribución
- ✅ Version codes únicos

### **Debug Bundle** (Testing)

- ✅ Firmado con certificado de debug
- ✅ Solo para pruebas internas
- ✅ Instalación directa en dispositivos

## 📱 Subida a Google Play Store

### **Proceso Automático**

1. **Crear Release**: `git tag v1.0.0 && git push origin v1.0.0`
2. **Esperar Pipeline**: ~10-15 minutos
3. **Descargar Bundle**: Desde GitHub Actions artifacts
4. **Subir a Play Store**: Google Play Console

### **Proceso Manual**

1. **Ejecutar Workflow**: GitHub → Actions → Build Android Bundle
2. **Configurar**: Environment=main, Build type=release
3. **Especificar Versión**: Version name y code únicos
4. **Descargar y Subir**: Bundle AAB a Play Store

## 📊 Tracking de Versiones

### **En GitHub**

- **Releases**: Historial completo de versiones
- **Tags**: Etiquetas de versión
- **Actions**: Logs detallados de cada build

### **En Slack**

- **Notificaciones**: Cada bundle generado
- **Información**: Versión, rama, commit, autor
- **Enlaces**: Descarga directa y commit

### **En Google Play Console**

- **Version History**: Historial de versiones subidas
- **Release Management**: Gestión de releases
- **Version Codes**: Identificadores únicos

## 🔄 Workflow de Desarrollo

### **Desarrollo Diario**

```bash
# Desarrollo normal
git checkout feature/nueva-funcionalidad
git add .
git commit -m "Nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# Resultado: Solo APK debug (no bundle)
```

### **Preparar Release**

```bash
# 1. Merge a main
git checkout main
git merge feature/nueva-funcionalidad
git push origin main

# 2. Crear release
git tag v1.1.0
git push origin v1.1.0

# 3. Crear release en GitHub UI
# Resultado: Bundle AAB firmado para producción
```

### **Hotfix Urgente**

```bash
# 1. Crear hotfix desde main
git checkout main
git checkout -b hotfix/critical-fix
git add .
git commit -m "Fix crítico"
git push origin hotfix/critical-fix

# 2. Crear release inmediato
git tag v1.0.1
git push origin v1.0.1

# Resultado: Bundle AAB con fix urgente
```

## 📈 Versionado Semántico

### **Formato: MAJOR.MINOR.PATCH**

- **MAJOR**: Cambios que rompen compatibilidad
- **MINOR**: Nuevas funcionalidades compatibles
- **PATCH**: Correcciones de bugs

### **Ejemplos**

```bash
v1.0.0 → Primera versión estable
v1.1.0 → Nueva funcionalidad
v1.1.1 → Corrección de bugs
v2.0.0 → Cambio mayor (breaking changes)
```

## 🚨 Solución de Problemas

### **Error: "Version already exists"**

```bash
# Problema: Version code ya existe en Play Store
# Solución: Usar version code más alto
git tag v1.0.1  # Incrementar versión
```

### **Error: "Keystore validation failed"**

```bash
# Problema: Secrets de keystore incorrectos
# Solución: Reconfigurar secrets
# Ver: docs/android-signing.md
```

### **Error: "Build failed"**

```bash
# Problema: Error en la compilación
# Solución: Ver logs detallados
# GitHub → Actions → Failed workflow → Logs
```

## 🎯 Mejores Prácticas

### **Para Releases**

- ✅ Usar versionado semántico
- ✅ Crear releases desde main
- ✅ Incluir changelog detallado
- ✅ Probar antes de release

### **Para Version Codes**

- ✅ Usar números incrementales
- ✅ Nunca reutilizar un version code
- ✅ Dejar espacio entre versiones (ej: 100, 200, 300)

### **Para Keystore**

- ✅ Hacer backup del keystore
- ✅ Usar contraseñas seguras
- ✅ Rotar secrets periódicamente
- ✅ Verificar configuración regularmente

## 📚 Enlaces Útiles

- **GitHub Releases**: https://github.com/tu-usuario/tu-repo/releases
- **Google Play Console**: https://play.google.com/console/
- **Android App Signing**: https://developer.android.com/studio/publish/app-signing
- **Semantic Versioning**: https://semver.org/

## 🤝 Flujo de Trabajo en Equipo

### **Desarrollador**

1. Crear feature branch
2. Desarrollar y probar
3. Crear pull request
4. Merge a main (después de review)

### **Release Manager**

1. Revisar cambios en main
2. Crear release con versión adecuada
3. Verificar que el bundle se genere correctamente
4. Subir a Google Play Store

### **QA Team**

1. Probar builds de desarrollo
2. Validar releases antes de producción
3. Verificar funcionalidad en diferentes dispositivos

Esta documentación te ayudará a gestionar releases de forma eficiente y profesional, garantizando que cada versión sea única y esté correctamente firmada para Google Play Store.
