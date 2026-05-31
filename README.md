# UVA-App Frontend

> Aplicación móvil para monitoreo agrícola y gestión de viñedos

## 📋 Descripción del Proyecto

UVA-App es una aplicación móvil diseñada para resolver los desafíos de monitoreo agrícola en la gestión de viñedos. La app permite a agricultores y profesionales del agro registrar mediciones, monitorear el progreso y tomar decisiones basadas en datos, integrando buenas prácticas agrícolas, incluyendo la integración del ciclo lunar.

## 🎯 Propósito

Este repositorio contiene la aplicación móvil frontend construida para:
- Habilitar la recolección de datos sin conexión (offline-first) en entornos agrícolas
- Registrar mediciones en series de tiempo con sincronización en la nube
- Gamificar el monitoreo agrícola para mejorar el compromiso del usuario
- Proveer analíticas visuales e información histórica
- Soportar colaboración multi-proyecto a través de la organización RACIMO (clúster)

## ✨ Funcionalidades Principales

- **Autenticación y Seguridad**: Autenticación por teléfono con OTP por SMS y MFA
- **Registro de Mediciones**: Sistema de medición basado en tareas diarias con restricciones horarias
- **Soporte Offline**: Almacenamiento local con sincronización automática en la nube
- **Gamificación**: Seguimiento de progreso con semillas, rachas, hitos y logros
- **Gestión de Proyectos**: Estructura multi-inquilino con vinculación de proyectos mediante códigos
- **Integración con Fases Lunares**: Calendario agrícola basado en ciclos lunares
- **Visualización de Datos**: Gráficos históricos y analíticas de progreso
- **Sincronización en Tiempo Real**: Suscripciones GraphQL para actualizaciones instantáneas

## 🚀 Comandos Básicos

### Prerrequisitos

- Node.js 20 o superior
- npm o yarn
- Ionic CLI (`npm install -g @ionic/cli`)
- Capacitor CLI (`npm install -g @capacitor/cli`)
- AWS Amplify CLI (`npm install -g @aws-amplify/cli`)
- Android Studio (para compilaciones Android)
- JDK 11+ (para compilaciones Android)

### Instalación y Configuración

```bash
# Clonar el repositorio
git clone <repository-url>
cd UVA-App-Frontend

# Instalar dependencias
npm install

# Obtener configuración del backend de Amplify
amplify pull

# Sincronizar Capacitor con los proyectos nativos
npx cap sync
```

### Ejecutar en Modo Local

```bash
# Servidor de desarrollo (navegador web)
npm start
# o
ionic serve

# Ejecutar en emulador/dispositivo Android
ionic capacitor run android

# Abrir en Android Studio
ionic capacitor open android
```

### Compilar para Producción

```bash
# Compilar aplicación web
npm run build

# Compilar APK Android (debug)
npm run build-android-debug

# Compilar para Android en producción
ionic capacitor build android --prod
```

### Pruebas

```bash
# Ejecutar pruebas en modo watch
npm test

# Ejecutar pruebas en modo CI
npm run test:ci

# Ejecutar pruebas con cobertura
npm run test:dev
```

### Despliegue

La app está configurada para despliegue en Android con:
- **App ID**: `com.makesens.uvaapp`
- **Versión actual**: 2.1.6 (Código de versión: 7)

Los archivos de salida se generan en:
- Web: directorio `www/`
- Android: `android/app/build/outputs/`

## 🏗️ Arquitectura General

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────┐
│                   Aplicación Móvil                       │
│              (Angular 18 + Ionic 8 + Capacitor)         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Páginas   │  │ Componentes  │  │  Servicios   │  │
│  │              │  │              │  │              │  │
│  │ - Auth       │  │ - Charts     │  │ - API Layer  │  │
│  │ - Medición   │  │ - Calendario │  │ - Auth       │  │
│  │ - Histórico  │  │ - Alertas    │  │ - DataStore  │  │
│  │ - Perfil     │  │ - Moon Card  │  │ - Storage    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│              AWS Amplify DataStore (Offline)            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Servicios Cloud AWS (Backend)            │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ AppSync  │  │ Cognito  │  │    S3    │       │  │
│  │  │ GraphQL  │  │   Auth   │  │ Almacen. │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  │                                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Arquitectura de Componentes

- **Capa de Presentación**: Componentes de UI de Ionic con arquitectura standalone de Angular
- **Capa de Servicios**: Lógica de negocio organizada por dominio (API, Auth, Storage, View)
- **Capa de Datos**: AWS Amplify DataStore con estrategia offline-first
- **Capa Backend**: Servicios administrados de AWS (AppSync, Cognito, S3, DynamoDB)

### Patrones Arquitectónicos Clave

- **Offline-First**: Persistencia local de datos con sincronización en segundo plano
- **Orientado a Servicios**: Clara separación de responsabilidades entre capas de servicios
- **Programación Reactiva**: Observables RxJS para operaciones asíncronas
- **Componentes Standalone**: Arquitectura Angular moderna sin NgModules
- **Alias de Rutas**: Importaciones limpias usando `@app/*`, `@components/*`, etc.

## 🛠️ Tecnologías Principales

### Framework Frontend
- **Angular 18** - Framework de aplicaciones web
- **Ionic 8** - Componentes de UI móvil
- **Capacitor 6** - Puente de tiempo de ejecución nativo
- **TypeScript 5.5** - Lenguaje con tipado fuerte
- **RxJS 7.8** - Extensiones reactivas

### Backend y Nube
- **AWS Amplify 6.8** - Plataforma de integración backend
- **AWS AppSync** - API GraphQL administrada
- **AWS Cognito** - Autenticación y gestión de usuarios
- **AWS S3** - Almacenamiento de objetos
- **AWS DynamoDB** - Base de datos NoSQL (vía DataStore)

### UI y Visualización
- **Chart.js 4.4** - Visualización de datos
- **SweetAlert2** - Alertas personalizadas
- **Ionicons** - Biblioteca de íconos
- **SCSS** - Estilos con variables CSS

### Herramientas de Desarrollo
- **Karma + Jasmine** - Framework de pruebas
- **ESLint** - Linting de código (modo estricto)
- **Prettier** - Formateo de código
- **Husky** - Git hooks

### Compilación y Despliegue
- **Angular CLI** - Herramientas de compilación
- **Ionic CLI** - Desarrollo de apps móviles
- **Capacitor CLI** - Compilaciones nativas
- **Android Gradle** - Sistema de compilación Android

## 📚 Documentación

La documentación técnica detallada está disponible en la carpeta `/docs`:

- [Documentación de Arquitectura](./docs/architecture.md) - Diseño del sistema y detalles de componentes
- [Documentación de Funcionalidades](./docs/features.md) - Descripciones detalladas de funcionalidades y flujos de trabajo
- [Documentación de API](./docs/api.md) - Endpoints y operaciones de la API GraphQL
- [Documentación de Base de Datos](./docs/database.md) - Modelos de datos y relaciones
- [Documentación de Infraestructura](./docs/infrastructure.md) - Recursos y configuración de AWS

## 📄 Licencia

Copyright © MakeSens Apps

## 🤝 Contribuciones

Este es un repositorio privado. Contacta al equipo de desarrollo para conocer las pautas de contribución.

---

**Equipo de Desarrollo**: MakeSens Apps
**Última Versión**: 2.1.6 (Build 7)
**Requisitos Mínimos**: Node.js 20+, Android SDK para compilaciones móviles
