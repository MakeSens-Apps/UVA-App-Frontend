# Documentación de Base de Datos

## Descripción General de la Base de Datos

### Tipo de Base de Datos
**Amazon DynamoDB** - Base de datos NoSQL accedida a través de la API GraphQL de AWS AppSync y administrada por AWS Amplify DataStore.

### Características Clave
- **Completamente administrada**: Sin mantenimiento de servidor
- **Escalable**: Escalado automático basado en demanda
- **Alta disponibilidad**: Replicación multi-AZ
- **Consistente**: Consistencia eventual con resolución de conflictos
- **Serverless**: Modelo de precios de pago por solicitud

---

## Modelos de Datos

### Diagrama de Entidad-Relación

```
┌─────────────┐
│   RACIMO    │
│ (Proyecto)  │
└──────┬──────┘
       │ 1
       │
       │ N
       ▼
┌─────────────┐         ┌──────────────┐
│     UVA     │ 1 ───► 1│   Usuario    │
│(Unid./Finca)│         │              │
└──────┬──────┘         └──────┬───────┘
       │ 1                     │ 1
       │                        │
       │ N                      │ N
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│  Medición   │         │ProgresoUsuar.│
│             │         │              │
└─────────────┘         └──────────────┘
```

---

## Esquemas de Tablas

### 1. Tabla RACIMO

**Propósito**: Almacena información de proyectos/clústeres para la organización multi-inquilino

**Nombre de la Tabla**: `RACIMO-<env>-<api-id>`

#### Esquema

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | String (ID) | ✅ | Identificador único (UUID) |
| `Name` | String | ✅ | Nombre del proyecto |
| `LinkageCode` | String | ✅ | Código único de 8 caracteres para unirse |
| `Configuration` | String (JSON) | ❌ | Configuración JSON (zona horaria, campos, etc.) |
| `createdAt` | AWSDateTime | ✅ | Timestamp de creación del registro |
| `updatedAt` | AWSDateTime | ✅ | Timestamp de la última actualización |
| `_version` | Int | ✅ | Versión para bloqueo optimista |
| `_deleted` | Boolean | ❌ | Indicador de eliminación suave |
| `_lastChangedAt` | AWSTimestamp | ✅ | Timestamp de la última sincronización |

#### Clave de Partición
- `id` (Clave Primaria)

#### Índices Secundarios Globales
- **LinkageCodeIndex**: `LinkageCode` (para búsquedas rápidas por código)

#### Registro de Ejemplo
```json
{
  "id": "racimo-550e8400-e29b",
  "Name": "Viñedo Central",
  "LinkageCode": "VINE2025",
  "Configuration": "{\"timezone\":\"America/Santiago\",\"taskSchedule\":\"weekly\"}",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z",
  "_version": 1,
  "_deleted": false,
  "_lastChangedAt": 1705318200000
}
```

---

### 2. Tabla UVA

**Propósito**: Almacena unidades agrícolas (secciones de viñedo) con datos de ubicación

**Nombre de la Tabla**: `UVA-<env>-<api-id>`

#### Esquema

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | String (ID) | ✅ | Identificador único (UUID) |
| `latitude` | String | ❌ | Latitud geográfica |
| `longitude` | String | ❌ | Longitud geográfica |
| `altitude` | String | ❌ | Altitud en metros |
| `fields` | String (JSON) | ❌ | Configuración de campos como JSON |
| `enabled` | Boolean | ❌ | Estado activo (predeterminado: true) |
| `createdAt` | AWSDateTime | ❌ | Timestamp de creación del registro |
| `userID` | String (ID) | ✅ | Clave foránea al Usuario |
| `racimoID` | String (ID) | ✅ | Clave foránea al RACIMO |
| `updatedAt` | AWSDateTime | ✅ | Timestamp de la última actualización |
| `_version` | Int | ✅ | Versión para bloqueo optimista |
| `_deleted` | Boolean | ❌ | Indicador de eliminación suave |
| `_lastChangedAt` | AWSTimestamp | ✅ | Timestamp de la última sincronización |

#### Clave de Partición
- `id` (Clave Primaria)

#### Índices Secundarios Globales
- **byUser**: `userID` (para búsqueda de UVA del usuario)
- **byRACIMO**: `racimoID` (para listar todas las UVAs de un proyecto)

