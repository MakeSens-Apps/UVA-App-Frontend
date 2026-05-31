# Módulos y Estructura — UVA-App Frontend

---

## Estructura de Directorios

```
UVA-App-Frontend/
├── src/
│   ├── app/
│   │   ├── components/              # Componentes de UI reutilizables
│   │   │   ├── alert/               # Envoltorio de alerta (SweetAlert2)
│   │   │   ├── areachart/           # Gráfico de área (Chart.js)
│   │   │   ├── calendar/            # Calendario con resaltado de tareas
│   │   │   ├── header/              # Cabecera compartida con navegación
│   │   │   ├── moon-card/           # Tarjeta de visualización lunar
│   │   │   └── progress-bar/        # Barra de progreso de gamificación
│   │   ├── pages/                   # Páginas a nivel de ruta
│   │   │   ├── auth/                # Autenticación (login, registro, OTP)
│   │   │   ├── measurement/         # Registro de mediciones diarias
│   │   │   ├── historical/          # Visualización de datos históricos
│   │   │   ├── profile/             # Perfil, logros, configuración
│   │   │   └── moon-phase/          # Calendario de fases lunares
│   │   ├── core/
│   │   │   ├── services/            # Servicios de lógica de negocio
│   │   │   │   ├── api/             # Servicios de API (CRUD por entidad)
│   │   │   │   ├── auth/            # Servicios de autenticación
│   │   │   │   ├── storage/
│   │   │   │   │   ├── datastore/   # Servicios envolventes de DataStore
│   │   │   │   │   ├── s3/          # Carga/descarga S3
│   │   │   │   │   └── file-system/ # Sistema de archivos Capacitor
│   │   │   │   └── view/
│   │   │   │       ├── gamification/ # Cálculo de progreso y logros
│   │   │   │       ├── moon/        # Cálculos de fases lunares
│   │   │   │       └── setup/       # Inicialización de la app
│   │   │   └── pipes/               # Pipes personalizados de Angular
│   │   ├── Interfaces/              # Interfaces TypeScript
│   │   └── app.routes.ts            # Configuración de rutas
│   ├── models/                      # Modelos DataStore (autogenerados desde GraphQL)
│   ├── graphql/                     # Operaciones GraphQL generadas
│   │   ├── queries.ts               # Consultas GraphQL
│   │   ├── mutations.ts             # Mutaciones GraphQL
│   │   └── subscriptions.ts         # Suscripciones GraphQL
│   ├── API.ts                       # Tipos TypeScript autogenerados de AppSync
│   ├── environments/
│   │   ├── environment.ts           # Configuración de desarrollo
│   │   └── environment.prod.ts      # Configuración de producción
│   └── assets/                      # Assets estáticos (íconos, imágenes)
├── amplify/                         # Configuración del backend AWS Amplify
│   ├── backend/
│   │   └── api/<api-name>/
│   │       └── schema.graphql       # Esquema GraphQL autoritativo
│   ├── cli.json                     # Indicadores de características Amplify
│   └── team-provider-info.json      # Configuraciones por entorno
├── android/                         # Proyecto nativo Android (Capacitor)
├── capacitor.config.ts              # Configuración de Capacitor
├── angular.json                     # Configuración de Angular CLI
└── package.json                     # Dependencias del proyecto
```

---

## Alias de Rutas (`tsconfig.json`)

| Alias | Resuelve a |
|-------|-----------|
| `@app/*` | `src/app/*` |
| `@components/*` | `src/app/components/*` |
| `@pages/*` | `src/app/pages/*` |
| `@service/*` | `src/app/core/services/*` |
| `@storage/*` | `src/app/core/services/storage/*` |
| `@interfaces/*` | `src/app/Interfaces/*` |

---

## Módulo: Servicios de API (`src/app/core/services/api/`)

**Responsabilidades:**
- Centralizar todas las operaciones de datos contra AWS Amplify DataStore
- Abstraer la fuente de datos (local vs. remota)
- Tipado estricto de requests y responses con interfaces TypeScript

### Servicios expuestos

