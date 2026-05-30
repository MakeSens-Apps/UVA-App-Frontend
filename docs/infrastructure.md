# Infrastructure Documentation

## Overview

UVA-App leverages a **serverless, cloud-native architecture** built entirely on AWS managed services. The infrastructure is provisioned and managed through **AWS Amplify CLI**, following infrastructure-as-code principles.

---

## Cloud Provider

**Amazon Web Services (AWS)**
- **Primary Region**: `us-east-1` (N. Virginia)
- **Management Tool**: AWS Amplify CLI
- **Deployment Model**: Serverless (no server management)

---

## AWS Services Architecture

### High-Level Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Application                       │
│                  (Angular + Ionic + Capacitor)              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      AWS Amplify                             │
│              (Configuration & Orchestration)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  AWS Cognito │ │ AWS AppSync  │ │   AWS S3     │
│    (Auth)    │ │  (GraphQL)   │ │  (Storage)   │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
                        ▼
                ┌──────────────┐
                │  DynamoDB    │
                │  (Database)  │
                └──────────────┘
                        │
                        ▼
                ┌──────────────┐
                │ CloudWatch   │
                │ (Monitoring) │
                └──────────────┘
```

---

## AWS Services Breakdown

### 1. AWS Amplify

**Purpose**: Backend infrastructure orchestration and frontend hosting

#### Features Used
- **Amplify CLI**: Infrastructure provisioning and management
- **Amplify DataStore**: Offline-first data synchronization
- **Amplify Auth**: Authentication integration with Cognito
- **Amplify Storage**: S3 integration for file uploads
- **Amplify Analytics**: User behavior tracking

#### Configuration
- **Config File**: `amplify/cli.json`
- **Team Config**: `amplify/team-provider-info.json`
- **Feature Flags**: GraphQL Transformer V2 enabled

#### Key Configurations
```json
{
  "features": {
    "graphqltransformer": {
      "transformerVersion": 2,
      "useExperimentalPipelinedTransformer": false
    }
  }
}
```

---

### 2. AWS Cognito

**Purpose**: User authentication and authorization

#### Service Type
**Amazon Cognito User Pools**

#### Authentication Flow
- **Primary Method**: Phone number authentication
- **Verification**: SMS OTP (One-Time Password)
- **MFA**: Enabled for enhanced security
- **Token Management**: JWT tokens (Access, ID, Refresh)

#### User Pool Configuration

| Setting | Value |
|---------|-------|
| Username Attribute | Phone Number |
| Phone Verification | Required (SMS) |
| MFA | Optional/Required |
| Password Policy | N/A (phone-only auth) |
| Token Validity | Access: 1 hour, Refresh: 30 days |
| User Attributes | phone_number, name, email (optional) |

#### Required Permissions
- `cognito-idp:InitiateAuth`
- `cognito-idp:RespondToAuthChallenge`
- `cognito-idp:GetUser`
- `cognito-idp:SignUp`
- `cognito-idp:ConfirmSignUp`

#### Security Features
- SMS rate limiting
- Account takeover protection
- Advanced security (risk-based adaptive auth)
- Compromised credentials detection

---

### 3. AWS AppSync

**Purpose**: Managed GraphQL API with real-time capabilities

#### Service Type
**AWS AppSync GraphQL API**

#### Configuration

| Setting | Value |
|---------|-------|
| API Type | GraphQL |
| Region | us-east-1 |
| API ID | uqr6xntysfa3lbguhirvcj3pa4 |
| Schema Version | GraphQL Transformer V2 |
| Real-time | WebSocket subscriptions enabled |
| Caching | API-level caching (configurable) |

#### Authorization Modes
1. **Amazon Cognito User Pools** (Primary)
   - For authenticated user operations
   - Owner-based access control

2. **API Key** (Secondary - for public queries)
   - For moon phase data
   - Public read-only access

#### Conflict Resolution
- **Strategy**: Auto-merge with optimistic locking
- **Version Field**: `_version` on all models
- **Detection**: Server-side conflict detection
- **Resolution**: Last-write-wins with version checks

#### DataStore Sync
- **Base Latency**: ~20ms
- **Sync Interval**: Real-time (WebSocket) + periodic (60s)
- **Sync Models**: All (RACIMO, UVA, User, Measurement, UserProgress)

---

### 4. Amazon DynamoDB

**Purpose**: Primary NoSQL database for application data

#### Tables

| Table | Purpose | Partition Key | GSIs |
|-------|---------|---------------|------|
| RACIMO | Project/cluster data | id | LinkageCode |
| UVA | Agricultural unit data | id | userID, racimoID |
| User | User profiles | id | PhoneNumber, uvaID |
| Measurement | Time-series data | id | uvaID+ts |
| UserProgress | Gamification data | id | userID+ts |

#### Capacity Configuration
- **Billing Mode**: On-Demand (pay-per-request)
- **Auto Scaling**: Automatic (managed by AWS)
- **Read Capacity**: Unlimited (throttled at account limits)
- **Write Capacity**: Unlimited (throttled at account limits)

#### Features Enabled
- **Point-in-Time Recovery (PITR)**: Enabled (35-day retention)
- **Encryption**: AWS-managed keys (SSE)
- **Streams**: Enabled (for AppSync sync)
- **TTL**: Not configured (future use)
- **Global Tables**: Not configured (single-region)

#### Performance
- **Average Latency**: <10ms (p50), <20ms (p99)
- **Throughput**: Scales automatically
- **Hot Partitions**: Avoided via user/UVA scoping

---

### 5. Amazon S3

**Purpose**: Object storage for user-uploaded files

#### Buckets

| Bucket | Purpose | Access Level | Lifecycle |
|--------|---------|--------------|-----------|
| `uva-app-storage-{env}` | User profile pictures | Private | No expiration |
| `uva-app-public-{env}` | Public assets (future) | Public read | No expiration |

#### S3 Configuration

| Setting | Value |
|---------|-------|
| Versioning | Enabled |
| Encryption | AES-256 (SSE-S3) |
| Public Access | Blocked (default) |
| CORS | Enabled for app domain |
| Access Control | IAM + Cognito |

#### File Organization
```
s3://uva-app-storage-{env}/
├── public/              # Public read access
│   └── assets/
├── protected/           # Protected (any auth user)
│   └── shared/
└── private/             # Private (owner only)
    └── {cognito-id}/
        ├── profile-pictures/
        └── measurement-attachments/
