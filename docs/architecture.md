# Documentación de Arquitectura

## Arquitectura del Sistema

### Descripción General

UVA-App sigue una **arquitectura móvil híbrida** con una estrategia **offline-first**. La aplicación está construida con Angular e Ionic para el desarrollo móvil multiplataforma, con AWS Amplify que proporciona los servicios de backend y sincronización de datos.

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dispositivo Móvil                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           Capa de Presentación (Ionic UI)                   │ │
│  │  - Páginas de Autenticación  - Páginas de Medición          │ │
│  │  - Vistas Históricas         - Gestión de Perfil            │ │
│  │  - Calendario de Fases Lun.  - UI de Gamificación           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Capa de Servicios Angular                     │ │
│  │                                                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │   API    │  │   Auth   │  │ Storage  │  │   View   │  │ │
│  │  │ Servicios│  │ Servicios│  │ Servicios│  │ Servicios│  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │        AWS Amplify DataStore (Base de Datos Local)         │ │
│  │  - Persistencia offline de datos  - Resolución de conflictos│ │
│  │  - Sincronización en 2do plano    - Actualizaciones optimist.│ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                    │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS/WebSocket
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Cloud AWS                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   AppSync    │  │   Cognito    │  │      S3      │          │
│  │  (GraphQL)   │  │   (Auth)     │  │ (Almacen.)   │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                         │
│         ↓                                                         │
│  ┌──────────────┐                                                │
│  │  DynamoDB    │                                                │
│  │  (Base datos)│                                                │
│  └──────────────┘                                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Arquitectura de Componentes

### 1. Capa de Presentación

#### Páginas
Ubicadas en `src/app/pages/`, organizadas por funcionalidad:

- **Autenticación** (`auth/`):
  - Página de inicio de sesión con entrada de número de teléfono
  - Asistente de registro (multi-paso)
  - Página de verificación OTP

- **Medición** (`measurement/`):
  - Interfaz principal de seguimiento de mediciones
  - Formularios de completado de tareas
  - Validación en tiempo real

- **Histórico** (`historical/`):
  - Visualización de datos con Chart.js
  - Análisis de series temporales
  - Capacidades de filtrado y exportación

- **Perfil** (`profile/`):
  - Configuración y preferencias del usuario
  - Visualización de logros
  - Gestión de cuenta

- **Fase Lunar** (`moon-phase/`):
  - Vista del calendario lunar
  - Recomendaciones agrícolas

#### Componentes Reutilizables
Ubicados en `src/app/components/`:

- **alert**: Envoltorio de alerta personalizada usando SweetAlert2
- **areachart**: Componente de gráfico de área Chart.js para datos de series temporales
- **calendar**: Calendario personalizado con resaltado de tareas
- **header**: Cabecera compartida con navegación y marca
- **moon-card**: Tarjeta de visualización de fase lunar
- **progress-bar**: Visualización del progreso de gamificación

### 2. Capa de Servicios

Organizada por dominio en `src/app/core/services/`:

#### Servicios de API (`api/`)
- **uva-api.service.ts**: Operaciones CRUD de UVA (viñedo)
- **user-api.service.ts**: Gestión de perfil de usuario
- **racimo-api.service.ts**: Operaciones de proyecto/clúster
- **moon-phase-api.service.ts**: Obtención de datos lunares

#### Servicios de Autenticación (`auth/`)
- Validación de número de teléfono
- Verificación OTP
- Gestión de tokens de sesión
- Manejo de MFA

