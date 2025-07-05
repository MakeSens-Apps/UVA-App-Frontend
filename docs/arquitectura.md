# Arquitectura de UVA App

## Resumen Ejecutivo

UVA App es una aplicación móvil híbrida desarrollada con **Ionic/Angular** que se enfoca en la medición y monitoreo de radiación UV. La aplicación utiliza **AWS Amplify** como backend y **Capacitor** para la funcionalidad nativa móvil.

## Stack Tecnológico

### Frontend
- **Framework**: Angular 18.0.0
- **UI Framework**: Ionic 8.0.0
- **Lenguaje**: TypeScript 5.5.4
- **Plataforma Móvil**: Capacitor 6.1.2

### Backend y Servicios
- **Backend as a Service**: AWS Amplify 6.8.2
- **Base de Datos**: AWS AppSync + DynamoDB (GraphQL)
- **Autenticación**: AWS Amplify Auth
- **APIs**: GraphQL generadas automáticamente

### Herramientas de Desarrollo
- **Testing**: Jasmine + Karma
- **Linting**: ESLint con Angular ESLint
- **Formatting**: Prettier
- **Build**: Angular CLI + Ionic CLI

## Arquitectura General

### Arquitectura de Capas

```
┌─────────────────────────────────────┐
│        Presentation Layer           │
│     (Ionic/Angular Components)      │
├─────────────────────────────────────┤
│         Business Layer              │
│      (Services & Interfaces)       │
├─────────────────────────────────────┤
│         Data Layer                  │
│    (AWS Amplify/GraphQL APIs)      │
├─────────────────────────────────────┤
│        Infrastructure              │
│      (AWS Backend Services)        │
└─────────────────────────────────────┘
```

### Patrón de Arquitectura
La aplicación sigue el patrón **Feature-Based Architecture** con separación clara de responsabilidades:

- **Componentes de UI**: Responsables de la presentación
- **Servicios**: Manejo de lógica de negocio y comunicación con APIs
- **Modelos**: Definición de interfaces y tipos de datos
- **Core**: Servicios centrales y utilitarios compartidos

## Estructura de Directorios

```
src/
├── app/
│   ├── components/          # Componentes reutilizables
│   ├── core/               # Servicios centrales
│   │   ├── services/       # Servicios de autenticación y API
│   │   └── pipes/          # Pipes personalizados
│   ├── pages/              # Páginas de la aplicación
│   │   ├── auth/           # Autenticación
│   │   ├── home/           # Página principal
│   │   ├── measurement/    # Mediciones UV
│   │   ├── historical/     # Datos históricos
│   │   ├── moon-phase/     # Fases lunares
│   │   ├── profile/        # Perfil de usuario
│   │   ├── splash-animation/ # Pantalla de carga
│   │   └── tabs/           # Navegación por pestañas
│   ├── services/           # Servicios específicos
│   │   └── notification/   # Notificaciones
│   └── Interfaces/         # Definiciones de tipos
├── assets/                 # Recursos estáticos
├── environments/           # Configuraciones de entorno
├── graphql/               # Esquemas GraphQL
├── icons/                 # Iconos de la aplicación
├── models/                # Modelos de datos
└── theme/                 # Estilos globales
```

## Componentes Principales

### 1. Capa de Presentación
- **Páginas**: Implementadas como componentes Angular standalone
- **Componentes**: Reutilizables siguiendo el patrón de diseño de Ionic
- **Navegación**: Sistema de tabs con routing de Angular

### 2. Capa de Servicios

#### Servicios Core
- **AuthService**: Manejo de autenticación con AWS Amplify
- **UvaApiService**: Comunicación con APIs de medición UV
- **NotificationService**: Gestión de notificaciones locales

#### Pipes
- **SafeHtmlPipe**: Sanitización de contenido HTML

### 3. Capa de Datos
- **GraphQL**: APIs generadas automáticamente por Amplify
- **DataStore**: Sincronización offline/online automática
- **Modelos**: Definidos mediante esquemas GraphQL

## Flujo de Datos

### Patrón de Comunicación
1. **Componente** → **Servicio** → **API GraphQL** → **AWS Backend**
2. **AWS Backend** → **GraphQL Subscription** → **Servicio** → **Componente**

### Gestión de Estado
- **Servicios**: Actúan como stores para el estado de la aplicación
- **RxJS**: Manejo de streams de datos asíncronos
- **Amplify DataStore**: Sincronización automática de datos

## Funcionalidades Principales

### 1. Autenticación
- Login/Registro de usuarios
- Gestión de sesiones
- Recuperación de contraseñas

### 2. Medición UV
- Captura de datos de radiación UV
- Visualización en tiempo real
- Almacenamiento de mediciones

### 3. Datos Históricos
- Visualización de gráficos con Chart.js
- Filtros por fechas
- Exportación de datos

### 4. Fases Lunares
- Cálculo y visualización de fases lunares
- Correlación con mediciones UV