| Servicio | Entidad | Operaciones |
|---------|---------|-------------|
| `uva-api.service.ts` | UVA (Unidad Agrícola) | CRUD de UVA, configuración de campos |
| `user-api.service.ts` | Usuario | Perfil, logros, gestión de cuenta |
| `racimo-api.service.ts` | RACIMO (Proyecto/Clúster) | Crear/unirse, código de vinculación |
| `moon-phase-api.service.ts` | Fase Lunar | Obtención y caché de datos lunares |

**Patrón de uso con DataStore:**

```typescript
import { DataStore } from 'aws-amplify/datastore';
import { Measurement } from '@/models';

// Crear medición
const newMeasurement = await DataStore.save(
  new Measurement({
    type: 'temperature',
    data: JSON.stringify({ value: 23.5, unit: 'celsius' }),
    ts: new Date().toISOString(),
    task: 'daily-temp-check',
    uvaID: 'uva-123'
  })
);

// Consultar mediciones con filtro y orden
const measurements = await DataStore.query(
  Measurement,
  m => m.and(m => [
    m.uvaID.eq('uva-123'),
    m.ts.gt('2025-01-01T00:00:00.000Z')
  ]),
  {
    sort: s => s.ts('DESCENDING'),
    limit: 50
  }
);

// Suscribirse a cambios en tiempo real
const subscription = DataStore.observe(Measurement).subscribe(msg => {
  console.log('Measurement changed:', msg.model, msg.opType);
});
```

---

## Módulo: Páginas / Rutas

### Ruta `auth/` — Autenticación

**Páginas:** `src/app/pages/auth/`

**Propósito:** Sistema de autenticación seguro basado en teléfono con verificación por SMS OTP

**Páginas incluidas:**

| Página | Descripción |
|--------|-------------|
| Inicio de sesión | Entrada de número de teléfono |
| Registro (multi-paso) | Asistente de creación de cuenta |
| Verificación OTP | Ingreso y validación del código SMS |

**Flujo:**
1. Ingreso de número de teléfono → validación de formato
2. Cognito envía SMS OTP de 6 dígitos
3. Validación del código OTP
4. Opción: Unirse a RACIMO (código de vinculación) o Crear nuevo RACIMO
5. Completar información del perfil → navegar a inicio

---

### Ruta `measurement/` — Registro de Mediciones

**Páginas:** `src/app/pages/measurement/`

**Propósito:** Funcionalidad central para la recolección de datos agrícolas en series temporales

**Datos que carga:**

| Dato | Servicio | Descripción |
|------|---------|-------------|
| Tareas disponibles | `uva-api.service.ts` | Tareas configuradas para la UVA actual |
| Progreso del día | `gamification.service.ts` | Semillas y rachas del día actual |
| Última medición | DataStore | Prevención de duplicados |

**Componentes utilizados:**

| Componente | Propósito |
|------------|-----------|
| `<app-header />` | Cabecera de navegación |
| `<app-progress-bar />` | Visualización del progreso de gamificación |
| `<app-alert />` | Confirmaciones y mensajes de error |

---

### Ruta `historical/` — Datos Históricos

**Páginas:** `src/app/pages/historical/`

**Propósito:** Visualización y análisis de datos de medición históricos

**Datos que carga:**

| Dato | Servicio | Descripción |
|------|---------|-------------|
| Mediciones por rango | DataStore GSI `byUVAandTs` | Series temporales filtradas por fecha |
| Datos de progreso | DataStore GSI `byUserAndDate` | Rachas y semillas históricas |

**Componentes utilizados:**

| Componente | Propósito |
|------------|-----------|
| `<app-areachart />` | Gráficos de área para series temporales |
| `<app-calendar />` | Selector de rango de fechas |

---

### Ruta `profile/` — Perfil y Configuración

**Páginas:** `src/app/pages/profile/`

**Propósito:** Gestión del perfil de usuario, logros y configuración de la app

**Datos que carga:**

| Dato | Servicio | Descripción |
|------|---------|-------------|
| Perfil de usuario | `user-api.service.ts` | Nombre, teléfono, email, rango |
| Datos de UVA | `uva-api.service.ts` | Ubicación y configuración del viñedo |
| Datos de RACIMO | `racimo-api.service.ts` | Nombre y código de vinculación del proyecto |
| Logros y semillas | DataStore `UserProgress` | Historial de gamificación |