```

#### Access Patterns
- **Upload**: Client → Amplify → S3 (pre-signed URL)
- **Download**: Client → Amplify → S3 (pre-signed URL)
- **Authorization**: Cognito identity pool credentials

---

### 6. Amazon CloudWatch

**Purpose**: Monitoring, logging, and alerting

#### Logs

| Log Group | Source | Retention |
|-----------|--------|-----------|
| `/aws/appsync/{api-id}` | AppSync GraphQL logs | 7 days |
| `/aws/lambda/{function-name}` | Lambda resolvers (if any) | 7 days |
| `/aws/amplify/{app-id}` | Amplify backend logs | 7 days |

#### Metrics Tracked
- **AppSync**: Request count, latency, errors, resolver performance
- **DynamoDB**: Read/write units, throttles, latency
- **Cognito**: Sign-ups, sign-ins, failed authentications
- **S3**: Requests, data transfer, errors

#### Alarms (Recommended Setup)
- High API error rate (> 5%)
- DynamoDB throttling
- Cognito authentication failures spike
- S3 4xx/5xx error rate increase

---

### 7. AWS Pinpoint (Analytics)

**Purpose**: User analytics and engagement tracking

#### Analytics Events
- **Session Start**: User opens app
- **Session Stop**: User closes app
- **Page Views**: Navigation tracking
- **Custom Events**: Measurement submissions, achievements unlocked

#### Data Collected
- Device information (model, OS version)
- App version
- User demographics (if provided)
- Engagement metrics (DAU, MAU, session duration)

---

## Infrastructure as Code (IaC)

### Amplify Configuration Files

| File | Purpose |
|------|---------|
| `amplify/cli.json` | Amplify CLI feature flags and settings |
| `amplify/team-provider-info.json` | Environment-specific configurations |
| `amplify/backend/api/{api-name}/schema.graphql` | GraphQL schema definition |
| `amplify/backend/auth/{auth-name}/parameters.json` | Cognito configuration |
| `amplify/backend/storage/{storage-name}/parameters.json` | S3 configuration |

### Deployment Commands

```bash
# Pull backend config from cloud
amplify pull

