# UVA App — Contexto de la aplicación

## Qué hace la app

**UVA** es una aplicación móvil para la recolección y monitoreo de datos ambientales comunitarios. Los usuarios son colaboradores de campo que registran mediciones del entorno (temperatura, humedad, lluvia) desde su celular. Cada usuario pertenece a un **RACIMO** (grupo/proyecto) al que se vincula durante el registro.

La app funciona **sin conexión** y sincroniza los datos en segundo plano cuando hay red disponible.

### Flujos principales

**Autenticación**
- Registro con número de celular → vinculación a un RACIMO → perfil listo
- Login con número de celular → verificación por SMS (OTP) → home

**Registro de mediciones**
- El usuario selecciona el tipo de medición, sigue una guía paso a paso y envía la lectura
- Cada medición queda asociada a la fecha, el usuario y su RACIMO

**Histórico**
- Vista de mediciones pasadas con filtros por rango de tiempo
- Detalle por medición con gráfica de área

**Fase lunar**
- Tarjeta con la fase lunar actual; página dedicada con detalle del ciclo

**Gamificación**
- Sistema de logros y rachas para incentivar la participación continua
- Alertas de progreso y notificaciones de hitos

**Perfil**
- Información personal, logros, configuración de la cuenta y sincronización manual

---

## Estructura de carpetas (`src/`)

