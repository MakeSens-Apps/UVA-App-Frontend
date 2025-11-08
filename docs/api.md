# API Documentation

## Overview

The application uses **AWS AppSync** as the GraphQL API layer, providing real-time data synchronization, offline support, and conflict resolution. All API operations are auto-generated from the GraphQL schema and consumed via AWS Amplify DataStore.

### API Configuration
- **Type**: GraphQL (AWS AppSync)
- **Region**: us-east-1
- **API ID**: uqr6xntysfa3lbguhirvcj3pa4
- **Protocol**: HTTPS + WebSocket (for subscriptions)
- **Schema Version**: GraphQL Transformer V2

---

## Authentication & Authorization

### Authentication Methods

1. **AWS Cognito User Pools**
   - Phone-based authentication
   - SMS OTP verification
   - JWT tokens (Access, ID, Refresh)
   - Session management

2. **Authorization Rules**
   - **Owner-based**: Users can only access their own data
   - **Private**: Authenticated users only
   - **Public**: Limited public read access (moon phase data)

### Request Headers

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## GraphQL Operations

### 1. RACIMO (Project/Cluster) Operations

#### Create RACIMO

**Operation**: `createRACIMO`
**Type**: Mutation
**Access**: Authenticated users

**Request**:
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

**Input Variables**:
```json
{
  "input": {
    "Name": "Mi Viñedo del Norte",
    "LinkageCode": "ABC12345",
    "Configuration": "{\"timezone\":\"America/Santiago\",\"fields\":[\"Field1\",\"Field2\"]}"
  }
}
```

**Response**:
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

#### Get RACIMO by ID

**Operation**: `getRACIMO`
**Type**: Query
**Access**: Authenticated users (members only)

**Request**:
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

**Input Variables**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### List RACIMOs

**Operation**: `listRACIMOS`
**Type**: Query
**Access**: Authenticated users

**Request**:
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

**Filter Options**:
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

#### Update RACIMO

**Operation**: `updateRACIMO`
**Type**: Mutation
**Access**: RACIMO admin only

**Request**:
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

**Input Variables**:
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

### 2. UVA (Agricultural Unit) Operations

#### Create UVA

**Operation**: `createUVA`
**Type**: Mutation
**Access**: Authenticated users

**Request**:
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

**Input Variables**:
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

#### Get UVA by ID

**Operation**: `getUVA`
**Type**: Query
**Access**: Owner or RACIMO members

**Request**:
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

#### List UVAs

**Operation**: `listUVAS`
**Type**: Query
**Access**: Authenticated users

**Request**:
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

**Filter by RACIMO**:
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

### 3. User Operations

#### Create User

**Operation**: `createUser`
**Type**: Mutation
**Access**: Authenticated (self-registration)

**Request**:
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

**Input Variables**:
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

#### Get User

**Operation**: `getUser`
**Type**: Query
**Access**: Owner only

**Request**:
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

#### Update User

**Operation**: `updateUser`
**Type**: Mutation
**Access**: Owner only

**Request**:
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

### 4. Measurement Operations

#### Create Measurement

**Operation**: `createMeasurement`
**Type**: Mutation
**Access**: Authenticated users (owner)

**Request**:
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

**Input Variables**:
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

**Response**:
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

#### Get Measurement

**Operation**: `getMeasurement`
**Type**: Query
**Access**: Owner or RACIMO members

**Request**:
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

#### List Measurements

**Operation**: `listMeasurements`
**Type**: Query
**Access**: Owner or RACIMO members

**Request**:
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

**Filter by UVA and Date Range**:
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

#### Query Measurements by UVA and Timestamp

**Operation**: `measurementsByUvaIDAndTs`
**Type**: Query (using index)
**Access**: Owner or RACIMO members

**Request**:
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

### 5. User Progress Operations

#### Create User Progress

**Operation**: `createUserProgress`
**Type**: Mutation
**Access**: Owner only

**Request**:
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

**Input Variables**:
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

#### Query Progress by User and Date

**Operation**: `userProgressesByUserIDAndTs`
**Type**: Query (using index)
**Access**: Owner only

**Request**:
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

### 6. Moon Phase Operations

