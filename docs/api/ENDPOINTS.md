# API GraphQL — UVA-App (AWS AppSync)

---

## Descripción General

La aplicación utiliza **AWS AppSync** como capa de API GraphQL, proporcionando sincronización de datos en tiempo real, soporte offline y resolución de conflictos. Todas las operaciones de la API se generan automáticamente a partir del esquema GraphQL y se consumen mediante AWS Amplify DataStore.

### Configuración de la API

| Parámetro | Valor |
|-----------|-------|
| Tipo | GraphQL (AWS AppSync) |
| Región | us-east-1 |
| API ID | uqr6xntysfa3lbguhirvcj3pa4 |
| Protocolo | HTTPS + WebSocket (suscripciones) |
| Versión del Esquema | GraphQL Transformer V2 |

### Archivos de referencia

| Archivo | Descripción |
|---------|-------------|
| `amplify/backend/api/<api-name>/schema.graphql` | Esquema GraphQL autoritativo |
| `src/API.ts` | Tipos TypeScript autogenerados |
| `src/models/` | Modelos DataStore autogenerados |
| `src/graphql/queries.ts` | Consultas GraphQL |
| `src/graphql/mutations.ts` | Mutaciones GraphQL |
| `src/graphql/subscriptions.ts` | Suscripciones GraphQL |

---

## Autenticación y Autorización

### Métodos de Autenticación

1. **AWS Cognito User Pools** (Principal)
   - Autenticación basada en número de teléfono
   - Verificación por SMS OTP
   - Tokens JWT (Acceso, ID, Actualización)
   - Gestión de sesiones

2. **API Key** (Secundario — consultas públicas)
   - Para datos de fases lunares
   - Acceso de solo lectura público

### Reglas de Autorización

| Tipo | Regla | Aplica a |
|------|-------|----------|
| Basada en propietario | Los usuarios solo acceden a sus propios datos | Medición, UserProgress |
| Privada | Solo usuarios autenticados | RACIMO, UVA, Usuario |
| Pública | Acceso de lectura sin autenticación | Fase lunar |

### Cabeceras de Solicitud

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## Operaciones GraphQL

### 1. Operaciones de RACIMO (Proyecto/Clúster)

#### Crear RACIMO

**Operación**: `createRACIMO` | **Tipo**: Mutación | **Acceso**: Usuarios autenticados

```graphql
mutation CreateRACIMO($input: CreateRACIMOInput!) {
  createRACIMO(input: $input) {
    id
    Name
    LinkageCode
    Configuration
    createdAt
    updatedAt
    _version
  }
}
```

**Variables de entrada:**
```json
{
  "input": {
    "Name": "Mi Viñedo del Norte",
    "LinkageCode": "ABC12345",
    "Configuration": "{\"timezone\":\"America/Santiago\",\"fields\":[\"Field1\",\"Field2\"]}"
  }
}
```

---

#### Obtener RACIMO por ID

**Operación**: `getRACIMO` | **Tipo**: Consulta | **Acceso**: Usuarios autenticados (solo miembros)

```graphql
query GetRACIMO($id: ID!) {
  getRACIMO(id: $id) {
    id
    Name
    LinkageCode
    Configuration
    UVAs {
      items {
        id
        latitude
        longitude
        altitude
        userID
      }
      nextToken
    }
    createdAt
    updatedAt
  }
}
```

---

#### Listar RACIMOs

**Operación**: `listRACIMOS` | **Tipo**: Consulta | **Acceso**: Usuarios autenticados

```graphql
query ListRACIMOS($filter: ModelRACIMOFilterInput, $limit: Int, $nextToken: String) {
  listRACIMOS(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      Name
      LinkageCode
      Configuration
      createdAt
    }
    nextToken
  }
}
```

**Opciones de filtro:**
```json
{
  "filter": { "LinkageCode": { "eq": "ABC12345" } },
  "limit": 20
}
```

---

#### Actualizar RACIMO

**Operación**: `updateRACIMO` | **Tipo**: Mutación | **Acceso**: Solo administrador del RACIMO