---

### Ruta `moon-phase/` — Fase Lunar

**Páginas:** `src/app/pages/moon-phase/`

**Propósito:** Calendario agrícola basado en ciclos lunares con recomendaciones

**Datos que carga:**

| Dato | Servicio | Descripción |
|------|---------|-------------|
| Fase lunar actual | `moon-phase-api.service.ts` | Fase, iluminación, próximas fechas |
| Calendario mensual | `moon.service.ts` | Fases del mes completo |

**Componentes utilizados:**

| Componente | Propósito |
|------------|-----------|
| `<app-moon-card />` | Visualización de la fase lunar actual |
| `<app-calendar />` | Calendario mensual con indicadores de fase |

---

## Módulo: Componentes Reutilizables (`src/app/components/`)

### `<app-alert />`

**Archivo:** `src/app/components/alert/`

**Propósito:** Envoltorio personalizado sobre SweetAlert2 para alertas y confirmaciones coherentes con el diseño de la app

---

### `<app-areachart />`

**Archivo:** `src/app/components/areachart/`

**Propósito:** Envoltorio sobre Chart.js 4.4 para gráficos de área de series temporales

**Props principales:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `data` | `ChartDataset[]` | Datos a visualizar |
| `labels` | `string[]` | Etiquetas del eje X (fechas) |
| `options` | `ChartOptions` | Opciones de configuración de Chart.js |

---

### `<app-calendar />`

**Archivo:** `src/app/components/calendar/`

**Propósito:** Calendario personalizado con resaltado de tareas y fases lunares

---

### `<app-header />`

**Archivo:** `src/app/components/header/`

**Propósito:** Cabecera compartida con navegación y marca de MakeSens

---

### `<app-moon-card />`

**Archivo:** `src/app/components/moon-card/`

**Propósito:** Tarjeta de visualización de la fase lunar actual con ícono y datos de iluminación

---

### `<app-progress-bar />`

**Archivo:** `src/app/components/progress-bar/`

**Propósito:** Visualización del progreso de gamificación (semillas, racha, hitos)

---

## Módulo: Modelos (`src/models/`)

Los modelos son **autogenerados** desde el esquema GraphQL de Amplify. No deben editarse manualmente.

**Modelos disponibles:**

| Modelo | Tabla DynamoDB |
|--------|---------------|
| `RACIMO` | Proyectos / clústeres |
| `UVA` | Unidades agrícolas |
| `User` | Perfiles de usuario |
| `Measurement` | Mediciones en series temporales |
| `UserProgress` | Progreso de gamificación |

**Regenerar modelos:**

```bash
amplify codegen models
```

---

## Módulo: Configuración de Rutas (`src/app/app.routes.ts`)

La app usa **lazy loading** por ruta para reducir el tamaño del bundle inicial:

```typescript
// Patrón de lazy loading en Angular 18 standalone
export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth.page').then(m => m.AuthPage)
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'measurement',
        loadComponent: () => import('./pages/measurement/measurement.page').then(m => m.MeasurementPage)
      },
      // ...resto de rutas
    ]
  }
];
```

---

## Módulo: Gamificación (`src/app/core/services/view/gamification/`)

**Servicio:** `gamification.service.ts`

**Responsabilidades:**
- Calcular semillas ganadas por medición
- Mantener el contador de racha diaria
- Detectar y desbloquear hitos (Bronce, Plata, Oro, Platino)
- Gestionar tareas bonus semanales
- Actualizar modelo `UserProgress` en DataStore

**Lógica de semillas:**
- Semilla por cada medición completada
- Semillas bonus por racha consecutiva
- Semillas bonus por semana perfecta (todas las tareas)
- Semillas bonus por completar en horario temprano

---

## Módulo: Sincronización DataStore

**Intervalo de sincronización:** Tiempo real (WebSocket) + periódico (60 segundos)

**Modelos sincronizados:** RACIMO, UVA, Usuario, Medición, ProgresoUsuario

**Estrategia de resolución de conflictos:** Fusión automática (Auto-Merge) — el servidor tiene prioridad

**Sincronización incremental:** Solo se transfieren los registros modificados desde la última sincronización (`_lastChangedAt`)
