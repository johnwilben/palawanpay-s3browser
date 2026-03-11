# What's Deployed on feature/cross-account-access

## Implementation: Lambda-Based Group Filtering (NOT S3 Access Grants)

### Architecture

```
User Login (IAM Identity Center)
    ↓
Cognito User Pool (SAML)
    ↓
JWT Token with cognito:groups claim
    ↓
API Gateway (JWT Authorizer)
    ↓
Lambda reads groups from token
    ↓
Lambda filters buckets based on group patterns
    ↓
Returns filtered bucket list to frontend
```

---

## Deployed in Both Accounts

### Account 821276124335 (Original)
- **Amplify:** https://feature-cross-account-access.drm7arslkowgf.amplifyapp.com
- **API:** https://c9bc3h6l94.execute-api.ap-southeast-1.amazonaws.com/prod
- **Lambda:** s3browser-operations
- **Cross-Account Access:** 730335474290, 684538810129
- **Last Updated:** March 4, 2026 04:14 UTC

### Account 721010870103 (New)
- **Amplify:** https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com
- **API:** https://9th34ei7t8.execute-api.ap-southeast-1.amazonaws.com/prod
- **Lambda:** s3browser-operations
- **Cross-Account Access:** None (only primary account)
- **Last Updated:** March 4, 2026 06:32 UTC

---

## How It Works

### 1. Authentication
- User logs in via IAM Identity Center SSO
- Cognito receives SAML assertion
- Cognito maps IAM Identity Center groups → Cognito groups
- JWT token contains `cognito:groups` claim

### 2. Authorization (Lambda)
```python
# Lambda extracts groups from JWT token
def get_user_groups_from_token(event):
    claims = event['requestContext']['authorizer']['jwt']['claims']
    groups_str = claims.get('cognito:groups', '[]')
    # Returns: ['s3-browser-admin', 's3-browser-datalake', ...]
```

### 3. Bucket Filtering (Lambda)
```python
# Lambda checks if bucket matches group patterns
GROUP_BUCKET_ACCESS = {
    's3-browser-admin': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]
    },
    's3-browser-datalake': {
        'buckets': [{'pattern': 'datalake-*', 'permission': 'write'}]
    },
    's3-browser-finance': {
        'buckets': [
            {'pattern': 'datalake-uat-...-output-common', 'permission': 'read'},
            {'pattern': 'datalake-uat-...-athena', 'permission': 'write'}
        ]
    },
    's3-browser-finance-GL': {
        'buckets': [
            {
                'pattern': 'datalake-uat-...-raw-megalink',
                'permission': 'read',
                'prefix': 'megalink-wkf01/transaction-gl/'  # Folder-level!
            }
        ]
    }
}
```

### 4. Permission Enforcement
- **Read-only groups:** Upload button hidden in UI
- **Write groups:** Upload button shown
- **Folder-level access:** Only shows files in specific prefix
- **Cross-account:** Lambda assumes roles in other accounts

---

## Key Features

### ✅ Implemented
1. **IAM Identity Center SSO** - Single sign-on for all users
2. **Cognito Group Mapping** - Automatic group sync
3. **JWT Token Authorization** - API Gateway validates tokens
4. **Lambda-Based Filtering** - Flexible bucket access control
5. **Folder-Level Permissions** - Restrict to specific S3 prefixes
6. **Read/Write Segregation** - Different permissions per group
7. **Cross-Account Access** - Access buckets in multiple accounts
8. **Custom Login UI** - Branded login page
9. **Upload Date Display** - Shows when files were uploaded
10. **Account ID Hidden** - Security through obscurity

### ❌ NOT Implemented
1. **S3 Access Grants** - Not using AWS S3 Access Grants service
2. **Direct S3 API Access** - All access goes through Lambda
3. **IAM Identity Center API Queries** - Using Cognito groups instead
4. **Per-User Permissions** - Only group-based permissions

---

## Configuration Files

### Lambda Code
- **Location:** `backend/lambda/s3-operations.py`
- **Size:** ~500 lines
- **Language:** Python 3.11
- **Key Functions:**
  - `get_user_groups_from_token()` - Extract groups from JWT
  - `get_user_permissions_for_bucket()` - Check group permissions
  - `list_buckets()` - Filter buckets by group
  - `list_objects()` - Apply prefix restrictions
  - `generate_upload_url()` - Check write permissions

### Frontend
- **Location:** `src/`
- **Framework:** React
- **Key Files:**
  - `src/aws-exports.js` - Cognito configuration
  - `src/components/BucketList.js` - Bucket grid
  - `src/components/BucketView.js` - File list with upload date
  - `src/App.js` - Custom login UI

### Infrastructure
- **CloudFormation:** `cloudformation/s3browser-infrastructure.yaml`
- **Deployment:** Via CloudFormation stack
- **Resources:**
  - Lambda function
  - API Gateway HTTP API
  - JWT Authorizer
  - Amplify app
  - IAM roles

---

## Differences Between Accounts

| Feature | Account 821276124335 | Account 721010870103 |
|---------|---------------------|---------------------|
| Cross-Account Access | ✅ 2 accounts | ❌ None |
| IAM Identity Center | ✅ Shared | ✅ Shared |
| Cognito User Pool | ✅ Shared | ✅ Shared |
| Lambda Function | ✅ Deployed | ✅ Deployed |
| API Gateway | ✅ Deployed | ✅ Deployed |
| Amplify App | ✅ Deployed | ✅ Deployed |
| Groups Created | ❓ Unknown | ❌ Not yet |

---

## What's NOT S3 Access Grants

**S3 Access Grants would be:**
- AWS-native service
- Grants stored in S3
- Direct S3 API access
- No Lambda filtering
- IAM Identity Center integration at S3 level

**What we have instead:**
- Custom Lambda filtering
- Groups from Cognito JWT token
- Flexible pattern matching
- Folder-level restrictions
- Cross-account aggregation

---

## Summary

**feature/cross-account-access** uses:
- ✅ IAM Identity Center for authentication
- ✅ Cognito for SAML federation
- ✅ JWT tokens with group claims
- ✅ Lambda for authorization and filtering
- ✅ Custom group-to-bucket mapping
- ❌ NOT S3 Access Grants

**This approach gives you:**
- More flexibility
- Easier to customize
- Works across accounts
- Folder-level permissions
- Custom UI logic

**Trade-offs:**
- Not AWS-native
- Requires Lambda for all requests
- Manual group configuration
- No direct S3 API access