#### Relaciones
- **Usuario**: Uno a uno (cada UVA pertenece a un Usuario)
- **RACIMO**: Muchos a uno (muchas UVAs pertenecen a un RACIMO)

#### Registro de Ejemplo
```json
{
  "id": "uva-123abc456def",
  "latitude": "-33.4489",
  "longitude": "-70.6693",
  "altitude": "570",
  "fields": "{\"fieldA\":\"Cabernet Sauvignon\",\"fieldB\":\"Merlot\",\"size\":\"5 hectares\"}",
  "enabled": true,
  "createdAt": "2025-01-10T08:00:00.000Z",
  "userID": "user-789xyz",
  "racimoID": "racimo-550e8400-e29b",
  "updatedAt": "2025-01-15T12:00:00.000Z",
  "_version": 3,
  "_deleted": false,
  "_lastChangedAt": 1705324800000
}
```

---

### 3. Tabla de Usuario

**Propósito**: Almacena el perfil y la información de autenticación del usuario

**Nombre de la Tabla**: `User-<env>-<api-id>`

#### Esquema

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | String (ID) | ✅ | Identificador único (sub de Cognito) |
| `Name` | String | ✅ | Nombre de pila |
| `LastName` | String | ✅ | Apellido |
| `PhoneNumber` | String | ✅ | Teléfono (nombre de usuario de autenticación) |
| `Email` | String | ❌ | Dirección de email (opcional) |
| `Rank` | String | ❌ | Rango de gamificación (Bronce/Plata/Oro) |
| `uvaID` | String (ID) | ❌ | Clave foránea a UVA |
| `createdAt` | AWSDateTime | ✅ | Timestamp de creación de la cuenta |
| `updatedAt` | AWSDateTime | ✅ | Timestamp de la última actualización |
| `_version` | Int | ✅ | Versión para bloqueo optimista |
| `_deleted` | Boolean | ❌ | Indicador de eliminación suave |
| `_lastChangedAt` | AWSTimestamp | ✅ | Timestamp de la última sincronización |

#### Clave de Partición
- `id` (Clave Primaria)

#### Índices Secundarios Globales
- **byPhoneNumber**: `PhoneNumber` (para búsqueda en inicio de sesión)
- **byUVA**: `uvaID` (para búsqueda del propietario de UVA)

#### Relaciones
- **UVA**: Uno a uno (cada usuario tiene una UVA)

#### Registro de Ejemplo
```json
{
  "id": "user-789xyz",
  "Name": "María",
  "LastName": "González",
  "PhoneNumber": "+56912345678",
  "Email": "maria@example.com",
  "Rank": "Gold",
  "uvaID": "uva-123abc456def",
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-15T14:30:00.000Z",
  "_version": 5,
  "_deleted": false,
  "_lastChangedAt": 1705330200000
}
```

---

### 4. Tabla de Medición

**Propósito**: Almacena datos de medición en series temporales recopilados por los usuarios

**Nombre de la Tabla**: `Measurement-<env>-<api-id>`

#### Esquema

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | String (ID) | ✅ | Identificador único (UUID) |
| `type` | String | ✅ | Tipo de medición (ej., "temperatura", "humedad") |
| `data` | String (JSON) | ❌ | Datos de medición como JSON |
| `logs` | String (JSON) | ❌ | Metadatos/registros como JSON |
| `ts` | AWSDateTime | ✅ | Timestamp de la medición |
| `task` | String | ❌ | Identificador de tarea asociada |
| `uvaID` | String (ID) | ✅ | Clave foránea a UVA |
| `owner` | String | ❌ | Nombre de usuario de Cognito (para auth) |
| `createdAt` | AWSDateTime | ✅ | Timestamp de creación del registro |
| `updatedAt` | AWSDateTime | ✅ | Timestamp de la última actualización |
| `_version` | Int | ✅ | Versión para bloqueo optimista |
| `_deleted` | Boolean | ❌ | Indicador de eliminación suave |
| `_lastChangedAt` | AWSTimestamp | ✅ | Timestamp de la última sincronización |

#### Clave de Partición
- `id` (Clave Primaria)

