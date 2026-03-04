# Architecture Documentation

## System Overview

PalawanPay S3 Browser is a serverless web application that provides secure access to S3 buckets across multiple AWS accounts through a unified interface.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Layer                                │
│  ┌────────────┐                                                   │
│  │   Browser  │                                                   │
│  └─────┬──────┘                                                   │
└────────┼────────────────────────────────────────────────────────┘
         │
         │ HTTPS
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AWS Amplify + CloudFront                                 │   │
│  │  - React SPA                                              │   │
│  │  - Static asset hosting                                   │   │
│  │  - SSL/TLS termination                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────┬─────────────────────────────────────────────────────────┘
         │
         │ OAuth 2.0 / SAML
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Authentication Layer                            │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Amazon Cognito                                         │     │
│  │  ┌──────────────┐  ┌─────────────────┐                │     │
│  │  │  User Pool   │  │  Identity Pool  │                │     │
│  │  └──────┬───────┘  └────────┬────────┘                │     │
│  └─────────┼───────────────────┼─────────────────────────┘     │
│            │                   │                                 │
│            │ SAML 2.0          │ AWS Credentials                │
│            ▼                   ▼                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  IAM Identity Center                                    │     │
│  │  - SAML Identity Provider                               │     │
│  │  - Entra ID Integration                                 │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
         │
         │ JWT Token
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      API Layer                                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  API Gateway (HTTP API)                                 │     │
│  │  - JWT Authorizer                                       │     │
│  │  - CORS Configuration                                   │     │
│  │  - Request routing                                      │     │
│  └──────────────────┬─────────────────────────────────────┘     │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      │ Invoke
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                           │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  AWS Lambda (s3browser-operations)                      │     │
│  │  - Python 3.11                                          │     │
│  │  - Cross-account role assumption                        │     │
│  │  - Permission checking                                  │     │
│  │  - S3 operations                                        │     │
│  └──────────────────┬───────────────────────────────────┬─┘     │
└─────────────────────┼───────────────────────────────────┼───────┘
                      │                                   │
                      │ AssumeRole                        │ S3 API
                      ▼                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Storage Layer                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  Account       │  │  Account       │  │  Account       │    │
│  │  821276124335  │  │  730335474290  │  │  684538810129  │    │
│  │                │  │                │  │                │    │
│  │  ┌──────────┐  │  │  ┌──────────┐  │  │  ┌──────────┐  │    │
│  │  │ S3       │  │  │  │ S3       │  │  │  │ S3       │  │    │
│  │  │ Buckets  │  │  │  │ Buckets  │  │  │  │ Buckets  │  │    │
│  │  └──────────┘  │  │  └──────────┘  │  │  └──────────┘  │    │
│  │                │  │                │  │                │    │
│  │  ┌──────────┐  │  │  ┌──────────┐  │  │  ┌──────────┐  │    │
│  │  │ Cross-   │  │  │  │ Cross-   │  │  │  │ Cross-   │  │    │
│  │  │ Account  │  │  │  │ Account  │  │  │  │ Account  │  │    │
│  │  │ Role     │  │  │  │ Role     │  │  │  │ Role     │  │    │
│  │  └──────────┘  │  │  └──────────┘  │  │  └──────────┘  │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (React SPA)

**Technology**: React 18 with React Router

**Key Components**:
- `App.js`: Main application component with custom authentication UI
  - Custom login page with full-screen green gradient
  - Hides default Amplify UI forms
  - Auto-redirects to IAM Identity Center
- `BucketList.js`: Displays all accessible buckets with 60-second caching
- `BucketView.js`: Shows files within a bucket, handles upload/download

**State Management**: React hooks (useState, useEffect)

**Authentication**: AWS Amplify Authenticator component (heavily customized)

**Caching**: In-memory cache for bucket list (60-second TTL)

**Routing**:
- `/` - Bucket list
- `/bucket/:bucketName` - Bucket contents

### Authentication Flow

1. **User Access**: User navigates to application URL
2. **Amplify Authenticator**: Checks for valid session
3. **No Session**: Displays login UI with IAM Identity Center button
4. **OAuth Redirect**: Redirects to Cognito Hosted UI
5. **SAML Flow**: Cognito redirects to IAM Identity Center
6. **Entra ID Auth**: IAM Identity Center authenticates via Entra ID
7. **SAML Assertion**: Entra ID returns SAML assertion to IAM Identity Center
8. **Token Exchange**: IAM Identity Center returns SAML to Cognito
9. **JWT Tokens**: Cognito issues access, ID, and refresh tokens
10. **Session Established**: User authenticated, tokens stored in browser

### API Layer

**Type**: API Gateway HTTP API (v2)

**Endpoints**:
- `GET /buckets` - List all accessible buckets
- `GET /buckets/{bucket}/objects` - List objects in bucket
- `POST /buckets/{bucket}/upload` - Generate presigned upload URL
- `GET /buckets/{bucket}/download` - Generate presigned download URL

