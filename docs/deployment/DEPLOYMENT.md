# Despliegue — UVA-App Frontend

---

## Prerequisitos

| Herramienta | Versión mínima | Propósito |
|-------------|----------------|-----------|
| Node.js | 20 | Runtime de desarrollo y compilación |
| npm | 9+ | Gestor de paquetes |
| Ionic CLI | latest | Desarrollo y compilación de app móvil |
| Capacitor CLI | 6.x | Puente nativo para Android |
| AWS Amplify CLI | latest | Sincronización del backend AWS |
| Android Studio | latest | Compilaciones Android |
| JDK | 11+ | Requerido para Gradle / Android |

### Instalación de herramientas globales

```bash
npm install -g @ionic/cli
npm install -g @capacitor/cli
npm install -g @aws-amplify/cli
```

---

## Desarrollo Local

### 1. Clonar e instalar

```bash
git clone <repository-url>
cd UVA-App-Frontend

# Instalar dependencias
npm install
```

### 2. Sincronizar backend de Amplify

```bash
# Obtener configuración del backend desde la nube (requerido para auth y API)
amplify pull
```

### 3. Sincronizar Capacitor

```bash
# Sincronizar Capacitor con los proyectos nativos
npx cap sync
```

### 4. Iniciar servidor de desarrollo

```bash
# Servidor web en el navegador (puerto 8100)
npm start
# o equivalente:
ionic serve

# Ejecutar en emulador/dispositivo Android
ionic capacitor run android

# Abrir proyecto en Android Studio
ionic capacitor open android
```

---

## Build de Producción

### Build web

```bash
# Compilar la aplicación web para producción
npm run build
# Salida: directorio www/
```

### Build Android

```bash
# APK de debug
npm run build-android-debug

# APK/AAB de producción
ionic capacitor build android --prod
# Salida: android/app/build/outputs/
```

### Identificadores de la app

| Campo | Valor |
|-------|-------|
| App ID | `com.makesens.uvaapp` |
| Versión actual | 2.1.6 |
| Código de versión | 7 |
| SDK mínimo Android | 22 (Android 5.1) |
| SDK objetivo Android | 34 (Android 14) |

---

## Despliegue

### Android — Google Play Store

El despliegue móvil se realiza mediante subida manual del APK/AAB generado:

```bash
# 1. Compilar en modo producción
ionic capacitor build android --prod

# 2. El archivo AAB se genera en:
# android/app/build/outputs/bundle/release/app-release.aab

# 3. Subir manualmente a Google Play Console
```

### Web (Futuro) — AWS Amplify Hosting

```bash
# Despliegue automático detectado por push a la rama main
git push origin main
# Amplify Console detecta el push y despliega automáticamente

# URL del hosting: https://{branch}.{app-id}.amplifyapp.com
```

### Backend AWS — Amplify

```bash
# Enviar cambios del backend a la nube
amplify push

# Ver estado de los recursos desplegados
amplify status

# Ver entornos disponibles
amplify env list
```

---

## Pipeline de CI/CD

```
Commit de Código (GitHub)
    ↓
GitHub Actions / Amplify Console
    ↓
Instalar dependencias (npm install)
    ↓
Ejecutar pruebas (npm test)
    ↓
Compilar frontend (ng build --prod)
    ↓
Amplify Push (amplify push --yes)
    ↓
Capacitor Copy (cap copy)
    ↓
Compilación Android (gradlew assembleRelease)
    ↓
Despliegue completado
```

---

## Configuración de Entornos

### Archivos de entorno

| Archivo | Propósito |
|---------|-----------|
| `src/environments/environment.ts` | Configuración de desarrollo |
| `src/environments/environment.prod.ts` | Configuración de producción |

### Estrategia de entornos Amplify

| Entorno | Propósito | Rama | Despliegue automático |
|---------|-----------|------|-----------------------|
| Development | Desarrollo y pruebas | develop | No |
| Staging | Pre-producción | staging | Sí (opcional) |
| Production | App en producción | main | Sí (aprobación manual) |

---

## Variables de Entorno en Producción

Las variables de entorno son **administradas por Amplify** y no requieren configuración manual:

| Variable | Origen |
|----------|--------|
| `AWS_REGION` | Amplify (automático) |
| `API_ENDPOINT` | Amplify (automático) |
| `AUTH_REGION` | Amplify (automático) |
| `USER_POOL_ID` | Amplify (automático) |
| `WEB_CLIENT_ID` | Amplify (automático) |
| `IDENTITY_POOL_ID` | Amplify (automático) |
| `S3_BUCKET` | Amplify (automático) |

Ver detalles completos en [`docs/configuration/ENVIRONMENT.md`](../configuration/ENVIRONMENT.md).

---

## Pruebas

```bash
# Ejecutar pruebas en modo watch (desarrollo)
npm test

# Ejecutar pruebas en modo CI (sin interfaz)
npm run test:ci

# Ejecutar pruebas con reporte de cobertura
npm run test:dev
```

---

## Verificación Post-Despliegue

### Verificar la app Android

1. Instalar el APK en un dispositivo Android de prueba
2. Verificar que la autenticación por teléfono funciona (SMS OTP)
3. Verificar que DataStore sincroniza correctamente
4. Probar modo offline: activar modo avión, registrar medición, desactivar modo avión y verificar sincronización

### Verificar backend

```bash
# Verificar estado de recursos AWS
amplify status

# Verificar que AppSync responde
# Desde la consola de AWS AppSync, ejecutar:
# query HealthCheck { listRACIMOS(limit: 1) { items { id } } }
```

---

## Configuración Android (`android/`)

### Permisos requeridos (`AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### Configuración de Gradle

| Parámetro | Valor |
|-----------|-------|
| ID de paquete | `com.makesens.uvaapp` |
| SDK mínimo | 22 (Android 5.1) |
| SDK objetivo | 34 (Android 14) |
| Herramienta de compilación | Gradle 8.x |

---

## Solución de Problemas de Despliegue

| Problema | Causa | Solución |
|---------|-------|----------|
| `amplify pull` falla | Sin credenciales AWS configuradas | Ejecutar `amplify configure` |
| Build falla con errores de TypeScript | Tipos desactualizados | Ejecutar `amplify codegen models` |
| DataStore no sincroniza | Configuración Amplify desactualizada | Ejecutar `amplify pull` + `npx cap sync` |
| APK no instala en Android | SDK mínimo no cumplido | Verificar versión de Android del dispositivo (5.1+) |
| Errores de AppSync en producción | Desajuste de esquema | Ejecutar `amplify push` + `amplify codegen` |

---

## Mantenimiento Regular

| Tarea | Frecuencia |
|-------|-----------|
| Revisar logs de CloudWatch | Semanal |
| Actualizar dependencias de Amplify | Mensual |
| Rotar claves de API (si se usan) | Trimestral |
| Revisar permisos IAM | Trimestral |
| Probar plan de recuperación ante desastres | Semestral |

### Proceso de actualización de dependencias

```bash
# 1. Actualizar en entorno de desarrollo
npm update

# 2. Probar exhaustivamente
npm run test:ci

# 3. Compilar en producción para verificar
npm run build

# 4. Desplegar en staging
amplify env checkout staging && amplify push

# 5. Ejecutar pruebas de humo

# 6. Desplegar en producción (en horas de baja actividad)
amplify env checkout production && amplify push
```
