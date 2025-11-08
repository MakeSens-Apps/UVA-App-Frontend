# Database Documentation

## Database Overview

### Database Type
**Amazon DynamoDB** - NoSQL database accessed via AWS AppSync GraphQL API and managed by AWS Amplify DataStore.

### Key Characteristics
- **Fully managed**: No server maintenance
- **Scalable**: Auto-scaling based on demand
- **High availability**: Multi-AZ replication
- **Consistent**: Eventual consistency with conflict resolution
- **Serverless**: Pay per request pricing model

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────┐
│   RACIMO    │
│ (Project)   │
└──────┬──────┘
       │ 1
       │
       │ N
       ▼
┌─────────────┐         ┌──────────────┐
│     UVA     │ 1 ───► 1│     User     │
│ (Unit/Farm) │         │              │
└──────┬──────┘         └──────┬───────┘
       │ 1                     │ 1
       │                        │
       │ N                      │ N
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│ Measurement │         │UserProgress  │
│             │         │              │
└─────────────┘         └──────────────┘
```

---

## Table Schemas

### 1. RACIMO Table

**Purpose**: Stores project/cluster information for multi-tenant organization

**Table Name**: `RACIMO-<env>-<api-id>`

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (ID) | ✅ | Unique identifier (UUID) |
| `Name` | String | ✅ | Project name |
| `LinkageCode` | String | ✅ | 8-character unique code for joining |
| `Configuration` | String (JSON) | ❌ | JSON configuration (timezone, fields, etc.) |
| `createdAt` | AWSDateTime | ✅ | Record creation timestamp |
| `updatedAt` | AWSDateTime | ✅ | Last update timestamp |
| `_version` | Int | ✅ | Version for optimistic locking |
| `_deleted` | Boolean | ❌ | Soft delete flag |
| `_lastChangedAt` | AWSTimestamp | ✅ | Last sync timestamp |

#### Partition Key
- `id` (Primary Key)

#### Global Secondary Indexes
- **LinkageCodeIndex**: `LinkageCode` (for quick lookups by code)

#### Sample Record
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

### 2. UVA Table

**Purpose**: Stores agricultural units (vineyard sections) with location data

**Table Name**: `UVA-<env>-<api-id>`

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (ID) | ✅ | Unique identifier (UUID) |
| `latitude` | String | ❌ | Geographic latitude |
| `longitude` | String | ❌ | Geographic longitude |
| `altitude` | String | ❌ | Altitude in meters |
| `fields` | String (JSON) | ❌ | Field configuration as JSON |
| `enabled` | Boolean | ❌ | Active status (default: true) |
| `createdAt` | AWSDateTime | ❌ | Record creation timestamp |
| `userID` | String (ID) | ✅ | Foreign key to User |
| `racimoID` | String (ID) | ✅ | Foreign key to RACIMO |
| `updatedAt` | AWSDateTime | ✅ | Last update timestamp |
| `_version` | Int | ✅ | Version for optimistic locking |
| `_deleted` | Boolean | ❌ | Soft delete flag |
| `_lastChangedAt` | AWSTimestamp | ✅ | Last sync timestamp |

#### Partition Key
- `id` (Primary Key)

#### Global Secondary Indexes
- **byUser**: `userID` (for user's UVA lookup)
- **byRACIMO**: `racimoID` (for listing all UVAs in a project)

#### Relationships
- **User**: One-to-one (each UVA belongs to one User)
- **RACIMO**: Many-to-one (many UVAs belong to one RACIMO)

#### Sample Record
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

### 3. User Table

**Purpose**: Stores user profile and authentication information

**Table Name**: `User-<env>-<api-id>`

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (ID) | ✅ | Unique identifier (Cognito sub) |
| `Name` | String | ✅ | First name |
| `LastName` | String | ✅ | Last name |
| `PhoneNumber` | String | ✅ | Phone (authentication username) |
| `Email` | String | ❌ | Email address (optional) |
| `Rank` | String | ❌ | Gamification rank (Bronze/Silver/Gold) |
| `uvaID` | String (ID) | ❌ | Foreign key to UVA |
| `createdAt` | AWSDateTime | ✅ | Account creation timestamp |
| `updatedAt` | AWSDateTime | ✅ | Last update timestamp |
| `_version` | Int | ✅ | Version for optimistic locking |
| `_deleted` | Boolean | ❌ | Soft delete flag |
| `_lastChangedAt` | AWSTimestamp | ✅ | Last sync timestamp |

#### Partition Key
- `id` (Primary Key)

#### Global Secondary Indexes
- **byPhoneNumber**: `PhoneNumber` (for login lookup)
- **byUVA**: `uvaID` (for UVA owner lookup)

#### Relationships
- **UVA**: One-to-one (each user has one UVA)

#### Sample Record
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

### 4. Measurement Table

**Purpose**: Stores time-series measurement data collected by users

**Table Name**: `Measurement-<env>-<api-id>`

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (ID) | ✅ | Unique identifier (UUID) |
| `type` | String | ✅ | Measurement type (e.g., "temperature", "humidity") |
| `data` | String (JSON) | ❌ | Measurement data as JSON |
| `logs` | String (JSON) | ❌ | Metadata/logs as JSON |
| `ts` | AWSDateTime | ✅ | Timestamp of measurement |
| `task` | String | ❌ | Associated task identifier |
| `uvaID` | String (ID) | ✅ | Foreign key to UVA |
| `owner` | String | ❌ | Cognito username (for auth) |
| `createdAt` | AWSDateTime | ✅ | Record creation timestamp |
| `updatedAt` | AWSDateTime | ✅ | Last update timestamp |
| `_version` | Int | ✅ | Version for optimistic locking |
| `_deleted` | Boolean | ❌ | Soft delete flag |
| `_lastChangedAt` | AWSTimestamp | ✅ | Last sync timestamp |

#### Partition Key
- `id` (Primary Key)

#### Global Secondary Indexes
- **byUVAandTs**: `uvaID` (Partition Key) + `ts` (Sort Key)
  - **Purpose**: Query measurements by UVA and date range
  - **Use case**: Historical data queries, charts, analytics

#### Relationships
- **UVA**: Many-to-one (many measurements belong to one UVA)

#### Sample Record
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

### 5. UserProgress Table

**Purpose**: Tracks gamification progress (seeds, streaks, milestones)

**Table Name**: `UserProgress-<env>-<api-id>`

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (ID) | ✅ | Unique identifier (UUID) |
| `ts` | String | ✅ | Date of progress (YYYY-MM-DD) |
| `Seed` | Int | ❌ | Seeds earned on this date |
| `Streak` | Int | ❌ | Current streak count |
| `Milestones` | String (JSON) | ❌ | Achieved milestones as JSON |
| `SaveStreak` | Boolean | ❌ | Streak saver used flag |
| `completedTasks` | Int | ❌ | Number of tasks completed |
| `additionalInfo` | String (JSON) | ❌ | Extra metadata as JSON |
| `userID` | String (ID) | ✅ | Foreign key to User |
| `createdAt` | AWSDateTime | ✅ | Record creation timestamp |
| `updatedAt` | AWSDateTime | ✅ | Last update timestamp |
| `_version` | Int | ✅ | Version for optimistic locking |
| `_deleted` | Boolean | ❌ | Soft delete flag |
| `_lastChangedAt` | AWSTimestamp | ✅ | Last sync timestamp |

#### Partition Key
- `id` (Primary Key)

#### Global Secondary Indexes
- **byUserAndDate**: `userID` (Partition Key) + `ts` (Sort Key)
  - **Purpose**: Query progress history by user and date range
  - **Use case**: Progress charts, streak calculations

#### Relationships
- **User**: Many-to-one (many progress records belong to one user)

#### Sample Record
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

## Indexes Summary

### Primary Indexes (Partition Keys)

| Table | Partition Key | Sort Key | Purpose |
|-------|---------------|----------|---------|
| RACIMO | `id` | - | Unique project lookup |
| UVA | `id` | - | Unique UVA lookup |
| User | `id` | - | Unique user lookup |
| Measurement | `id` | - | Unique measurement lookup |
| UserProgress | `id` | - | Unique progress record lookup |

### Global Secondary Indexes (GSI)

| Table | Index Name | Partition Key | Sort Key | Purpose |
|-------|-----------|---------------|----------|---------|
| RACIMO | LinkageCodeIndex | `LinkageCode` | - | Find RACIMO by linkage code |
| UVA | byUser | `userID` | - | Find user's UVA |
| UVA | byRACIMO | `racimoID` | - | List all UVAs in a project |
| User | byPhoneNumber | `PhoneNumber` | - | Login lookup |
| User | byUVA | `uvaID` | - | Find UVA owner |
| Measurement | byUVAandTs | `uvaID` | `ts` | Query measurements by date range |
| UserProgress | byUserAndDate | `userID` | `ts` | Query progress history |

---

## Data Relationships

### One-to-Many Relationships

```
RACIMO (1) ───────► UVA (N)
  └─ Each RACIMO has many UVAs