### 5. Notificaciones
- Alertas de radiación UV
- Recordatorios de medición
- Notificaciones push

## Arquitectura de Capacitor

### Plugins Utilizados
- **@capacitor/app**: Gestión del ciclo de vida de la app
- **@capacitor/device**: Información del dispositivo
- **@capacitor/local-notifications**: Notificaciones locales
- **@capacitor/network**: Estado de conectividad
- **@capacitor/preferences**: Almacenamiento local
- **@capacitor/share**: Compartir contenido

### Plataformas Soportadas
- **Android**: Configuración en `/android`
- **Web**: Deployment como PWA
- **iOS**: Potencial soporte futuro

## AWS Amplify Backend

### Servicios Configurados
- **Authentication**: Cognito User Pools
- **API**: AppSync GraphQL
- **Storage**: S3 para archivos multimedia
- **Functions**: Lambda functions para lógica personalizada

### Configuración de GraphQL Transformer
- **Versión**: 2.0
- **Características habilitadas**:
  - Auto-indexing de queries
  - Mejoras de seguridad
  - Subscriptions en tiempo real

## Consideraciones de Seguridad

### Autenticación
- JWT tokens manejados por AWS Cognito
- Renovación automática de tokens
- Logout seguro

### Autorización
- Reglas de acceso basadas en GraphQL
- Validación de permisos en el backend
- Sanitización de datos de entrada

## Performance y Optimización

### Estrategias Implementadas
- **Lazy Loading**: Carga bajo demanda de módulos
- **OnPush Change Detection**: Optimización de Angular
- **Tree Shaking**: Eliminación de código no utilizado
- **Code Splitting**: División de bundles

### Métricas de Performance
- **Budget de bundle**: 7MB máximo
- **Tamaño de componentes**: 7KB máximo

## Testing

### Estrategia de Testing
- **Unit Tests**: Jasmine + Karma
- **Configuración**: Karma con headless Chrome
- **Coverage**: Reportes de cobertura automáticos

### Herramientas
- **Test Runner**: Karma
- **Framework**: Jasmine
- **Browser**: Chrome Headless para CI

## Deployment y CI/CD

### Ambientes
- **Development**: Desarrollo local
- **Production**: Deployment automático

### Scripts de Build
- `npm run build`: Build de producción
- `npm run build-android-debug`: Build para Android
- `npm run amplify-push`: Deploy de backend

## Mantenimiento y Escalabilidad

### Buenas Prácticas Implementadas
- **Modularización**: Separación clara de responsabilidades
- **Interfaces**: Tipado fuerte con TypeScript
- **Linting**: Reglas estrictas de código
- **Documentación**: Código autodocumentado

### Escalabilidad
- **Horizontal**: Capacidad de agregar nuevas funcionalidades
- **Vertical**: Optimización de performance
- **Multi-plataforma**: Soporte para web, Android e iOS

## Próximos Pasos Recomendados

1. **Testing**: Incrementar cobertura de pruebas
2. **Performance**: Implementar métricas de rendimiento
3. **Monitoring**: Agregar logging y analytics
4. **Internacionalización**: Soporte multi-idioma
5. **Accessibility**: Mejoras de accesibilidad

## Bug Crítico: Autenticación Offline (Resuelto)

### Problema Identificado
- **Síntoma**: La aplicación redirige al login después de estar offline por más de 12 horas
- **Causa Raíz**: `SyncMonitorDSService.waitForSyncDataStore()` bloquea indefinidamente cuando los tokens han expirado offline
- **Impacto**: Usuarios no pueden usar la app offline por períodos prolongados

### Solución Implementada

#### 1. **Timeout en Splash Animation**
- Agregado timeout de 10 segundos a `waitForSyncDataStore()`
- Manejo graceful de errores de sincronización
- Continúa la app en modo offline si DataStore no puede sincronizar

#### 2. **Mejora en SyncMonitorDSService**
- Agregado parámetro `timeout` (default: 15 segundos)
- Logging mejorado para debugging
- Previene espera infinita en escenarios offline

#### 3. **Método de Autenticación Offline**
- Nuevo método `CurrentAuthenticatedUserOffline()` en AuthService
- Manejo específico de errores de red
- Validación local de tokens cuando es posible

### Archivos Modificados
- `src/app/pages/splash-animation/splash-animation.page.ts`
- `src/app/core/services/storage/datastore/sync-monitor-ds.service.ts`
- `src/app/core/services/auth/auth.service.ts`

### Testing Requerido
1. **Escenario 1**: App offline por 12+ horas con tokens expirados
2. **Escenario 2**: App con conectividad intermitente
3. **Escenario 3**: App online con DataStore funcionando normalmente

## Contacto y Contribución

Este documento debe actualizarse regularmente conforme evolucione la arquitectura de la aplicación.

---

*Documento generado automáticamente - Última actualización: $(date)* 