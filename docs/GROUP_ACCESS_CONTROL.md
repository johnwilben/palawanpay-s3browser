# Cognito Group-Based Access Control Setup

## Overview

The S3 Browser uses Cognito groups to control which buckets users can access. Users are assigned to groups in IAM Identity Center, and the Lambda function filters buckets based on group membership.

---

## Step 1: Create Groups in IAM Identity Center

### Navigate to IAM Identity Center
```
AWS Console → IAM Identity Center → Groups
```

### Create the following groups:

#### 1. s3-browser-admin
- **Description**: Full access to all S3 buckets
- **Members**: Add administrators

#### 2. s3-browser-datalake
- **Description**: Access to data lake buckets (datalake-*, pgcdatalake-*)
- **Members**: Add data engineers, analysts

#### 3. s3-browser-test
- **Description**: Access to test buckets (test-*, testing-*)
- **Members**: Add developers, QA team

#### 4. s3-browser-report
- **Description**: Access to report buckets (report-portal-*, ppay-report-*)
- **Members**: Add business analysts, report users

#### 5. s3-browser-readonly
- **Description**: Read-only access to all buckets
- **Members**: Add auditors, viewers

---

## Step 2: Assign Users to Groups

### Via IAM Identity Center Console
1. Go to **IAM Identity Center → Users**
2. Select a user
3. Click **Groups** tab
4. Click **Add user to groups**
5. Select appropriate groups
6. Click **Add**

### Via AWS CLI
```bash
# Get user ID
aws identitystore list-users \
  --identity-store-id d-xxxxxxxxxx \
  --filters AttributePath=UserName,AttributeValue=user@example.com

# Get group ID
aws identitystore list-groups \
  --identity-store-id d-xxxxxxxxxx \
  --filters AttributePath=DisplayName,AttributeValue=s3-browser-admin

# Add user to group
aws identitystore create-group-membership \
  --identity-store-id d-xxxxxxxxxx \
  --group-id <group-id> \
  --member-id UserId=<user-id>
```

---

## Step 3: Configure Cognito to Pass Groups

### Update Cognito User Pool

1. **Navigate to Cognito**
   ```
   AWS Console → Cognito → User Pools → palawanpay-s3browser
   ```

2. **Configure App Client**
   - Go to **App integration → App clients**
   - Select your app client
   - Under **Hosted UI settings**
   - Ensure **cognito:groups** scope is included

3. **Update Attribute Mapping** (if using SAML)
   - Go to **Sign-in experience → Federated identity provider sign-in**
   - Select your SAML provider
   - Add attribute mapping:
     - **SAML attribute**: `http://schemas.xmlsoap.org/claims/Group`
     - **User pool attribute**: `cognito:groups`

---

## Step 4: Update Lambda Configuration

The Lambda function already has the group configuration in `s3-operations.py`:

```python
BUCKET_ACCESS_RULES = {
    's3-browser-admin': {
        'patterns': ['*'],
        'description': 'Full access to all buckets'
    },
    's3-browser-datalake': {
        'patterns': ['datalake-*', 'pgcdatalake-*'],
        'description': 'Access to data lake buckets'
    },
    # ... etc
}
```

### To add new groups or patterns:

1. Edit `backend/lambda/s3-operations.py`
2. Add new group to `BUCKET_ACCESS_RULES`
3. Deploy Lambda:
   ```bash
   cd backend/lambda
   zip -r function.zip s3-operations.py
   aws lambda update-function-code \
     --function-name s3browser-operations \
     --zip-file fileb://function.zip \
     --region ap-southeast-1
   ```

---

## Step 5: Test Access Control

### Test User with s3-browser-test Group

1. Login as test user
2. Should only see buckets matching `test-*` or `testing-*`
3. Try accessing a datalake bucket directly → Should get 403 error

### Test User with s3-browser-admin Group

1. Login as admin user
2. Should see all buckets across all accounts
3. Can upload/download from any bucket

### Test User with No Groups

1. Login as user without groups
2. Should see error: "No groups assigned. Contact administrator."

---

## Bucket Pattern Matching

### Wildcard Patterns