```graphql
mutation UpdateRACIMO($input: UpdateRACIMOInput!) {
  updateRACIMO(input: $input) {
    id
    Name
    LinkageCode
    Configuration
    _version
  }
}
```

---

### 2. Operaciones de UVA (Unidad Agrícola)

#### Crear UVA

**Operación**: `createUVA` | **Tipo**: Mutación | **Acceso**: Usuarios autenticados

```graphql
mutation CreateUVA($input: CreateUVAInput!) {
  createUVA(input: $input) {
    id
    latitude
    longitude
    altitude
    fields
    enabled
    userID
    racimoID
    createdAt
  }
}
```

**Variables de entrada:**
```json
{
  "input": {
    "latitude": "-33.4489",
    "longitude": "-70.6693",
    "altitude": "570",
    "fields": "{\"fieldA\":\"Cabernet\",\"fieldB\":\"Merlot\"}",
    "enabled": true,
    "userID": "user-123",
    "racimoID": "racimo-456"
  }
}
```

---

#### Obtener UVA por ID

**Operación**: `getUVA` | **Tipo**: Consulta | **Acceso**: Propietario o miembros del RACIMO

```graphql
query GetUVA($id: ID!) {
  getUVA(id: $id) {
    id
    latitude
    longitude
    altitude
    fields
    enabled
    userID
    racimoID
    User {
      id
      Name
      LastName
      PhoneNumber
    }
    Measurements {
      items {
        id
        type
        ts
        task
      }
      nextToken
    }
  }
}
```

---

#### Listar UVAs

**Operación**: `listUVAS` | **Tipo**: Consulta | **Acceso**: Usuarios autenticados

```graphql
query ListUVAS($filter: ModelUVAFilterInput) {
  listUVAS(filter: $filter) {
    items {
      id
      latitude
      longitude
      userID
      racimoID
      enabled
    }
  }
}
```

**Filtrar por RACIMO:**
```json
{
  "filter": { "racimoID": { "eq": "racimo-456" } }
}
```

---

### 3. Operaciones de Usuario

#### Crear Usuario