#### Get Moon Phase

**Operation**: `getMoonPhase`
**Type**: Query
**Access**: Public (no authentication required)

**Request**:
```graphql
query GetMoonPhase($year: Int!, $month: Int!) {
  getMoonPhase(year: $year, month: $month)
}
```

**Input Variables**:
```json
{
  "year": 2025,
  "month": 1
}
```

**Response**:
```json
{
  "data": {
    "getMoonPhase": "[{\"date\":\"2025-01-01\",\"phase\":\"waning_crescent\",\"illumination\":0.12},{\"date\":\"2025-01-06\",\"phase\":\"new_moon\",\"illumination\":0.0}]"
  }
}
```

---

## Subscriptions (Real-time Updates)

### Subscribe to Measurement Creation

**Operation**: `onCreateMeasurement`
**Type**: Subscription
**Access**: Owner only

**Request**:
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

### Subscribe to User Updates

**Operation**: `onUpdateUser`
**Type**: Subscription
**Access**: Owner only

**Request**:
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

### Subscribe to User Progress Updates

**Operation**: `onCreateUserProgress`
**Type**: Subscription
**Access**: Owner only

**Request**:
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

## DataStore Sync Operations

### Sync RACIMOs

**Operation**: `syncRACIMOS`
**Type**: Query
**Access**: Authenticated users

**Request**:
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

**Usage**: Called automatically by AWS Amplify DataStore for offline sync

---

## Error Handling

### Common Error Responses

#### Authentication Error
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

#### Validation Error
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

#### Conflict Error (Optimistic Locking)
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

#### Not Found Error
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

## Pagination

All list operations support pagination:

```graphql
query ListMeasurements($nextToken: String, $limit: Int) {
  listMeasurements(nextToken: $nextToken, limit: $limit) {
    items {
      id
      type
      ts
    }
    nextToken  # Use this for next page
  }
}
```

**First Page**:
```json
{
  "limit": 50
}
```

**Subsequent Pages**:
```json
{
  "limit": 50,
  "nextToken": "eyJ2ZXJzaW9uIjoyLCJ0b2tlbiI6IkFRSUNBSGlx..."
}
```

---

## Rate Limits

- **Queries**: 1000 requests per second
- **Mutations**: 500 requests per second
- **Subscriptions**: 1000 concurrent connections
- **Burst capacity**: 2000 requests

---

## Best Practices

### 1. Use DataStore Instead of Direct API Calls
```typescript
// ✅ Preferred: Use DataStore
const measurements = await DataStore.query(Measurement, m =>
  m.uvaID.eq('uva-123')
);

// ❌ Avoid: Direct GraphQL calls
// (unless you need specific optimizations)
```

### 2. Leverage Optimistic Updates
DataStore handles optimistic UI updates automatically - UI updates immediately while sync happens in background.

### 3. Use Pagination for Large Datasets
Always use `limit` and `nextToken` when querying large collections.

### 4. Filter on Indexed Fields
Use `uvaID`, `userID`, and `ts` for efficient filtering (they have GSIs).

### 5. Batch Mutations
When creating multiple records, use batch operations if available or throttle requests.

---

## SDK Usage Examples

### TypeScript/Angular Example

```typescript
import { DataStore } from 'aws-amplify/datastore';
import { Measurement } from '@/models';

// Create measurement
const newMeasurement = await DataStore.save(
  new Measurement({
    type: 'temperature',
    data: JSON.stringify({ value: 23.5, unit: 'celsius' }),
    ts: new Date().toISOString(),
    task: 'daily-temp-check',
    uvaID: 'uva-123'
  })
);

// Query measurements
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

// Subscribe to changes
const subscription = DataStore.observe(Measurement).subscribe(msg => {
  console.log('Measurement changed:', msg.model, msg.opType);
});
```

---

## GraphQL Schema Location

The full GraphQL schema is defined in:
- **File**: `amplify/backend/api/<api-name>/schema.graphql`
- **Auto-generated types**: `src/API.ts`
- **Models**: `src/models/`
- **Operations**: `src/graphql/queries.ts`, `mutations.ts`, `subscriptions.ts`