```
src/
├── main.ts                        # Punto de entrada
├── index.html
├── global.scss                    # Estilos globales
├── polyfills.ts
│
├── environments/                  # Variables de entorno (dev / prod)
│
├── theme/                         # Tokens de diseño globales
│   ├── variables.scss             #   Colores, tipografías, espaciados
│   └── mixins.scss
│
├── models/                        # Modelos de datos de negocio
│   ├── session.model.ts           #   Sesión del usuario autenticado
│   ├── schema.js / schema.d.ts    #   Esquema del almacén local sincronizado
│   └── configuration/
│       ├── config.model.ts        #   Configuración persitida del dispositivo
│       ├── colors.model.ts
│       └── measurements.model.ts  #   Tipos y configuración de mediciones
│
├── graphql/                       # Contratos con el backend (queries, mutations, subscriptions)
│
├── assets/
│   ├── fonts/                     #   Tipografías
│   ├── icons/                     #   Íconos de la app (varios tamaños)
│   └── images/                    #   Ilustraciones, logos, fases lunares, animaciones
│
└── app/
    ├── app.routes.ts              # Definición de rutas raíz
    ├── app.component.*            # Shell de la aplicación
    │
    ├── Interfaces/                # Contratos de tipo compartidos entre capas
    │   ├── IMeasurement.ts
    │   └── ITask.ts
    │
    ├── explore-container/         # Componente layout base (wrappea el contenido de cada página)
    │
    ├── components/                # Componentes de UI reutilizables
    │   ├── alert/                 #   Modal de confirmación genérico
    │   ├── areachart/             #   Gráfica de área para series temporales
    │   ├── calendar/              #   Calendario interactivo
    │   │   └── day/               #     Celda de día individual
    │   ├── environmental-report/  #   Tarjeta/tabla de reporte ambiental
    │   ├── header/                #   Cabecera de pantalla
    │   ├── moon-card/             #   Tarjeta de fase lunar
    │   └── progress-bar/         #   Barra de progreso de gamificación
    │
    ├── core/                      # Lógica de negocio y acceso a datos
    │   ├── pipes/
    │   │   └── safe-html.pipe.ts  #   Renderizado seguro de HTML dinámico
    │   │
    │   └── services/
    │       ├── auth/              #   Autenticación: sign-in, sign-up, OTP, sesión
    │       │   └── test-users.service.ts
    │       │
    │       ├── session/           #   Estado de sesión del usuario activo
    │       │
    │       ├── minimize/          #   Comportamiento al minimizar la app
    │       │
    │       ├── api/               #   Llamadas al backend remoto
    │       │   ├── errors-handle/ #     Manejo centralizado de errores de API
    │       │   ├── moon-phase-api.service.ts
    │       │   ├── racimo-api.service.ts
    │       │   ├── user-api.service.ts
    │       │   ├── user-progress-api.service.ts
    │       │   └── uva-api.service.ts
    │       │
    │       ├── storage/           #   Persistencia de datos
    │       │   ├── configuration-app.service.ts  # Config del dispositivo
    │       │   ├── datastore/     #   Almacén local con sincronización en la nube
    │       │   │   ├── measurement-ds.service.ts
    │       │   │   ├── racimo-ds.service.ts
    │       │   │   ├── uva-ds.service.ts
    │       │   │   ├── user-ds.service.ts
    │       │   │   ├── user-progress-ds.service.ts
    │       │   │   ├── gamification-event-ds.service.ts
    │       │   │   └── sync-monitor-ds.service.ts  # Estado de sincronización
    │       │   ├── file-system/   #   Archivos locales del dispositivo
    │       │   └── s3/            #   Almacenamiento en la nube
    │       │
    │       └── view/              #   Lógica específica de cada pantalla/flujo
    │           ├── app-usage.service.ts
    │           ├── environmental-report.service.ts
    │           ├── share.service.ts
    │           ├── gamification/
    │           │   ├── gamification.service.ts          # Cálculo de logros y rachas
    │           │   ├── gamification-alerts.service.ts   # Disparadores de alertas
    │           │   ├── gamification-alerts-types.service.ts
    │           │   └── notification.service.ts
    │           ├── moon/
    │           │   └── moon-phase.service.ts            # Cálculo de fase lunar
    │           └── setup/
    │               ├── setup.service.ts                 # Inicialización de sesión y usuario
    │               └── setup-racimo.service.ts          # Vinculación a RACIMO/UVA
    │
    ├── pages/                     # Pantallas de la aplicación
    │   ├── splash-animation/      #   Pantalla de arranque
    │   │
    │   ├── tabs/                  #   Navegación principal por pestañas (home / measurement / historical / profile)
    │   │
    │   ├── auth/                  #   Flujo de autenticación
    │   │   ├── login/             #     Ingreso con número de celular
    │   │   ├── otp/               #     Verificación por código SMS
    │   │   │   └── validate-code/ #       Pantalla de confirmación post-OTP
    │   │   └── register/          #     Flujo de registro
    │   │       ├── pre-register/
    │   │       ├── set-phone-register/
    │   │       ├── project-vinculation/       # Vinculación a un RACIMO existente
    │   │       ├── project-vinculation-done/
    │   │       ├── validate-project/
    │   │       ├── register-project-form/     # Creación de nuevo proyecto
    │   │       ├── register-completed/
    │   │       └── register-success/
    │   │
    │   ├── home/                  #   Dashboard principal
    │   │
    │   ├── measurement/           #   Registro de mediciones ambientales
    │   │   ├── guide-measurement/ #     Guía paso a paso antes de medir
    │   │   └── register-measurement/ #  Formulario de captura de la medición
    │   │
    │   ├── historical/            #   Historial de mediciones
    │   │   ├── time-frame/        #     Selector de rango de fechas
    │   │   └── measurement-detail/#     Detalle y gráfica de una medición
    │   │
    │   ├── moon-phase/            #   Detalle del ciclo lunar
    │   │
    │   ├── profile/               #   Perfil del usuario
    │   │   ├── personal-info/     #     Datos personales
    │   │   ├── achievement/       #     Logros y gamificación
    │   │   ├── alerts/            #     Historial de alertas recibidas
    │   │   └── configuration/     #     Ajustes de cuenta
    │   │       └── sync-action/   #       Acción manual de sincronización
    │   │
    │   └── alerts/
    │       └── creation/          #   Creación de alertas personalizadas
    │
    └── services/
        └── notification/          # Notificaciones push locales
```

---

## Entidades de negocio clave

| Entidad | Descripción |
|---|---|
| **Usuario** | Persona registrada con número de celular. Tiene nombre, apellido y pertenece a una UVA. |
| **UVA** | Unidad de Vigilancia Ambiental. Agrupa a los usuarios de un mismo punto geográfico. |
| **RACIMO** | Proyecto o grupo al que pertenece una UVA. Es la entidad raíz de organización. |
| **Medición** | Registro de un dato ambiental (temperatura, humedad, lluvia) hecho por un usuario en una fecha. |
| **Logro** | Hito de gamificación desbloqueado al cumplir criterios de participación. |
| **Racha** | Contador de días consecutivos con mediciones registradas. |
| **Fase lunar** | Dato astronómico del ciclo lunar usado como contexto de las mediciones. |
