# S3 Browser - Production Deployment Documentation

**Account:** 721010870103 (minitempproject-prod)  
**Deployment Date:** March 5, 2026  
**Application URL:** https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/

---

## Architecture Overview

### Components Deployed

1. **Cognito User Pool** (ap-southeast-1_ieR5X01hf)
   - Separate pool for account 721010870103
   - SAML integration with IAM Identity Center
   - Domain: s3browser-721010870103.auth.ap-southeast-1.amazoncognito.com

2. **API Gateway** (9th34ei7t8)
   - HTTP API with JWT authorizer
   - Endpoint: https://9th34ei7t8.execute-api.ap-southeast-1.amazonaws.com/prod
   - CORS enabled for Amplify domain

3. **Lambda Function** (s3browser-operations)
   - Runtime: Python 3.11
   - Role: S3BrowserLambdaRole
   - Permissions: S3 Full Access, AssumeRole for cross-account
   - CloudWatch Logging: /aws/lambda/s3browser-operations

4. **Amplify App** (d32el4qcx14shm)
   - Branch: feature/cross-account-access
   - GitHub: johnwilben/palawanpay-s3browser
   - Auto-deploy: Disabled

5. **Cross-Account Roles**
   - Account 471112740803: S3BrowserCrossAccountRole
   - Account 502174880086: S3BrowserCrossAccountRole
   - Account 236300332446: S3BrowserCrossAccountRole (optional)

---

## Authentication Flow

1. User accesses S3 Browser URL
2. Redirected to IAM Identity Center for authentication
3. IAM Identity Center sends SAML assertion with group IDs
4. Cognito receives SAML assertion and creates JWT token
5. Lambda resolves group IDs to group names via IAM Identity Center API
6. Lambda filters buckets based on group membership
7. User sees only authorized buckets

---

## IAM Identity Center Configuration

### Application Details
- **Name:** S3 Browser - Account 721010870103
- **Type:** Custom SAML 2.0 application
- **Application ACS URL:** https://s3browser-721010870103.auth.ap-southeast-1.amazoncognito.com/saml2/idpresponse
- **Application SAML audience:** urn:amazon:cognito:sp:ap-southeast-1_ieR5X01hf
- **Application start URL:** https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/

### Attribute Mappings
| Application Attribute | Maps To | Format |
|----------------------|---------|--------|
| Subject | ${user:email} | emailAddress |
| name | ${user:name} | unspecified |
| email | ${user:email} | unspecified |
| memberOf | ${user:groups} | unspecified |

**Note:** The `memberOf` attribute is mapped to Cognito's `given_name` field as a workaround since Cognito doesn't support custom SAML attributes for groups.

---

## Group-Based Access Control

### Admin Groups (Full Access to All Buckets)
- `AWS-s3-browser-admin`
- `AWS Super Administrators`
- `AWS Administrators`

### Datalake Groups
- `AWS-s3-browser-datalake-read` → Read-only: All `datalake-*` buckets
- `AWS-s3-browser-datalake-write` → Full access: All `datalake-*` buckets

### Finance Groups
- `AWS-s3-browser-finance` → Mixed permissions:
  - Read-only: `datalake-uat-ap-southeast-1-502174880086-output-common`
  - Full access: `datalake-uat-ap-southeast-1-502174880086-athena`
  - Full access: `datalake-uat-ap-southeast-1-502174880086-sandbox`
  - Full access: `datalake-uat-ap-southeast-1-502174880086-staging-common`

- `AWS-s3-browser-finance-GL` → Read-only:
  - Bucket: `datalake-uat-ap-southeast-1-502174880086-raw-megalink`
  - Folder: `megalink-wkf01/transaction-gl/` only

### Other Groups
- `AWS-s3-browser-archive-treasury` → Full access: `operations-bucket-backup-sharepoint`
- `AWS-s3-browser-visa` → Read-only: `visa-report-paymentology`

### PGC Groups
- `AWS-s3-browser-pgc-read` → Read-only: All `pgcdatalake-*` buckets
- `AWS-s3-browser-pgc-write` → Full access: All `pgcdatalake-*` buckets