UVA (1) ───────────► Measurement (N)
  └─ Each UVA has many measurements

User (1) ──────────► UserProgress (N)
  └─ Each user has many progress records
```

### One-to-One Relationships

```
User (1) ◄────────► UVA (1)
  └─ Each user has exactly one UVA
  └─ Each UVA belongs to exactly one user
```

---

## Data Consistency & Conflict Resolution

### Optimistic Locking
All tables use `_version` field for optimistic locking:
- Every update increments `_version`
- Mutations must include current `_version`
- Conflicts occur when versions don't match

### Conflict Resolution Strategy
AWS Amplify DataStore uses **Auto-Merge** strategy:
1. Server data takes precedence for conflicts
2. Client receives conflict notification
3. App can implement custom resolution logic

### Soft Deletes
All tables support soft deletes via `_deleted` flag:
- Records are marked `_deleted: true` instead of physical deletion
- Allows sync across devices
- Can be purged after sync window

---

## Data Access Patterns

### 1. User Login Flow
```
Query: byPhoneNumber GSI
Input: PhoneNumber
Output: User record
```

### 2. Load User Dashboard
```
1. Get User by id (from auth)
2. Get UVA by userID (byUser GSI)
3. Get RACIMO by racimoID
4. Get recent Measurements (byUVAandTs GSI, last 30 days)
5. Get UserProgress (byUserAndDate GSI, last 7 days)
```

### 3. Record Measurement
```
1. Create Measurement record with uvaID
2. Query latest UserProgress for today
3. Update or Create UserProgress (increment seeds, streak)
```

### 4. Join RACIMO via Code
```
1. Query RACIMO by LinkageCode (LinkageCodeIndex GSI)
2. Validate code exists
3. Create UVA with racimoID
4. Update User with uvaID
```

### 5. View Historical Data
```
Query: byUVAandTs GSI
Filter: uvaID + ts (date range)
Sort: ts DESC
Limit: 100 (paginated)
```

---

## Storage Estimates

### Record Size Estimates

| Table | Avg Size per Record | Records per User/Year | Total Size/User/Year |
|-------|---------------------|----------------------|---------------------|
| User | 0.5 KB | 1 | 0.5 KB |
| UVA | 1 KB | 1 | 1 KB |
| RACIMO | 1 KB | 0.1 (shared) | 0.1 KB |
| Measurement | 2 KB | 365 * 5 tasks = 1,825 | 3.65 MB |
| UserProgress | 1 KB | 365 | 365 KB |
| **Total** | - | - | **~4 MB per user/year** |

### Scaling Projections

| Users | Storage/Year | Read Units/Sec | Write Units/Sec |
|-------|-------------|----------------|-----------------|
| 100 | 400 MB | 50 | 20 |
| 1,000 | 4 GB | 500 | 200 |
| 10,000 | 40 GB | 5,000 | 2,000 |
| 100,000 | 400 GB | 50,000 | 20,000 |

---

## Backup & Recovery

### Automated Backups
- **Point-in-Time Recovery (PITR)**: Enabled for all tables
- **Retention**: 35 days
- **Recovery**: Can restore to any point within retention window

### On-Demand Backups
- Manual backups created before major schema changes
- Retained indefinitely until manually deleted

---

## Data Migration

### Schema Updates
1. Update GraphQL schema in `amplify/backend/api/schema.graphql`
2. Run `amplify push` to deploy changes
3. DynamoDB tables updated automatically
4. Client models regenerated (`src/models/`)

### Data Transformations
- Use AWS AppSync resolvers for data transformation
- AWS Lambda functions for complex migrations
- DataStore handles schema versioning automatically

---

## Performance Optimization

### Query Optimization
1. **Use GSIs**: Always query using indexed fields
2. **Limit results**: Use pagination with `limit` parameter
3. **Project fields**: Only request needed fields in GraphQL
4. **Batch reads**: Use DataStore batch queries when possible

### Write Optimization
1. **Batch writes**: Group related mutations
2. **Conditional writes**: Use conditions to prevent overwrites
3. **Avoid hot partitions**: Distribute writes across multiple UVAs

---

## Data Retention & Archival

### Active Data
- **Measurements**: Last 2 years kept in main table
- **UserProgress**: All historical data retained
- **Soft-deleted records**: Purged after 30 days

### Archival Strategy (Future)
- Move measurements older than 2 years to S3
- Use DynamoDB TTL for automatic cleanup
- Export to data lake for long-term analytics

---

## Security & Access Control

### Table-Level Security
- All tables encrypted at rest (AWS managed keys)
- Encrypted in transit (TLS 1.2+)

### Row-Level Security (RLS)
Implemented via AppSync resolvers:
- **User**: Only access own record
- **UVA**: Owner and RACIMO members
- **Measurement**: Owner and RACIMO members
- **UserProgress**: Owner only
- **RACIMO**: Members only

### Authorization Rules (GraphQL Schema)
```graphql
@auth(rules: [
  { allow: owner, ownerField: "owner" },
  { allow: private, operations: [read] }
])
```

---

## Monitoring & Metrics

### Key Metrics to Monitor
- Read/Write capacity units consumed
- Throttled requests
- User errors vs. system errors
- Average item size
- GSI consumption

### CloudWatch Alarms
- High throttle rate (> 5%)
- Error rate spike (> 1%)
- Latency increase (> 100ms p99)

---

## Database Schema File

The authoritative schema is defined in:
- **File**: `amplify/backend/api/<api-name>/schema.graphql`
- **Generated models**: `src/models/`
- **TypeScript types**: `src/API.ts`
