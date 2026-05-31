# Documentación de API

## Descripción General

La aplicación utiliza **AWS AppSync** como capa de API GraphQL, proporcionando sincronización de datos en tiempo real, soporte offline y resolución de conflictos. Todas las operaciones de la API se generan automáticamente a partir del esquema GraphQL y se consumen mediante AWS Amplify DataStore.

### Configuración de la API
- **Tipo**: GraphQL (AWS AppSync)
- **Región**: us-east-1
- **API ID**: uqr6xntysfa3lbguhirvcj3pa4
- **Protocolo**: HTTPS + WebSocket (para suscripciones)
- **Versión del Esquema**: GraphQL Transformer V2

---

## Autenticación y Autorización

### Métodos de Autenticación

1. **AWS Cognito User Pools**
   - Autenticación basada en número de teléfono
   - Verificación por SMS OTP
   - Tokens JWT (Acceso, ID, Actualización)
   - Gestión de sesiones

2. **Reglas de Autorización**
   - **Basada en propietario**: Los usuarios solo pueden acceder a sus propios datos
   - **Privada**: Solo usuarios autenticados
   - **Pública**: Acceso de lectura público limitado (datos de fases lunares)

### Cabeceras de Solicitud

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## Operaciones GraphQL

### 1. Operaciones de RACIMO (Proyecto/Clúster)

#### Crear RACIMO

**Operación**: `createRACIMO`
**Tipo**: Mutación
**Acceso**: Usuarios autenticados

**Solicitud**:
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

**Variables de Entrada**:
```json
{
  "input": {
    "Name": "Mi Viñedo del Norte",
    "LinkageCode": "ABC12345",
    "Configuration": "{\"timezone\":\"America/Santiago\",\"fields\":[\"Field1\",\"Field2\"]}"
  }
}
```

**Respuesta**:
```json
{
  "data": {
    "createRACIMO": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "Name": "Mi Viñedo del Norte",
      "LinkageCode": "ABC12345",
      "Configuration": "{\"timezone\":\"America/Santiago\",\"fields\":[\"Field1\",\"Field2\"]}",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "_version": 1
    }
  }
}
```

---

#### Obtener RACIMO por ID

**Operación**: `getRACIMO`
**Tipo**: Consulta
**Acceso**: Usuarios autenticados (solo miembros)

**Solicitud**:
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

**Variables de Entrada**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### Listar RACIMOs

**Operación**: `listRACIMOS`
**Tipo**: Consulta
**Acceso**: Usuarios autenticados

**Solicitud**:
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

**Opciones de Filtro**:
```json
{
  "filter": {
    "LinkageCode": {
      "eq": "ABC12345"
    }
  },
  "limit": 20
}
```

---

#### Actualizar RACIMO

**Operación**: `updateRACIMO`
**Tipo**: Mutación
**Acceso**: Solo administrador del RACIMO

**Solicitud**:
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

**Variables de Entrada**:
```json
{
  "input": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "Name": "Updated Vineyard Name",
    "_version": 1
  }
}
```

---

### 2. Operaciones de UVA (Unidad Agrícola)

#### Crear UVA

**Operación**: `createUVA`
**Tipo**: Mutación
**Acceso**: Usuarios autenticados

**Solicitud**:
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

**Variables de Entrada**:
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

**Operación**: `getUVA`
**Tipo**: Consulta
**Acceso**: Propietario o miembros del RACIMO

**Solicitud**:
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

**Operación**: `listUVAS`
**Tipo**: Consulta
**Acceso**: Usuarios autenticados

**Solicitud**:
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

**Filtrar por RACIMO**:
```json
{
  "filter": {
    "racimoID": {
      "eq": "racimo-456"
    }
  }
}
```

---

### 3. Operaciones de Usuario

#### Crear Usuario

**Operación**: `createUser`
**Tipo**: Mutación
**Acceso**: Autenticado (autorregistro)

**Solicitud**:
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

**Variables de Entrada**:
```json
{
  "input": {
    "Name": "Juan",
    "LastName": "Pérez",
    "PhoneNumber": "+56912345678",
    "Email": "juan@example.com",
    "Rank": "Bronze",
    "uvaID": "uva-123"
  }
}
```

---

#### Obtener Usuario

**Operación**: `getUser`
**Tipo**: Consulta
**Acceso**: Solo propietario

**Solicitud**:
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

**Operación**: `updateUser`
**Tipo**: Mutación
**Acceso**: Solo propietario

**Solicitud**:
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

**Operación**: `createMeasurement`
**Tipo**: Mutación
**Acceso**: Usuarios autenticados (propietario)

**Solicitud**:
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

**Variables de Entrada**:
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

**Respuesta**:
```json
{
  "data": {
    "createMeasurement": {
      "id": "measurement-789",
      "type": "temperature",
      "data": "{\"value\":22.5,\"unit\":\"celsius\"}",
      "logs": "{\"device\":\"sensor-01\",\"location\":\"field-A\"}",
      "ts": "2025-01-15T14:30:00.000Z",
      "task": "daily-temp-check",
      "uvaID": "uva-123",
      "createdAt": "2025-01-15T14:30:05.000Z",
      "owner": "user-123"
    }
  }
}
```

---

#### Obtener Medición

**Operación**: `getMeasurement`
**Tipo**: Consulta
**Acceso**: Propietario o miembros del RACIMO

**Solicitud**:
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

**Operación**: `listMeasurements`
**Tipo**: Consulta
**Acceso**: Propietario o miembros del RACIMO

**Solicitud**:
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

