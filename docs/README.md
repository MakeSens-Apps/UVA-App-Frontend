# Documentación Técnica — UVA-App Frontend

> **Aplicación:** UVA-App Frontend
> **Tipo:** App móvil híbrida (Angular 18 + Ionic 8 + Capacitor 6)
> **Backend:** AWS Amplify (AppSync GraphQL + Cognito + DynamoDB)
> **Plataforma:** Android (Google Play) / Web

---

## Descripción General

UVA-App es una aplicación móvil diseñada para el monitoreo agrícola y gestión de viñedos. Permite a agricultores y profesionales del agro registrar mediciones en series de tiempo, monitorear el progreso mediante gamificación y tomar decisiones basadas en datos. La app opera con una estrategia **offline-first**: funciona completamente sin conexión y sincroniza automáticamente con la nube cuando hay internet disponible.

**App ID:** `com.makesens.uvaapp`
**Versión actual:** 2.1.6 (Build 7)
**Backend API:** AWS AppSync GraphQL — Región `us-east-1`

---

## Indice de Documentación

### Arquitectura del Sistema

| Documento | Descripción |
|-----------|-------------|
| [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) | Arquitectura general, diagrama de capas, patrones de diseño, seguridad y rendimiento |
| [architecture/MODULES.md](./architecture/MODULES.md) | Estructura de directorios, módulos, páginas, componentes y servicios |

### API GraphQL

| Documento | Descripción |
|-----------|-------------|
| [api/ENDPOINTS.md](./api/ENDPOINTS.md) | Operaciones GraphQL (queries, mutations, subscriptions), autenticación, paginación y manejo de errores |

### Modelos de Datos

| Documento | Descripción |
|-----------|-------------|
| [data/MODELS.md](./data/MODELS.md) | Modelos DynamoDB (RACIMO, UVA, Usuario, Medición, ProgresoUsuario), relaciones, índices GSI y patrones de acceso |

### Despliegue

| Documento | Descripción |
|-----------|-------------|
| [deployment/DEPLOYMENT.md](./deployment/DEPLOYMENT.md) | Prerequisitos, desarrollo local, build de producción, pipeline CI/CD y solución de problemas |

### Configuración

| Documento | Descripción |
|-----------|-------------|
| [configuration/ENVIRONMENT.md](./configuration/ENVIRONMENT.md) | Variables de entorno, dependencias principales, configuración Angular/Capacitor/Amplify/Android |

### Operación

| Documento | Descripción |
|-----------|-------------|
| [operation/FLOW.md](./operation/FLOW.md) | Flujos de usuario principales, manejo de estados de UI, errores, limitaciones y mejoras futuras |

### Componentes

| Documento | Descripción |
|-----------|-------------|
| [components/COMPONENTS.md](./components/COMPONENTS.md) | Documentación de componentes Angular/Ionic reutilizables y páginas de la app |

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework UI | Angular 18 + Ionic 8 |
| Runtime nativo | Capacitor 6 |
| Lenguaje | TypeScript 5.5 |
| Reactividad | RxJS 7.8 |
| Backend | AWS Amplify 6.8 |
| API | AWS AppSync (GraphQL) |
| Auth | AWS Cognito (teléfono + SMS OTP) |
| Base de datos | Amazon DynamoDB (vía AppSync) |
| Almacenamiento offline | AWS Amplify DataStore (IndexedDB) |
| Archivos | Amazon S3 |
| Analytics | AWS Pinpoint |
| Gráficos | Chart.js 4.4 |
| Alertas | SweetAlert2 |
| Pruebas | Karma + Jasmine |

---

## Inicio Rápido

```bash
# Clonar el repositorio
git clone <repository-url>
cd UVA-App-Frontend

# Instalar dependencias
npm install

# Sincronizar backend de Amplify (requerido para auth y API)
amplify pull

# Sincronizar Capacitor con proyectos nativos
npx cap sync

# Iniciar servidor de desarrollo (navegador web)
npm start

# Ejecutar en emulador Android
ionic capacitor run android
```

Para instrucciones detalladas de despliegue, ver [deployment/DEPLOYMENT.md](./deployment/DEPLOYMENT.md).

---

## Equipo y Soporte

**Equipo de Desarrollo:** MakeSens Apps
**Copyright:** Copyright 2024 MakeSens Apps