#### Servicios de Almacenamiento (`storage/`)
- **datastore/**: Servicios envolventes de AWS DataStore
- **s3/**: Carga/descarga de archivos en S3
- **file-system/**: Integración del sistema de archivos de Capacitor

#### Servicios de Vista (`view/`)
- **gamification/**: Cálculo de progreso y lógica de logros
- **moon/**: Cálculos de fases lunares
- **setup/**: Inicialización y configuración de la app

### 3. Capa de Datos

#### AWS Amplify DataStore
- Sincronización offline automática
- Actualizaciones optimistas de la UI
- Resolución de conflictos con versionado
- Suscripciones en tiempo real vía WebSocket

#### Modelos
Ubicados en `src/models/`:
- Autogenerados desde el esquema GraphQL
- Interfaces TypeScript con tipado fuerte
- Operaciones CRUD incorporadas

## Flujo de Datos

### Flujo Offline-First

```
Acción del Usuario
    ↓
Componente Angular
    ↓
Capa de Servicios (Lógica de Negocio)
    ↓
API de DataStore (Guardar localmente)
    ↓
IndexedDB Local ────────→ Actualización de UI (Optimista)
    ↓
Sincronización en 2do plano (cuando hay conexión)
    ↓
AWS AppSync (GraphQL)
    ↓
DynamoDB
    ↓
Respuesta de Sincronización ──→ Resolución de Conflictos (si es necesario)
    ↓
Actualización Final de UI
```

### Flujo de Autenticación

```
1. El usuario ingresa el número de teléfono
   ↓
2. Cognito envía SMS OTP
   ↓
3. El usuario ingresa el código OTP
   ↓
4. Cognito valida y emite tokens
   ↓
5. La app almacena la sesión (almacenamiento seguro)
   ↓
6. Amplify se configura con las credenciales del usuario
   ↓
7. DataStore sincroniza los datos del usuario
   ↓
8. El usuario es redirigido a inicio/pestañas
```

### Flujo de Envío de Medición

```
El usuario selecciona una tarea
   ↓
Validación del formulario (restricciones horarias, validación de campos)
   ↓
Guardar en DataStore (local-first)
   ↓
UI actualizada inmediatamente (optimista)
   ↓
Sincronización en 2do plano con AppSync
   ↓
Mutación GraphQL a DynamoDB
   ↓
Actualizar progreso del usuario (gamificación)
   ↓
Sincronizar de vuelta al dispositivo
```

## Integraciones Externas

### Servicios AWS

1. **AWS AppSync**
   - Endpoint de API GraphQL
   - Suscripciones en tiempo real
   - API administrada con autorización
   - Región: us-east-1

2. **AWS Cognito**
   - Pool de usuarios para autenticación
   - Número de teléfono como nombre de usuario
   - Entrega de SMS OTP
   - Cumplimiento de MFA
   - Gestión de sesiones

3. **AWS S3**
   - Almacenamiento de fotos de perfil
   - Adjuntos de mediciones
   - Buckets públicos y privados

4. **AWS DynamoDB**
   - Almacén de datos principal (vía AppSync)
   - Escalado automático
   - Índices secundarios globales

5. **AWS Analytics (Pinpoint)**
   - Seguimiento de sesiones
   - Analíticas de vistas de página
   - Seguimiento de eventos personalizados

### Servicios de Terceros

1. **API de Fases Lunares**
   - API externa para cálculos lunares
   - Almacenada en caché localmente para acceso offline
   - Servicio: `moon-phase-api.service.ts`

2. **Proveedor de SMS**
   - Entrega de SMS vía Cognito
   - Códigos de verificación OTP

## Patrones de Diseño

### 1. Arquitectura Orientada a Servicios
Toda la lógica de negocio está encapsulada en servicios inyectables, promoviendo:
- Separación de responsabilidades
- Facilidad de pruebas
- Reutilización
- Mantenibilidad

### 2. Programación Reactiva
Uso de observables RxJS para:
- Operaciones asíncronas
- Flujos de eventos
- Transformación de datos
- Manejo de errores

### 3. Componentes Standalone
Arquitectura Angular moderna:
- No se requieren NgModules
- Inyección de dependencias directa
- Bundles con tree-shaking
- Rendimiento mejorado

### 4. Patrón Repositorio
Los servicios de DataStore actúan como repositorios:
- Abstracción de los detalles de la fuente de datos
- API consistente entre modelos
- Lógica de caché centralizada

### 5. UI Optimista
Actualizar la UI inmediatamente, sincronizar en segundo plano:
- Mejor experiencia de usuario
- Funcionalidad offline
- Resolución de conflictos en segundo plano

## Organización del Código

### Alias de Rutas
Configurados en `tsconfig.json`:
```typescript
@app/*          → src/app/*
@components/*   → src/app/components/*
@pages/*        → src/app/pages/*
@service/*      → src/app/core/services/*
@storage/*      → src/app/core/services/storage/*
@interfaces/*   → src/app/Interfaces/*
```

### Estructura de Módulos
```
src/app/
├── components/       # Componentes de UI compartidos
├── pages/           # Páginas a nivel de ruta
├── core/
│   ├── services/    # Servicios de lógica de negocio
│   └── pipes/       # Pipes personalizados de Angular
├── Interfaces/      # Interfaces TypeScript
└── app.routes.ts    # Configuración de rutas
```

## Arquitectura de Seguridad

### Autenticación
- Autenticación basada en teléfono (sin contraseñas)
- Verificación por SMS OTP
- Cumplimiento de MFA
- Almacenamiento seguro de tokens vía Capacitor SecureStorage

### Autorización
- Acceso a datos con alcance por usuario
- Autorización basada en propietario en GraphQL
- Almacenamiento privado de archivos en S3

### Protección de Datos
- HTTPS para todas las llamadas a la API
- Almacenamiento local cifrado
- DOMPurify para saneamiento de HTML
- Política de Seguridad de Contenido estricta

### Seguridad del Código
- Reglas estrictas de ESLint (sin tipos `any`)
- Modo estricto de TypeScript
- Validación de entrada en formularios
- Saneamiento de salida

## Optimizaciones de Rendimiento

### 1. Carga Diferida (Lazy Loading)
- Rutas cargadas de forma diferida por página
- Componentes cargados bajo demanda
- Reducción del tamaño del bundle inicial

### 2. Estrategia de Caché
- DataStore almacena en caché todos los datos sincronizados
- Archivos de S3 en caché en el sistema de archivos local
- Datos de fases lunares en caché para uso offline

### 3. Optimización del Bundle
- Tree-shaking mediante componentes standalone
- Minificación en compilación de producción
- Compilación AOT (Ahead-of-Time)
- Límite de tamaño de bundle de 7MB

### 4. Optimización de Imágenes
- Carga diferida de imágenes
- Imágenes responsivas
- Soporte de formato WebP (vía Capacitor)

## Consideraciones de Escalabilidad

### Escalabilidad Frontend
- Componentes standalone para mejor tree-shaking
- Service workers para capacidades offline
- Estrategias eficientes de detección de cambios

### Escalabilidad Backend
- Los servicios administrados de AWS escalan automáticamente
- AppSync maneja conexiones concurrentes
- Modo de capacidad bajo demanda de DynamoDB
- Almacenamiento ilimitado en S3

### Sincronización de Datos
- Sincronización incremental (solo registros modificados)
- Paginación para grandes conjuntos de datos
- Sincronización selectiva (solo datos del usuario)

## Arquitectura de Pruebas

### Pruebas Unitarias
- Framework de pruebas Karma + Jasmine
- Más de 56 archivos de prueba (`.spec.ts`)
- Capa de servicios completamente comprobable
- Datos simulados para pruebas offline

### Configuración de Pruebas
- Chrome Headless para CI/CD
- Firefox Headless como alternativa
- Reportes de cobertura (Istanbul)
- Ejecución automática de pruebas en cada commit

## Arquitectura de Compilación y Despliegue

### Proceso de Compilación
```
Código Fuente (TypeScript/SCSS)
    ↓
Compilador Angular (AOT)
    ↓
Empaquetado con Webpack
    ↓
Minificación y Optimización
    ↓
Build Web (www/)
    ↓
Copia a Capacitor
    ↓
Proyecto Nativo (android/)
    ↓
Compilación con Gradle
    ↓
Salida APK/AAB
```

### Configuración de Entornos
- `environment.ts`: Configuración de desarrollo
- `environment.prod.ts`: Configuración de producción
- Configuración de Amplify en tiempo de ejecución
- Indicadores de características en tiempo de compilación

### Objetivos de Despliegue
- Web: Alojamiento estático (directorio `www/`)
- Android: Google Play Store (APK/AAB)
- iOS potencial: Apple App Store (futuro)

## Monitoreo y Analíticas

### Monitoreo de la Aplicación
- Integración de AWS Analytics (Pinpoint)
- Seguimiento de sesiones
- Seguimiento de vistas de página
- Seguimiento de eventos personalizados

### Seguimiento de Errores
- Registro de errores en consola
- Manejo de errores de sincronización en DataStore
- Recuperación ante fallos de red

### Monitoreo de Rendimiento
- Perfilado de rendimiento de Angular
- Métricas de sincronización de DataStore
- Seguimiento del tiempo de respuesta de la API