### Permission Levels
- **read** = View and download files only (no upload/delete)
- **write** = Full access (view, download, upload, delete)

---

## Cross-Account Access

### Accounts with Access
1. **721010870103** (Primary) - Direct access, no role assumption
2. **471112740803** - Via S3BrowserCrossAccountRole
3. **502174880086** - Via S3BrowserCrossAccountRole
4. **236300332446** - Via S3BrowserCrossAccountRole (optional)

### Cross-Account Role Configuration
Each target account has an IAM role with:
- **Role Name:** S3BrowserCrossAccountRole
- **Trust Policy:** Trusts S3BrowserLambdaRole from account 721010870103
- **Permissions:** S3 list, read, write, delete operations
- **Deployment:** CloudFormation template at `cloudformation/cross-account-role-simple.yaml`

---

## Security Features

### Authentication
- ✅ IAM Identity Center SAML authentication
- ✅ MFA can be enforced at IAM Identity Center level
- ✅ JWT token validation by API Gateway
- ✅ Token expiry: 1 hour

### Authorization
- ✅ Group-based access control
- ✅ Bucket-level permissions
- ✅ Folder-level restrictions (finance-GL)
- ✅ Read vs Write permission segregation
- ✅ No anonymous access

### Audit & Logging
- ✅ CloudWatch Logs for all Lambda invocations
- ✅ Logs include: user email, groups, buckets accessed, operations performed
- ✅ Log retention: Default (never expire)
- ✅ Log group: /aws/lambda/s3browser-operations

---

## User Management

### Adding a New User
1. Add user to IAM Identity Center
2. Assign user to appropriate groups (e.g., AWS-s3-browser-finance)
3. Assign user to "S3 Browser - Account 721010870103" application
4. User logs in at application URL
5. User sees only buckets their groups have access to

### Changing User Permissions
1. Add/remove user from groups in IAM Identity Center
2. User must **log out and log back in** for changes to take effect
3. If changes don't reflect, delete Cognito user to force token refresh:
   ```bash
   aws cognito-idp admin-delete-user \
     --user-pool-id ap-southeast-1_ieR5X01hf \
     --username IAMIdentityCenter_<email> \
     --region ap-southeast-1 \
     --profile minitempproject-prod
   ```

### Token Caching Issue
- Group memberships are embedded in JWT token at login time
- Token is valid for 1 hour
- Group changes don't reflect until token expires or user logs out
- **Workaround:** Delete Cognito user to force immediate refresh

---

## Deployment Procedures

### Deploying Lambda Updates
```bash
cd /Users/wilbensibayan/Downloads/S3Browser/backend/lambda
zip -r function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

### Deploying Frontend Updates
```bash
cd /Users/wilbensibayan/Downloads/S3Browser
git add .
git commit -m "Your changes"
git push origin feature/cross-account-access

# Trigger Amplify build
aws amplify start-job \
  --app-id d32el4qcx14shm \
  --branch-name feature/cross-account-access \
  --job-type RELEASE \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

### Deploying Cross-Account Roles
```bash
# In each target account (471112740803, 502174880086, 236300332446)
aws cloudformation create-stack \
  --stack-name s3browser-cross-account-role \
  --template-body file://cloudformation/cross-account-role-simple.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --profile <TARGET_ACCOUNT_PROFILE>
```

---

## Monitoring & Troubleshooting