**Operación**: `createUser` | **Tipo**: Mutación | **Acceso**: Autenticado (autorregistro)

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    Name
    LastName
    PhoneNumber
    Email
    Rank
    uvaID
    createdAt
  }
}
```

---

#### Obtener Usuario

**Operación**: `getUser` | **Tipo**: Consulta | **Acceso**: Solo propietario

```graphql
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    Name
    LastName
    PhoneNumber
    Email
    Rank
    uvaID
    UVA {
      id
      latitude
      longitude
      racimoID
    }
    UserProgresses {
      items {
        id
        ts
        Seed
        Streak
        Milestones
      }
    }
  }
}
```

---

#### Actualizar Usuario

**Operación**: `updateUser` | **Tipo**: Mutación | **Acceso**: Solo propietario

```graphql
mutation UpdateUser($input: UpdateUserInput!) {
  updateUser(input: $input) {
    id
    Name
    LastName
    Email
    Rank
    _version
  }
}
```

---

### 4. Operaciones de Medición

#### Crear Medición

**Operación**: `createMeasurement` | **Tipo**: Mutación | **Acceso**: Usuarios autenticados (propietario)

```graphql
mutation CreateMeasurement($input: CreateMeasurementInput!) {
  createMeasurement(input: $input) {
    id
    type
    data
    logs
    ts
    task
    uvaID
    createdAt
    owner
  }
}
```

**Variables de entrada:**
```json
{
  "input": {
    "type": "temperature",
    "data": "{\"value\":22.5,\"unit\":\"celsius\"}",
    "logs": "{\"device\":\"sensor-01\",\"location\":\"field-A\"}",
    "ts": "2025-01-15T14:30:00.000Z",
    "task": "daily-temp-check",
    "uvaID": "uva-123"
  }
}
```

---

#### Obtener Medición

**Operación**: `getMeasurement` | **Tipo**: Consulta | **Acceso**: Propietario o miembros del RACIMO

```graphql
query GetMeasurement($id: ID!) {
  getMeasurement(id: $id) {
    id
    type
    data
    logs
    ts
    task
    uvaID
    createdAt
    owner
  }
}
```

---

#### Listar Mediciones

**Operación**: `listMeasurements` | **Tipo**: Consulta | **Acceso**: Propietario o miembros del RACIMO

```graphql
query ListMeasurements($filter: ModelMeasurementFilterInput, $limit: Int) {
  listMeasurements(filter: $filter, limit: $limit) {
    items {
      id
      type
      data
      ts
      task
      uvaID
    }
    nextToken
  }
}
```

**Filtrar por UVA y rango de fechas:**
```json
{
  "filter": {
    "uvaID": { "eq": "uva-123" },
    "ts": { "between": ["2025-01-01T00:00:00.000Z", "2025-01-31T23:59:59.999Z"] }
  },
  "limit": 100
}
```

---

#### Consultar Mediciones por UVA y Timestamp (GSI)

**Operación**: `measurementsByUvaIDAndTs` | **Tipo**: Consulta (índice GSI) | **Acceso**: Propietario o miembros del RACIMO

```graphql
query MeasurementsByUvaIDAndTs(
  $uvaID: ID!
  $ts: ModelStringKeyConditionInput
  $sortDirection: ModelSortDirection
) {
  measurementsByUvaIDAndTs(
    uvaID: $uvaID
    ts: $ts
    sortDirection: $sortDirection
  ) {
    items {
      id
      type
      data
      ts
      task
    }
    nextToken
  }
}
```

**Variables:**
```json
{
  "uvaID": "uva-123",
  "ts": { "between": ["2025-01-01T00:00:00.000Z", "2025-01-31T23:59:59.999Z"] },
  "sortDirection": "DESC"
}
```

---

### 5. Operaciones de Progreso de Usuario

#### Crear Progreso de Usuario

**Operación**: `createUserProgress` | **Tipo**: Mutación | **Acceso**: Solo propietario

```graphql
mutation CreateUserProgress($input: CreateUserProgressInput!) {
  createUserProgress(input: $input) {
    id
    ts
    Seed
    Streak
    Milestones
    SaveStreak
    completedTasks
    additionalInfo
    userID
  }
}
```

---

#### Consultar Progreso por Usuario y Fecha (GSI)

**Operación**: `userProgressesByUserIDAndTs` | **Tipo**: Consulta (índice GSI) | **Acceso**: Solo propietario

```graphql
query UserProgressesByUserIDAndTs(
  $userID: ID!
  $ts: ModelStringKeyConditionInput
  $sortDirection: ModelSortDirection
) {
  userProgressesByUserIDAndTs(
    userID: $userID
    ts: $ts
    sortDirection: $sortDirection
  ) {
    items {
      id
      ts
      Seed
      Streak
      Milestones
      completedTasks
    }
    nextToken
  }
}
```

---

### 6. Operaciones de Fase Lunar

#### Obtener Fase Lunar

**Operación**: `getMoonPhase` | **Tipo**: Consulta | **Acceso**: Público (no requiere autenticación)

```graphql
query GetMoonPhase($year: Int!, $month: Int!) {
  getMoonPhase(year: $year, month: $month)
}
```

**Respuesta:**
```json
{
  "data": {
    "getMoonPhase": "[{\"date\":\"2025-01-01\",\"phase\":\"waning_crescent\",\"illumination\":0.12},{\"date\":\"2025-01-06\",\"phase\":\"new_moon\",\"illumination\":0.0}]"
  }
}
```

---

## Suscripciones (Actualizaciones en Tiempo Real)

### Suscribirse a la Creación de Mediciones

**Operación**: `onCreateMeasurement` | **Acceso**: Solo propietario

```graphql
subscription OnCreateMeasurement($filter: ModelSubscriptionMeasurementFilterInput, $owner: String) {
  onCreateMeasurement(filter: $filter, owner: $owner) {
    id
    type
    data
    ts
    task
    uvaID
    owner
  }
}
```

---

### Suscribirse a Actualizaciones de Usuario

**Operación**: `onUpdateUser` | **Acceso**: Solo propietario

```graphql
subscription OnUpdateUser($filter: ModelSubscriptionUserFilterInput) {
  onUpdateUser(filter: $filter) {
    id
    Name
    LastName
    Rank
    uvaID
  }
}
```

---

### Suscribirse a Actualizaciones de Progreso de Usuario

**Operación**: `onCreateUserProgress` | **Acceso**: Solo propietario

```graphql
subscription OnCreateUserProgress($filter: ModelSubscriptionUserProgressFilterInput, $userID: String) {
  onCreateUserProgress(filter: $filter, userID: $userID) {
    id
    ts
    Seed
    Streak
    Milestones
    userID
  }
}
```

---

## Operaciones de Sincronización DataStore

### Sincronizar RACIMOs

```graphql
query SyncRACIMOS($filter: ModelRACIMOFilterInput, $limit: Int, $lastSync: AWSTimestamp) {
  syncRACIMOS(filter: $filter, limit: $limit, lastSync: $lastSync) {
    items {
      id
      Name
      LinkageCode
      _version
      _deleted
      _lastChangedAt
    }
    nextToken
    startedAt
  }
}
```

> Llamado automáticamente por AWS Amplify DataStore para sincronización offline.

---

## Paginación

Todas las operaciones de listado soportan paginación con `limit` y `nextToken`:

```graphql
query ListMeasurements($nextToken: String, $limit: Int) {
  listMeasurements(nextToken: $nextToken, limit: $limit) {
    items {
      id
      type
      ts
    }
    nextToken
  }
}
```

**Primera página:** `{ "limit": 50 }`

**Páginas siguientes:** `{ "limit": 50, "nextToken": "eyJ2ZXJzaW9uIjoyLCJ0b2tlbiI6..." }`

---

## Manejo de Errores

### Respuestas de Error Comunes

| Tipo de Error | `errorType` | Descripción |
|---------------|-------------|-------------|
| Autenticación | `Unauthorized` | Token expirado o permisos insuficientes |
| Validación | `ValidationException` | Campo requerido nulo o tipo incorrecto |
| Conflicto | `ConflictUnhandled` | Versión `_version` no coincide |
| No encontrado | `DynamoDB:ConditionalCheckFailedException` | Registro no existe |

**Ejemplo — Error de autenticación:**
```json
{
  "errors": [
    {
      "errorType": "Unauthorized",
      "message": "Not Authorized to access getMeasurement on type Query"
    }
  ]
}
```

**Ejemplo — Error de conflicto (bloqueo optimista):**
```json
{
  "errors": [
    {
      "errorType": "ConflictUnhandled",
      "message": "Conflict resolver rejects mutation. Expected version 5, received 3"
    }
  ]
}
```

---

## Límites de Velocidad

| Tipo | Límite |
|------|--------|
| Consultas | 1.000 solicitudes por segundo |
| Mutaciones | 500 solicitudes por segundo |
| Suscripciones | 1.000 conexiones simultáneas |
| Capacidad de ráfaga | 2.000 solicitudes |

---

## Buenas Prácticas

### 1. Usar DataStore en lugar de llamadas directas a la API

```typescript
// Preferido: Usar DataStore
const measurements = await DataStore.query(Measurement, m => m.uvaID.eq('uva-123'));

// Evitar: Llamadas directas a GraphQL (solo para optimizaciones específicas)
```

### 2. Aprovechar las actualizaciones optimistas
DataStore maneja las actualizaciones optimistas automáticamente: la UI se actualiza inmediatamente mientras la sincronización ocurre en segundo plano.

### 3. Usar paginación para grandes conjuntos de datos
Siempre usar `limit` y `nextToken` al consultar colecciones grandes.

### 4. Filtrar por campos indexados
Usar `uvaID`, `userID` y `ts` para filtrado eficiente (tienen GSIs configurados).

### 5. Agrupar mutaciones
Al crear múltiples registros, limitar la velocidad de las solicitudes o usar operaciones por lotes cuando estén disponibles.