**Filtrar por UVA y Rango de Fechas**:
```json
{
  "filter": {
    "uvaID": {
      "eq": "uva-123"
    },
    "ts": {
      "between": ["2025-01-01T00:00:00.000Z", "2025-01-31T23:59:59.999Z"]
    }
  },
  "limit": 100
}
```

---

#### Consultar Mediciones por UVA y Timestamp

**Operación**: `measurementsByUvaIDAndTs`
**Tipo**: Consulta (usando índice)
**Acceso**: Propietario o miembros del RACIMO

**Solicitud**:
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

**Variables**:
```json
{
  "uvaID": "uva-123",
  "ts": {
    "between": ["2025-01-01T00:00:00.000Z", "2025-01-31T23:59:59.999Z"]
  },
  "sortDirection": "DESC"
}
```

---

### 5. Operaciones de Progreso de Usuario

#### Crear Progreso de Usuario

**Operación**: `createUserProgress`
**Tipo**: Mutación
**Acceso**: Solo propietario

**Solicitud**:
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

**Variables de Entrada**:
```json
{
  "input": {
    "ts": "2025-01-15",
    "Seed": 150,
    "Streak": 7,
    "Milestones": "{\"bronze\":true,\"silver\":false}",
    "SaveStreak": true,
    "completedTasks": 5,
    "additionalInfo": "{\"bonusTasks\":2}",
    "userID": "user-123"
  }
}
```

---

#### Consultar Progreso por Usuario y Fecha

**Operación**: `userProgressesByUserIDAndTs`
**Tipo**: Consulta (usando índice)
**Acceso**: Solo propietario

**Solicitud**:
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

**Operación**: `getMoonPhase`
**Tipo**: Consulta
**Acceso**: Público (no requiere autenticación)

**Solicitud**:
```graphql
query GetMoonPhase($year: Int!, $month: Int!) {
  getMoonPhase(year: $year, month: $month)
}
```

**Variables de Entrada**:
```json
{
  "year": 2025,
  "month": 1
}
```

**Respuesta**:
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

**Operación**: `onCreateMeasurement`
**Tipo**: Suscripción
**Acceso**: Solo propietario

**Solicitud**:
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

**Operación**: `onUpdateUser`
**Tipo**: Suscripción
**Acceso**: Solo propietario

**Solicitud**:
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

**Operación**: `onCreateUserProgress`
**Tipo**: Suscripción
**Acceso**: Solo propietario

**Solicitud**:
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

**Operación**: `syncRACIMOS`
**Tipo**: Consulta
**Acceso**: Usuarios autenticados

**Solicitud**:
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

**Uso**: Llamado automáticamente por AWS Amplify DataStore para sincronización offline

---

## Manejo de Errores

### Respuestas de Error Comunes

#### Error de Autenticación
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

#### Error de Validación
```json
{
  "errors": [
    {
      "errorType": "ValidationException",
      "message": "Variable 'input' has coerced Null value for NonNull type 'String!'"
    }
  ]
}
```

#### Error de Conflicto (Bloqueo Optimista)
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

#### Error de Recurso No Encontrado
```json
{
  "errors": [
    {
      "errorType": "DynamoDB:ConditionalCheckFailedException",
      "message": "The conditional request failed"
    }
  ]
}
```

---

## Paginación

Todas las operaciones de listado soportan paginación:

```graphql
query ListMeasurements($nextToken: String, $limit: Int) {
  listMeasurements(nextToken: $nextToken, limit: $limit) {
    items {
      id
      type
      ts
    }
    nextToken  # Usar este valor para la siguiente página
  }
}
```

**Primera Página**:
```json
{
  "limit": 50
}
```

**Páginas Siguientes**:
```json
{
  "limit": 50,
  "nextToken": "eyJ2ZXJzaW9uIjoyLCJ0b2tlbiI6IkFRSUNBSGlx..."
}
```

---

## Límites de Velocidad

- **Consultas**: 1000 solicitudes por segundo
- **Mutaciones**: 500 solicitudes por segundo
- **Suscripciones**: 1000 conexiones simultáneas
- **Capacidad de ráfaga**: 2000 solicitudes

---

## Buenas Prácticas

### 1. Usar DataStore en Lugar de Llamadas Directas a la API
```typescript
// ✅ Preferido: Usar DataStore
const measurements = await DataStore.query(Measurement, m =>
  m.uvaID.eq('uva-123')
);

// ❌ Evitar: Llamadas directas a GraphQL
// (a menos que se necesiten optimizaciones específicas)
```

### 2. Aprovechar las Actualizaciones Optimistas
DataStore maneja las actualizaciones optimistas de la UI automáticamente: la UI se actualiza inmediatamente mientras la sincronización ocurre en segundo plano.

### 3. Usar Paginación para Grandes Conjuntos de Datos
Siempre usar `limit` y `nextToken` al consultar colecciones grandes.

### 4. Filtrar por Campos Indexados
Usar `uvaID`, `userID` y `ts` para filtrado eficiente (tienen GSIs).

### 5. Agrupar Mutaciones
Al crear múltiples registros, usar operaciones por lotes si están disponibles o limitar la velocidad de las solicitudes.

---

## Ejemplos de Uso con SDK

### Ejemplo TypeScript/Angular

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

// Consultar mediciones
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

// Suscribirse a cambios
const subscription = DataStore.observe(Measurement).subscribe(msg => {
  console.log('Measurement changed:', msg.model, msg.opType);
});
```

---

## Ubicación del Esquema GraphQL

El esquema GraphQL completo está definido en:
- **Archivo**: `amplify/backend/api/<api-name>/schema.graphql`
- **Tipos autogenerados**: `src/API.ts`
- **Modelos**: `src/models/`
- **Operaciones**: `src/graphql/queries.ts`, `mutations.ts`, `subscriptions.ts`