#### Índices Secundarios Globales
- **byUVAandTs**: `uvaID` (Clave de Partición) + `ts` (Clave de Ordenamiento)
  - **Propósito**: Consultar mediciones por UVA y rango de fechas
  - **Caso de uso**: Consultas de datos históricos, gráficos, analíticas

#### Relaciones
- **UVA**: Muchos a uno (muchas mediciones pertenecen a una UVA)

#### Registro de Ejemplo
```json
{
  "id": "measurement-abc123xyz",
  "type": "temperature",
  "data": "{\"value\":23.5,\"unit\":\"celsius\",\"location\":\"fieldA\"}",
  "logs": "{\"device\":\"sensor-01\",\"battery\":85,\"signal\":\"strong\"}",
  "ts": "2025-01-15T14:30:00.000Z",
  "task": "daily-temp-check",
  "uvaID": "uva-123abc456def",
  "owner": "user-789xyz",
  "createdAt": "2025-01-15T14:30:05.000Z",
  "updatedAt": "2025-01-15T14:30:05.000Z",
  "_version": 1,
  "_deleted": false,
  "_lastChangedAt": 1705330205000
}
```

---

### 5. Tabla de Progreso de Usuario

**Propósito**: Registra el progreso de gamificación (semillas, rachas, hitos)

**Nombre de la Tabla**: `UserProgress-<env>-<api-id>`

#### Esquema

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | String (ID) | ✅ | Identificador único (UUID) |
| `ts` | String | ✅ | Fecha del progreso (AAAA-MM-DD) |
| `Seed` | Int | ❌ | Semillas ganadas en esta fecha |
| `Streak` | Int | ❌ | Contador de racha actual |
| `Milestones` | String (JSON) | ❌ | Hitos alcanzados como JSON |
| `SaveStreak` | Boolean | ❌ | Indicador de uso del salvavidas de racha |
| `completedTasks` | Int | ❌ | Número de tareas completadas |
| `additionalInfo` | String (JSON) | ❌ | Metadatos adicionales como JSON |
| `userID` | String (ID) | ✅ | Clave foránea al Usuario |
| `createdAt` | AWSDateTime | ✅ | Timestamp de creación del registro |
| `updatedAt` | AWSDateTime | ✅ | Timestamp de la última actualización |
| `_version` | Int | ✅ | Versión para bloqueo optimista |
| `_deleted` | Boolean | ❌ | Indicador de eliminación suave |
| `_lastChangedAt` | AWSTimestamp | ✅ | Timestamp de la última sincronización |

#### Clave de Partición
- `id` (Clave Primaria)

#### Índices Secundarios Globales
- **byUserAndDate**: `userID` (Clave de Partición) + `ts` (Clave de Ordenamiento)
  - **Propósito**: Consultar el historial de progreso por usuario y rango de fechas
  - **Caso de uso**: Gráficos de progreso, cálculos de rachas

#### Relaciones
- **Usuario**: Muchos a uno (muchos registros de progreso pertenecen a un usuario)

#### Registro de Ejemplo
```json
{
  "id": "progress-def456ghi",
  "ts": "2025-01-15",
  "Seed": 150,
  "Streak": 7,
  "Milestones": "{\"bronze\":true,\"silver\":true,\"gold\":false,\"7dayStreak\":true}",
  "SaveStreak": false,
  "completedTasks": 5,
  "additionalInfo": "{\"bonusTasks\":2,\"perfectDay\":true}",
  "userID": "user-789xyz",
  "createdAt": "2025-01-15T23:59:00.000Z",
  "updatedAt": "2025-01-15T23:59:00.000Z",
  "_version": 1,
  "_deleted": false,
  "_lastChangedAt": 1705363140000
}
```

---

## Resumen de Índices

### Índices Primarios (Claves de Partición)

| Tabla | Clave de Partición | Clave de Ordenamiento | Propósito |
|-------|-------------------|----------------------|-----------|
| RACIMO | `id` | - | Búsqueda única de proyecto |
| UVA | `id` | - | Búsqueda única de UVA |
| Usuario | `id` | - | Búsqueda única de usuario |
| Medición | `id` | - | Búsqueda única de medición |
| ProgresoUsuario | `id` | - | Búsqueda única de registro de progreso |