# Push local changes to cloud
amplify push

# Add new resource
amplify add <category>

# Update existing resource
amplify update <category>

# Check status
amplify status

# View environment info
amplify env list
```

---

## Environments

### Environment Strategy

| Environment | Purpose | Branch | Auto-Deploy |
|-------------|---------|--------|-------------|
| Development | Dev/testing | develop | No |
| Staging | Pre-production | staging | Yes (optional) |
| Production | Live app | main | Yes (manual approval) |

### Environment Variables

**Managed by Amplify** (no manual config needed):
- `AWS_REGION`
- `API_ENDPOINT`
- `AUTH_REGION`
- `USER_POOL_ID`
- `WEB_CLIENT_ID`
- `IDENTITY_POOL_ID`
- `S3_BUCKET`

---

## Networking & Security

### Network Configuration
- **VPC**: Not required (serverless)
- **Subnets**: Managed by AWS
- **NAT Gateway**: Not required
- **Internet Gateway**: Managed by AWS

### Security Groups
Not applicable (serverless services)

### IAM Roles & Policies

#### Amplify Backend Role
- **DynamoDB**: Read/Write on all tables
- **S3**: Read/Write/Delete on storage buckets
- **AppSync**: Execute API operations
- **CloudWatch**: Write logs

#### Cognito Identity Pool Roles

**Authenticated Users**:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObject"
  ],
  "Resource": [
    "arn:aws:s3:::uva-app-storage-{env}/private/${cognito-identity.amazonaws.com:sub}/*"
  ]
}
```

**Unauthenticated Users**:
- No permissions (no unauthenticated access)

---

## CI/CD Pipeline

### Build Process

```
Code Commit (GitHub)
    ↓
GitHub Actions / Amplify Console
    ↓
Install Dependencies (npm install)
    ↓
Run Tests (npm test)
    ↓
Build Frontend (ng build --prod)
    ↓
Amplify Push (amplify push --yes)
    ↓
Capacitor Copy (cap copy)
    ↓
Android Build (gradlew assembleRelease)
    ↓
Deployment Complete
```

### Deployment Targets

#### Web (Future)
- **Service**: AWS Amplify Hosting
- **URL**: `https://{branch}.{app-id}.amplifyapp.com`
- **SSL**: Managed by Amplify (free)

#### Mobile (Current)
- **Android**: Manual APK/AAB upload to Google Play
- **iOS**: Future - App Store deployment

---

## Costs & Pricing

### Estimated Monthly Costs (100 users)

| Service | Usage | Cost |
|---------|-------|------|
| **Cognito** | 100 users, 3000 auth/month | $0 (free tier) |
| **AppSync** | 300K requests/month | $1.20 |
| **DynamoDB** | 1M reads, 500K writes | $0.50 |
| **S3** | 10GB storage, 1K requests | $0.25 |
| **CloudWatch** | 5GB logs, 10 alarms | $0.50 |
| **Data Transfer** | 5GB/month | $0.45 |
| **Total** | | **~$3/month** |

### Scaling Costs (10,000 users)

| Service | Usage | Cost |
|---------|-------|------|
| **Cognito** | 10K users, 300K auth/month | $275 |
| **AppSync** | 30M requests/month | $120 |
| **DynamoDB** | 100M reads, 50M writes | $50 |
| **S3** | 1TB storage, 100K requests | $24 |
| **CloudWatch** | 50GB logs, 50 alarms | $2.50 |
| **Data Transfer** | 500GB/month | $45 |
| **Total** | | **~$517/month** |

---

## Disaster Recovery

### Backup Strategy

#### DynamoDB
- **PITR**: 35-day point-in-time recovery
- **On-demand backups**: Manual before major changes
- **Cross-region replication**: Not configured (future)

#### S3
- **Versioning**: Enabled
- **Lifecycle policies**: None (all data retained)
- **Cross-region replication**: Not configured

#### Cognito
- **User pool export**: Manual export to S3 (periodic)
- **User attributes**: Backed up with DynamoDB

### Recovery Time Objective (RTO)
- **Target RTO**: < 4 hours
- **Target RPO**: < 1 hour (via PITR)

### Disaster Scenarios

