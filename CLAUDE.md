@AGENTS.md

# UVA App — Contexto de la aplicación

## Qué hace la app

**UVA** es una aplicación móvil para la recolección y monitoreo de datos ambientales comunitarios. Los usuarios son colaboradores de campo que registran mediciones del entorno (temperatura, humedad, lluvia) desde su celular. Cada usuario pertenece a un **RACIMO** (grupo/proyecto) al que se vincula durante el registro.

La app funciona **sin conexión** y sincroniza los datos en segundo plano cuando hay red disponible.

> El código fuente vive en la raíz del repo (React Native / Expo, target Android). El proyecto Ionic/Angular original fue eliminado en el cutover del 2026-09-11 (ver `docs/migration/plan.md`); quien necesite el código Ionic puede encontrarlo en el tag `pre-cutover-2026-09-11` y en los tags `V2.x`.

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

## Estructura de carpetas (raíz del repo)

```
├── App.tsx                        # Composición raíz: polyfills → Amplify/DataStore → Context providers → RootNavigator
├── index.ts                       # Entry point de Expo
├── app.json                       # Configuración de Expo (nombre, versión, permisos, plugins)
├── plugins/                       # Config plugins de Expo (se aplican en `expo prebuild`)
│   └── withAsyncStorageDbSize.js  #   Eleva el cap de AsyncStorage/SQLite a 200MB
├── modules/                       # Módulos nativos propios (si aplica)
├── assets/                        # Iconos, splash, fuentes de nivel app
│
└── src/
    ├── screens/                   # Pantallas, agrupadas por flujo
    │   ├── auth/                  #   Login, OTP, registro, vinculación a RACIMO
    │   ├── home/                  #   Dashboard principal
    │   ├── measurement/           #   Guía + registro de mediciones
    │   ├── historical/            #   Histórico y detalle de medición
    │   ├── moon/                  #   Detalle del ciclo lunar
    │   ├── profile/                #   Perfil, logros, alertas, info personal
    │   ├── configuration/          #   Ajustes de cuenta
    │   ├── splash/                  #   Pantalla de arranque
    │   └── dev/                      #   Pantallas de desarrollo/QA
    │
    ├── navigation/                 # RootNavigator, AuthStack, AppStack, AppTabs, gates de navegación
    │
    ├── components/                 # Componentes de UI reutilizables
    │   ├── ui/                     #   Primitivas (botones, inputs, Toast, etc.)
    │   ├── calendar/                #   Calendario interactivo
    │   ├── areachart/                #   Gráfica de área (react-native-svg puro)
    │   ├── environmental-report/      #   Tarjeta/tabla de reporte ambiental
    │   ├── header/                     #   Cabecera de pantalla
    │   ├── moon-card/                    #   Tarjeta de fase lunar
    │   ├── sync-action/                   #   Acción manual de sincronización
    │   ├── time-frame/                     #   Selector de rango de fechas
    │   ├── icons/, rich-text/, explore-container/  # Utilitarios de presentación
    │
    ├── state/                       # React Context (estado global)
    │   ├── SessionContext.tsx       #   Sesión del usuario autenticado
    │   ├── SyncContext.tsx           #   Estado de sincronización de DataStore
    │   ├── ConfigContext.tsx          #   Configuración persistida del dispositivo
    │   └── notification/               #   Estado de alertas/notificaciones locales
    │
    ├── data/                         # Acceso a datos
    │   ├── amplify-bootstrap/        #   Amplify.configure + DataStore.configure + Hub
    │   ├── api/                       #   Llamadas GraphQL directas (racimo, uva, user, user-progress, moon-phase)
    │   │   └── errors-handle/          #     Manejo centralizado de errores de API
    │   ├── auth/                        #   Autenticación (Cognito, OTP, test-users)
    │   ├── datastore/                     #   Wrappers de DataStore por modelo
    │   │   ├── measurement-ds.ts
    │   │   ├── racimo-ds.ts
    │   │   ├── uva-ds.ts
    │   │   ├── user-ds.ts
    │   │   ├── user-progress-ds.ts
    │   │   └── gamification-event-ds.ts
    │   ├── graphql/                        #   Queries/mutations/subscriptions generadas
    │   ├── models/                          #   Esquema DataStore (schema.js/.d.ts)
    │   ├── session/                          #   Persistencia de sesión
    │   └── storage/                            #   file-system, preferences, S3
    │
    ├── domain/                       # Lógica de negocio pura (sin dependencias de RN)
    │   ├── measurement-engine/       #   Captura y validación de mediciones
    │   ├── gamification/              #   Cálculo de logros y rachas
    │   ├── moon/                       #   Cálculo de fase lunar
    │   ├── report/                      #   Reporte ambiental y archivo compartible
    │   ├── aggregations/                 #   Agregaciones históricas
    │   └── setup/                          #   Inicialización de sesión y vinculación a RACIMO/UVA
    │
    ├── native/                       # Envoltorios de módulos nativos
    │   ├── back/                     #   Botón atrás de Android
    │   ├── minimize/                  #   Comportamiento al minimizar la app
    │   ├── notifications/               #   Notificaciones locales (recordatorios)
    │   ├── device/                        #   Nivel de API de Android
    │   ├── clipboard/, share/, filesystem/  # Envoltorios sobre APIs nativas/Expo
    │
    ├── theme/                         # ThemeProvider y tokens de diseño (theming por RACIMO)
    ├── types/                          # Tipos compartidos
    └── __tests__/                       # Suite Jest (unit + component, RNTL)
```

---

## Entidades de negocio clave

| Entidad        | Descripción                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Usuario**    | Persona registrada con número de celular. Tiene nombre, apellido y pertenece a una UVA.         |
| **UVA**        | Unidad de Vigilancia Ambiental. Agrupa a los usuarios de un mismo punto geográfico.             |
| **RACIMO**     | Proyecto o grupo al que pertenece una UVA. Es la entidad raíz de organización.                  |
| **Medición**   | Registro de un dato ambiental (temperatura, humedad, lluvia) hecho por un usuario en una fecha. |
| **Logro**      | Hito de gamificación desbloqueado al cumplir criterios de participación.                        |
| **Racha**      | Contador de días consecutivos con mediciones registradas.                                       |
| **Fase lunar** | Dato astronómico del ciclo lunar usado como contexto de las mediciones.                         |