### Índices Secundarios Globales (GSI)

| Tabla | Nombre del Índice | Clave de Partición | Clave de Ordenamiento | Propósito |
|-------|------------------|-------------------|----------------------|-----------|
| RACIMO | LinkageCodeIndex | `LinkageCode` | - | Encontrar RACIMO por código de vinculación |
| UVA | byUser | `userID` | - | Encontrar UVA del usuario |
| UVA | byRACIMO | `racimoID` | - | Listar todas las UVAs de un proyecto |
| Usuario | byPhoneNumber | `PhoneNumber` | - | Búsqueda de inicio de sesión |
| Usuario | byUVA | `uvaID` | - | Encontrar propietario de UVA |
| Medición | byUVAandTs | `uvaID` | `ts` | Consultar mediciones por rango de fechas |
| ProgresoUsuario | byUserAndDate | `userID` | `ts` | Consultar historial de progreso |

---

## Relaciones entre Datos

### Relaciones de Uno a Muchos

```
RACIMO (1) ───────► UVA (N)
  └─ Cada RACIMO tiene muchas UVAs

UVA (1) ───────────► Medición (N)
  └─ Cada UVA tiene muchas mediciones

Usuario (1) ────────► ProgresoUsuario (N)
  └─ Cada usuario tiene muchos registros de progreso
```

### Relaciones de Uno a Uno

```
Usuario (1) ◄────────► UVA (1)
  └─ Cada usuario tiene exactamente una UVA
  └─ Cada UVA pertenece exactamente a un usuario
```

---

## Consistencia de Datos y Resolución de Conflictos

### Bloqueo Optimista
Todas las tablas usan el campo `_version` para bloqueo optimista:
- Cada actualización incrementa `_version`
- Las mutaciones deben incluir la `_version` actual
- Los conflictos ocurren cuando las versiones no coinciden

### Estrategia de Resolución de Conflictos
AWS Amplify DataStore usa la estrategia de **fusión automática (Auto-Merge)**:
1. Los datos del servidor tienen prioridad en caso de conflictos
2. El cliente recibe notificación del conflicto
3. La app puede implementar lógica de resolución personalizada

### Eliminaciones Suaves
Todas las tablas soportan eliminaciones suaves mediante el indicador `_deleted`:
- Los registros se marcan como `_deleted: true` en lugar de eliminarse físicamente
- Permite sincronización entre dispositivos
- Pueden purgarse después de la ventana de sincronización

---

## Patrones de Acceso a Datos

### 1. Flujo de Inicio de Sesión
```
Consulta: GSI byPhoneNumber
Entrada: PhoneNumber
Salida: Registro de usuario
```

### 2. Cargar Dashboard del Usuario
```
1. Obtener Usuario por id (de la autenticación)
2. Obtener UVA por userID (GSI byUser)
3. Obtener RACIMO por racimoID
4. Obtener Mediciones recientes (GSI byUVAandTs, últimos 30 días)
5. Obtener ProgresoUsuario (GSI byUserAndDate, últimos 7 días)
```

### 3. Registrar Medición
```
1. Crear registro de Medición con uvaID
2. Consultar el ProgresoUsuario más reciente del día
3. Actualizar o Crear ProgresoUsuario (incrementar semillas, racha)
```

### 4. Unirse a RACIMO por Código
```
1. Consultar RACIMO por LinkageCode (GSI LinkageCodeIndex)
2. Validar que el código existe
3. Crear UVA con racimoID
4. Actualizar Usuario con uvaID
```

### 5. Ver Datos Históricos
```
Consulta: GSI byUVAandTs
Filtro: uvaID + ts (rango de fechas)
Ordenamiento: ts DESC
Límite: 100 (paginado)
```

---

## Estimaciones de Almacenamiento

### Estimaciones de Tamaño por Registro

| Tabla | Tamaño Promedio por Registro | Registros por Usuario/Año | Tamaño Total/Usuario/Año |
|-------|------------------------------|--------------------------|--------------------------|
| Usuario | 0.5 KB | 1 | 0.5 KB |
| UVA | 1 KB | 1 | 1 KB |
| RACIMO | 1 KB | 0.1 (compartido) | 0.1 KB |
| Medición | 2 KB | 365 * 5 tareas = 1,825 | 3.65 MB |
| ProgresoUsuario | 1 KB | 365 | 365 KB |
| **Total** | - | - | **~4 MB por usuario/año** |