| Scenario | Recovery Plan | RTO |
|----------|--------------|-----|
| DynamoDB table corruption | Restore from PITR | 1-2 hours |
| S3 bucket deleted | Restore from versioning | 30 min |
| Cognito user pool deleted | Recreate + import backup | 2-4 hours |
| AppSync API misconfigured | Revert via Amplify CLI | 15 min |
| Regional outage | Failover to secondary region | N/A (future) |

---

## Monitoring & Alerts

### Health Check Endpoints

**AppSync Health**:
```graphql
query HealthCheck {
  listRACIMOS(limit: 1) {
    items { id }
  }
}
```

### Key Performance Indicators (KPIs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Latency (p99) | < 500ms | > 1000ms |
| API Error Rate | < 0.1% | > 1% |
| DynamoDB Throttles | 0 | > 5/min |
| Cognito Auth Success | > 99% | < 95% |
| S3 Upload Success | > 99.9% | < 99% |

---

## Security & Compliance

### Data Encryption
- **At Rest**: All data encrypted (DynamoDB, S3, Cognito)
- **In Transit**: TLS 1.2+ for all communications
- **Keys**: AWS-managed keys (KMS)

### Access Control
- **Multi-factor Authentication (MFA)**: Enabled for admin users
- **Least Privilege**: IAM roles follow principle of least privilege
- **Resource Policies**: S3 bucket policies restrict access

### Compliance Considerations
- **GDPR**: User data export and deletion capabilities
- **Data Residency**: us-east-1 (consider regional requirements)
- **Audit Logging**: CloudTrail for infrastructure changes

---

## Scaling Considerations

### Horizontal Scaling
All services auto-scale:
- **AppSync**: Concurrent connections scale automatically
- **DynamoDB**: On-demand scaling to millions of requests/sec
- **S3**: Unlimited storage and throughput
- **Cognito**: Millions of users supported

### Vertical Scaling
Not applicable (serverless)

### Performance Optimization
- Use GSIs for efficient queries
- Enable AppSync caching for read-heavy queries
- Implement CDN for static assets (future)
- Batch operations where possible

---

## Maintenance & Updates

### Regular Maintenance Tasks
- Review CloudWatch logs weekly
- Update Amplify dependencies monthly
- Rotate API keys quarterly (if using)
- Review IAM permissions quarterly
- Test disaster recovery plan bi-annually

### Update Process
1. Update in development environment
2. Test thoroughly
3. Deploy to staging
4. Run smoke tests
5. Deploy to production (off-peak hours)
6. Monitor for 24 hours

---

## Native Platform Configuration

### Android

**Build Configuration**:
- **Package ID**: `com.makesens.uvaapp`
- **Min SDK**: 22 (Android 5.1)
- **Target SDK**: 34 (Android 14)
- **Build Tool**: Gradle 8.x

**Required Permissions**:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

**Google Services**:
- Firebase Cloud Messaging (push notifications)
- Google Analytics (analytics tracking)

---

## Troubleshooting

### Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Not Authorized" errors | Expired JWT token | Re-authenticate user |
| Sync conflicts | Concurrent updates | Auto-resolved by DataStore |
| DynamoDB throttling | High burst traffic | Enable on-demand billing |
| S3 upload failures | Network timeout | Implement retry logic |
| AppSync errors | Schema mismatch | Run `amplify codegen` |

---

## Resource Naming Conventions

```
{service}-{app-name}-{env}-{resource-type}

Examples:
- appsync-uvaapp-prod-api
- dynamodb-uvaapp-prod-racimo
- s3-uvaapp-prod-storage
- cognito-uvaapp-prod-userpool
```

---

## Documentation & Support

### AWS Documentation
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [AppSync Developer Guide](https://docs.aws.amazon.com/appsync/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)

### Infrastructure Diagram Tools
- AWS Architecture Icons
- draw.io / Lucidchart
- Amplify Console (visual resource map)

---

## Migration Path

### Future Infrastructure Improvements
1. **Multi-region deployment** for high availability
2. **CloudFront CDN** for web assets
3. **ElastiCache** for caching layer
4. **Lambda functions** for complex business logic
5. **Step Functions** for orchestrated workflows
6. **AWS WAF** for API security
7. **AWS Backup** for centralized backup management