**Authorization**: JWT tokens from Cognito

**CORS**: Configured to allow all origins (can be restricted)

### Lambda Function

**Runtime**: Python 3.11

**Handler**: `s3-operations.lambda_handler`

**Key Functions**:
- `process_account()`: Processes single account in parallel thread
- `get_s3_client()`: Creates S3 client with assumed role credentials
- `list_buckets()`: Uses ThreadPoolExecutor to query all accounts simultaneously
- `list_objects()`: Lists objects in a specific bucket
- `check_permissions()`: Tests read/write access to bucket (used for file operations only)
- `generate_upload_url()`: Creates presigned URL for upload
- `generate_download_url()`: Creates presigned URL for download

**Performance Optimizations**:
- Parallel processing with ThreadPoolExecutor (max 3 workers)
- Simplified permission checks (no test uploads during listing)
- Increased memory allocation (512 MB)

**Environment Variables**: None (configuration in code)

**Timeout**: 30 seconds

**Memory**: 128 MB

### Cross-Account Access

**Mechanism**: STS AssumeRole

**Flow**:
1. Lambda receives request
2. For each configured account:
   - If cross-account role exists, assume it
   - Use temporary credentials to access S3
   - List buckets and check permissions
3. Aggregate results from all accounts
4. Return unified bucket list

**Trust Relationship**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::821276124335:role/LambdaS3BrowserRole"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Security Architecture

### Defense in Depth

1. **Network Layer**: HTTPS only, CloudFront distribution
2. **Authentication**: Multi-factor via Entra ID
3. **Authorization**: JWT tokens, IAM policies
4. **Application**: Permission checking before operations
5. **Data**: Presigned URLs for direct S3 access

### IAM Policies

**Lambda Execution Role** (`LambdaS3BrowserRole`):
- S3 full access (can be restricted to specific buckets)
- CloudWatch Logs write access
- STS AssumeRole for cross-account roles

**Cross-Account Roles** (`S3BrowserCrossAccountRole`):
- S3 full access in respective account
- Trust relationship with Lambda role

**Cognito Authenticated Role**:
- Minimal permissions (not used for S3 access)

### Data Flow Security

1. **User → Frontend**: HTTPS (TLS 1.2+)
2. **Frontend → API Gateway**: HTTPS with JWT
3. **API Gateway → Lambda**: AWS internal network
4. **Lambda → S3**: AWS internal network with IAM credentials
5. **S3 → User**: Presigned URLs (HTTPS)

## Scalability

### Current Limits

- **Concurrent Users**: Limited by Cognito (10,000 MAU free tier)
- **API Requests**: API Gateway (10,000 RPS)
- **Lambda Concurrency**: 1000 concurrent executions (account limit)
- **S3 Operations**: No practical limit

### Scaling Strategies

1. **Horizontal Scaling**: Lambda auto-scales
2. **Caching**: Implement CloudFront caching for static assets
3. **Database**: Add DynamoDB for bucket metadata caching
4. **Async Processing**: Use SQS for bulk operations

## Monitoring and Observability

### CloudWatch Metrics

- Lambda invocations, duration, errors
- API Gateway requests, latency, 4xx/5xx errors
- Cognito sign-ins, sign-in failures

### CloudWatch Logs

- Lambda execution logs
- API Gateway access logs (if enabled)
- Cognito authentication logs

### X-Ray Tracing

Can be enabled for end-to-end request tracing

## Disaster Recovery

### RTO/RPO

- **RTO**: 1 hour (time to redeploy)
- **RPO**: 0 (no data stored in application)

### Backup Strategy

- **Code**: GitHub repository
- **Configuration**: Documented in README
- **Infrastructure**: Infrastructure as Code (manual recreation)

### Recovery Procedures

1. **Frontend**: Redeploy from GitHub via Amplify
2. **Lambda**: Redeploy from source code
3. **API Gateway**: Recreate and link to Lambda
4. **Cognito**: Recreate from documented configuration

## Cost Optimization

### Current Costs (Estimated)

- **Amplify**: $0.01/build + $0.15/GB served
- **Lambda**: Free tier (1M requests/month)
- **API Gateway**: $1.00/million requests
- **Cognito**: Free tier (50,000 MAU)
- **S3**: Standard rates for storage and transfer

### Optimization Tips

1. Use CloudFront caching
2. Implement Lambda reserved concurrency
3. Optimize Lambda memory allocation
4. Use S3 Intelligent-Tiering

## Future Enhancements

1. **Bucket Search**: Full-text search across buckets
2. **File Preview**: In-browser preview for images/documents
3. **Bulk Operations**: Multi-file upload/download
4. **Audit Trail**: Detailed activity logging
5. **Notifications**: Email alerts for uploads
6. **Versioning**: S3 version management
7. **Lifecycle Policies**: UI for managing lifecycle rules
8. **Access Analytics**: Usage dashboards