### Proyecciones de Escalado

| Usuarios | Almacenamiento/Año | Unidades de Lectura/Seg | Unidades de Escritura/Seg |
|----------|--------------------|------------------------|--------------------------|
| 100 | 400 MB | 50 | 20 |
| 1,000 | 4 GB | 500 | 200 |
| 10,000 | 40 GB | 5,000 | 2,000 |
| 100,000 | 400 GB | 50,000 | 20,000 |

---

## Respaldo y Recuperación

### Respaldos Automáticos
- **Recuperación a Punto en el Tiempo (PITR)**: Habilitado para todas las tablas
- **Retención**: 35 días
- **Recuperación**: Se puede restaurar a cualquier punto dentro de la ventana de retención

### Respaldos Bajo Demanda
- Respaldos manuales creados antes de cambios mayores en el esquema
- Se retienen indefinidamente hasta eliminación manual

---

## Migración de Datos

### Actualizaciones de Esquema
1. Actualizar el esquema GraphQL en `amplify/backend/api/schema.graphql`
2. Ejecutar `amplify push` para desplegar los cambios
3. Las tablas DynamoDB se actualizan automáticamente
4. Los modelos del cliente se regeneran (`src/models/`)

### Transformaciones de Datos
- Usar resolvers de AWS AppSync para transformación de datos
- Funciones AWS Lambda para migraciones complejas
- DataStore maneja el versionado de esquemas automáticamente

---

## Optimización de Rendimiento

### Optimización de Consultas
1. **Usar GSIs**: Siempre consultar usando campos indexados
2. **Limitar resultados**: Usar paginación con el parámetro `limit`
3. **Proyectar campos**: Solo solicitar los campos necesarios en GraphQL
4. **Lecturas por lotes**: Usar consultas por lotes de DataStore cuando sea posible

### Optimización de Escrituras
1. **Escrituras por lotes**: Agrupar mutaciones relacionadas
2. **Escrituras condicionales**: Usar condiciones para evitar sobreescrituras
3. **Evitar particiones calientes**: Distribuir escrituras entre múltiples UVAs

---

## Retención y Archivado de Datos

### Datos Activos
- **Mediciones**: Los últimos 2 años se mantienen en la tabla principal
- **ProgresoUsuario**: Se conservan todos los datos históricos
- **Registros eliminados suavemente**: Se purgan después de 30 días

### Estrategia de Archivado (Futuro)
- Mover mediciones de más de 2 años a S3
- Usar TTL de DynamoDB para limpieza automática
- Exportar a data lake para analíticas a largo plazo

---

## Seguridad y Control de Acceso

### Seguridad a Nivel de Tabla
- Todas las tablas cifradas en reposo (claves administradas por AWS)
- Cifradas en tránsito (TLS 1.2+)

### Seguridad a Nivel de Fila (RLS)
Implementada mediante resolvers de AppSync:
- **Usuario**: Solo acceso a su propio registro
- **UVA**: Propietario y miembros del RACIMO
- **Medición**: Propietario y miembros del RACIMO
- **ProgresoUsuario**: Solo propietario
- **RACIMO**: Solo miembros

### Reglas de Autorización (Esquema GraphQL)
```graphql
@auth(rules: [
  { allow: owner, ownerField: "owner" },
  { allow: private, operations: [read] }
])
```

---

## Monitoreo y Métricas

### Métricas Clave a Monitorear
- Unidades de capacidad de lectura/escritura consumidas
- Solicitudes con limitación de velocidad
- Errores de usuario vs. errores del sistema
- Tamaño promedio de ítems
- Consumo de GSI

### Alarmas de CloudWatch
- Tasa alta de limitación (> 5%)
- Pico en tasa de errores (> 1%)
- Aumento en latencia (> 100ms p99)

---

## Archivo de Esquema de Base de Datos

El esquema autoritativo está definido en:
- **Archivo**: `amplify/backend/api/<api-name>/schema.graphql`
- **Modelos generados**: `src/models/`
- **Tipos TypeScript**: `src/API.ts`