### Viewing Logs
```bash
# Tail logs in real-time
aws logs tail /aws/lambda/s3browser-operations \
  --follow \
  --region ap-southeast-1 \
  --profile minitempproject-prod

# View recent logs
aws logs tail /aws/lambda/s3browser-operations \
  --since 5m \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

### Common Issues

#### User sees no buckets
- **Cause:** User not in any groups, or groups don't have bucket access
- **Solution:** Check user's group membership in IAM Identity Center
- **Logs:** Look for "User groups: []" or "Returning 0 accessible buckets"

#### User sees wrong buckets
- **Cause:** Token cached with old group membership
- **Solution:** Delete Cognito user to force token refresh
- **Logs:** Check "User groups:" to see what groups are in token

#### Cross-account buckets not showing
- **Cause:** Cross-account role doesn't exist or trust policy incorrect
- **Solution:** Deploy cross-account role in target account
- **Logs:** Look for "Error accessing account" with AccessDenied

#### CORS errors
- **Cause:** API Gateway CORS configuration or Lambda not returning CORS headers
- **Solution:** Verify API Gateway CORS settings and Lambda response function
- **Logs:** Check browser console for CORS errors

---

## Configuration Files

### Lambda Configuration
- **File:** `backend/lambda/s3-operations.py`
- **Key Variables:**
  - `IDENTITY_STORE_ID` = 'd-96677c10e5'
  - `CROSS_ACCOUNT_ROLES` = List of accounts and role ARNs
  - `GROUP_BUCKET_ACCESS` = Group-to-bucket mappings

### Frontend Configuration
- **File:** `src/aws-exports.js`
- **Key Values:**
  - Cognito User Pool ID
  - Cognito Client ID
  - OAuth domain
  - API endpoint

### Amplify Environment Variables
```
REACT_APP_API_ENDPOINT=https://9th34ei7t8.execute-api.ap-southeast-1.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=ap-southeast-1_ieR5X01hf
REACT_APP_COGNITO_CLIENT_ID=504f5m01uepjpq2d0v4i8ceh15
REACT_APP_COGNITO_DOMAIN=s3browser-721010870103
```

---

## Known Limitations

1. **Group Resolution Performance**
   - Lambda calls IAM Identity Center API on every request to resolve group IDs
   - Adds ~100-200ms latency per request
   - **Future Improvement:** Use Cognito Pre-Token Lambda Trigger for one-time resolution

2. **Token Caching**
   - Group changes require user to log out/in
   - Token valid for 1 hour
   - **Workaround:** Delete Cognito user to force refresh

3. **Using `given_name` for Groups**
   - Hacky workaround since Cognito doesn't support custom SAML attributes
   - Overwrites user's actual given name
   - **Future Improvement:** Use Cognito Groups with Lambda trigger

4. **No Real-Time Group Updates**
   - Changes to group membership don't reflect until token expires
   - **Future Improvement:** Implement token refresh mechanism

---

## Future Improvements

### Option 1: Cognito Pre-Token Lambda Trigger (Recommended)
- Resolve group IDs to names once at login
- Store in `cognito:groups` claim
- No API calls on every request
- Better performance and scalability

### Option 2: Custom Authorizer
- Use Lambda authorizer instead of JWT authorizer
- Cache group resolution results
- More control over authorization logic

### Option 3: S3 Access Grants (AWS Native)
- Use AWS S3 Access Grants with IAM Identity Center
- No custom Lambda logic needed
- Most secure, but more complex setup

---

## Support & Maintenance

### Key Contacts
- **Developer:** Wilben Sibayan
- **AWS Account:** 721010870103 (minitempproject-prod)

### Important URLs
- **Application:** https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/
- **GitHub:** https://github.com/johnwilben/palawanpay-s3browser
- **IAM Identity Center:** https://d-96677c10e5.awsapps.com/start

### AWS Resources
- **Cognito User Pool:** ap-southeast-1_ieR5X01hf
- **API Gateway:** 9th34ei7t8
- **Lambda Function:** s3browser-operations
- **Amplify App:** d32el4qcx14shm
- **CloudWatch Logs:** /aws/lambda/s3browser-operations

---

## Changelog

### 2026-03-05 - Initial Production Deployment
- Created separate Cognito User Pool for account 721010870103
- Integrated with IAM Identity Center via SAML
- Deployed API Gateway and Lambda with cross-account access
- Configured group-based access control with read/write segregation
- Added CloudWatch logging for audit trail
- Deployed Amplify frontend
- Created cross-account roles in 2 accounts (471112740803, 502174880086)
- Updated all group names with AWS- prefix for consistency