- `*` - Matches all buckets
- `test-*` - Matches buckets starting with "test-"
- `*-prod` - Matches buckets ending with "-prod"
- `exact-bucket-name` - Matches exact bucket name

### Examples

```python
# Allow specific buckets
'patterns': ['bucket-a', 'bucket-b', 'bucket-c']

# Allow all test buckets
'patterns': ['test-*', 'testing-*', 'sandbox-*']

# Allow all buckets in specific account
'patterns': ['*']  # Then filter by account in code if needed
```

---

## Security Best Practices

### 1. Principle of Least Privilege
- Only assign users to groups they need
- Use specific patterns instead of `*` when possible
- Regularly review group memberships

### 2. Audit Logging
- CloudTrail logs all S3 access
- Lambda logs show which groups accessed which buckets
- Review logs regularly for unauthorized access attempts

### 3. Group Naming Convention
- Prefix all groups with `s3-browser-`
- Use descriptive names: `s3-browser-finance`, `s3-browser-hr`
- Document group purpose in description

### 4. Regular Access Reviews
- Quarterly review of group memberships
- Remove users who no longer need access
- Update patterns as bucket naming changes

---

## Troubleshooting

### User sees "No groups assigned" error

**Cause**: User not in any s3-browser-* groups

**Solution**:
1. Add user to appropriate group in IAM Identity Center
2. User must logout and login again for groups to refresh

### User can't see expected buckets

**Cause**: Bucket name doesn't match group patterns

**Solution**:
1. Check bucket name matches pattern in `BUCKET_ACCESS_RULES`
2. Verify user is in correct group
3. Check CloudWatch logs for "Access denied by group policy" messages

### Groups not appearing in token

**Cause**: Cognito not configured to pass groups

**Solution**:
1. Verify `cognito:groups` scope in app client
2. Check SAML attribute mapping
3. Test with AWS CLI:
   ```bash
   aws cognito-idp admin-get-user \
     --user-pool-id <pool-id> \
     --username user@example.com
   ```

### All users see all buckets

**Cause**: Lambda not filtering by groups

**Solution**:
1. Check Lambda logs for "User groups from token" message
2. Verify groups are being extracted correctly
3. Ensure Lambda code is latest version

---

## Adding Custom Groups

### Example: Finance Team

1. **Create group**: `s3-browser-finance`

2. **Add to Lambda**:
   ```python
   's3-browser-finance': {
       'patterns': [
           'finance-*',
           'accounting-*',
           'payroll-*'
       ],
       'description': 'Access to finance buckets'
   }
   ```

3. **Deploy Lambda**

4. **Assign users** to group in IAM Identity Center

5. **Test** with finance user

---

## Migration from No Access Control

### Phase 1: Create Admin Group
1. Create `s3-browser-admin` group
2. Add all current users to admin group
3. Deploy updated Lambda
4. Verify all users still have access

### Phase 2: Create Specific Groups
1. Create role-specific groups
2. Assign users to appropriate groups
3. Test with each group

### Phase 3: Remove Admin Access
1. Remove users from admin group
2. Keep only actual admins in admin group
3. Monitor for access issues

---

## API Gateway Configuration

Ensure API Gateway passes the authorization context to Lambda:

```json
{
  "authorizerResultTtlInSeconds": 300,
  "identitySource": "$request.header.Authorization",
  "type": "JWT",
  "jwtConfiguration": {
    "audience": ["<app-client-id>"],
    "issuer": "https://cognito-idp.ap-southeast-1.amazonaws.com/<user-pool-id>"
  }
}
```

---

## Monitoring & Alerts

### CloudWatch Metrics to Monitor

- **Unauthorized access attempts**: Filter logs for "Access denied by group policy"
- **Users without groups**: Filter logs for "No groups assigned"
- **Group usage**: Count buckets accessed per group

### Sample CloudWatch Insights Query

```
fields @timestamp, @message
| filter @message like /Access denied by group policy/
| stats count() by bin(5m)
```

---

## Support

For access issues:
1. Check user's group membership in IAM Identity Center
2. Review CloudWatch logs for specific error
3. Verify bucket name matches group patterns
4. Contact administrator to adjust group membership
