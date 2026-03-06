# S3 Browser - Issues and Required Fixes

## 🚨 Critical Issues to Address

### 1. Cross-Account Access Not Working
**Current State:** Lambda code is configured for cross-account access to accounts 236300332446, 502174880086, 471112740803, but the roles don't exist yet.

**Problem:**
- Lambda will try to assume roles that don't exist
- This will cause errors when listing buckets from those accounts
- Users will only see buckets from the primary account (721010870103)

**Fix Required:**
Deploy the cross-account role in each secondary account:

```bash
# For each account (236300332446, 502174880086, 471112740803)
# You need AWS CLI access to each account

# Account 236300332446
aws cloudformation create-stack \
  --stack-name s3browser-cross-account-role \
  --template-body file://cloudformation/cross-account-role.yaml \
  --parameters ParameterKey=PrimaryAccountId,ParameterValue=721010870103 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --profile PROFILE_FOR_236300332446

# Account 502174880086
aws cloudformation create-stack \
  --stack-name s3browser-cross-account-role \
  --template-body file://cloudformation/cross-account-role.yaml \
  --parameters ParameterKey=PrimaryAccountId,ParameterValue=721010870103 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --profile PROFILE_FOR_502174880086

# Account 471112740803
aws cloudformation create-stack \
  --stack-name s3browser-cross-account-role \
  --template-body file://cloudformation/cross-account-role.yaml \
  --parameters ParameterKey=PrimaryAccountId,ParameterValue=721010870103 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --profile PROFILE_FOR_471112740803
```

**Alternative (if you don't need cross-account access):**
Update Lambda code to only access the primary account:

```python
# In backend/lambda/s3-operations.py, line 16-21
CROSS_ACCOUNT_ROLES = [
    {'account': '721010870103', 'role': None}  # Only primary account
]
```

Then redeploy Lambda:
```bash
cd backend/lambda
zip -r function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

---

### 2. CloudFormation Template Has Hardcoded Cross-Account Logic Removed
**Current State:** I removed the conditional cross-account IAM policy statements to fix the deployment error.

**Problem:**
- The CloudFormation template no longer supports cross-account role ARNs as parameters
- If you add cross-account roles later, Lambda won't have permission to assume them

**Fix Required:**
Update `cloudformation/s3browser-infrastructure.yaml` to properly handle optional cross-account roles:

```yaml
# Around line 85, add this statement back (properly):
- !If
  - HasCrossAccount1
  - Effect: Allow
    Action:
      - sts:AssumeRole
    Resource:
      - !Ref CrossAccountRoleArn1
  - !Ref AWS::NoValue
- !If
  - HasCrossAccount2
  - Effect: Allow
    Action:
      - sts:AssumeRole
    Resource:
      - !Ref CrossAccountRoleArn2
  - !Ref AWS::NoValue
- !If
  - HasCrossAccount3
  - Effect: Allow
    Action:
      - sts:AssumeRole
    Resource:
      - !Ref CrossAccountRoleArn3
  - !Ref AWS::NoValue
```

**OR** manually add the IAM policy after deployment:

```bash
# Create policy document
cat > cross-account-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::236300332446:role/S3BrowserCrossAccountRole",
        "arn:aws:iam::502174880086:role/S3BrowserCrossAccountRole",
        "arn:aws:iam::471112740803:role/S3BrowserCrossAccountRole"
      ]
    }
  ]
}
EOF

# Attach to Lambda role
aws iam put-role-policy \
  --role-name S3BrowserLambdaRole \
  --policy-name CrossAccountAssumeRole \
  --policy-document file://cross-account-policy.json \
  --profile minitempproject-prod
```

---

### 3. IAM Identity Center Groups Not Created
**Current State:** Lambda expects these groups to exist, but they haven't been created yet.

**Problem:**
- Users won't be assigned to any groups
- Lambda has a fallback that gives admin access to users without groups (temporary workaround)
- This is a security risk - everyone gets admin access!

**Fix Required:**
Create the groups in IAM Identity Center:

1. Go to AWS Console → IAM Identity Center
2. Navigate to **Groups**
3. Create these groups:
   - `s3-browser-admin`
   - `s3-browser-datalake`
   - `s3-browser-finance`
   - `s3-browser-finance-GL`
   - `s3-browser-archive-treasury`
   - `s3-browser-visa`
   - `s3-browser-pgc`

4. Assign users to appropriate groups

**Then remove the temporary admin fallback:**

In `backend/lambda/s3-operations.py`, around line 250, remove these lines:
```python
# Temporary: If no groups, grant admin access until groups are set up
if not user_groups:
    print(f"User {user_email} has no groups, granting temporary admin access")
    user_groups = ['s3-browser-admin']
```

Replace with:
```python
# If no groups, deny access
if not user_groups:
    return response(403, {'error': 'User not assigned to any S3 Browser groups'})
```

---

### 4. GitHub Token Exposed in Parameters File
**Current State:** GitHub token is stored in plain text in `parameters-721010870103.json`

**Problem:**
- Security risk if file is committed to git
- Token should be stored in AWS Secrets Manager or SSM Parameter Store

**Fix Required:**

**Option A: Use AWS Secrets Manager**
```bash
# Store token in Secrets Manager
aws secretsmanager create-secret \
  --name s3browser/github-token \
  --secret-string "<YOUR_GITHUB_TOKEN>" \
  --region ap-southeast-1 \
  --profile minitempproject-prod

# Update CloudFormation to retrieve from Secrets Manager
# (requires template modification)
```

**Option B: Delete the parameters file after deployment**
```bash
rm /Users/wilbensibayan/Downloads/S3Browser/parameters-721010870103.json
```

**Option C: Add to .gitignore**
```bash
echo "parameters-*.json" >> .gitignore
```

---

### 5. Lambda Code Has Hardcoded Account IDs
**Current State:** Lambda code has specific account IDs hardcoded in `CROSS_ACCOUNT_ROLES`

**Problem:**
- Not portable across deployments
- Need to manually edit code for each deployment
- Should use environment variables from CloudFormation

**Fix Required:**
Update Lambda to read from environment variables:

```python
# In backend/lambda/s3-operations.py
import os

# Read from environment variables
CROSS_ACCOUNT_ROLES = []
primary_account = os.environ.get('AWS_ACCOUNT_ID', '721010870103')
CROSS_ACCOUNT_ROLES.append({'account': primary_account, 'role': None})

# Add cross-account roles from environment
for i in range(1, 4):
    role_arn = os.environ.get(f'CROSS_ACCOUNT_ROLE_{i}')
    if role_arn:
        account_id = role_arn.split(':')[4]
        CROSS_ACCOUNT_ROLES.append({'account': account_id, 'role': role_arn})
```

CloudFormation already sets these environment variables, so this will work automatically.

---

### 6. Amplify Environment Variables Not Set
**Current State:** CloudFormation sets environment variables for Amplify, but they might not match the actual `aws-exports.js` file.

**Problem:**
- Frontend might have wrong API endpoint
- Cognito configuration might be incorrect

**Fix Required:**
Verify `src/aws-exports.js` matches the deployment:

```javascript
const awsconfig = {
  aws_project_region: 'ap-southeast-1',
  aws_cognito_region: 'ap-southeast-1',
  aws_user_pools_id: 'ap-southeast-1_YdUsCa38i',
  aws_user_pools_web_client_id: '19lg9i63etaa6322ml0jv0clqu',
  oauth: {
    domain: 'palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com',
    redirectSignIn: [
      'https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/',
      'http://localhost:3000/'
    ],
    redirectSignOut: [
      'https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/',
      'http://localhost:3000/'
    ],
    responseType: 'code'
  }
};
```

Update and commit:
```bash
cd /Users/wilbensibayan/Downloads/S3Browser
# Edit src/aws-exports.js
git add src/aws-exports.js
git commit -m "Update aws-exports for account 721010870103"
git push origin feature/cross-account-access
```

---

### 7. No Monitoring or Alerting
**Current State:** No CloudWatch alarms or monitoring configured

**Problem:**
- Won't know if Lambda is failing
- Won't know if API Gateway is returning errors
- No visibility into usage or costs

**Fix Required:**
Add CloudWatch alarms:

```bash
# Lambda errors alarm
aws cloudwatch put-metric-alarm \
  --alarm-name s3browser-lambda-errors \
  --alarm-description "Alert when Lambda has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=s3browser-operations \
  --region ap-southeast-1 \
  --profile minitempproject-prod

# API Gateway 5xx errors alarm
aws cloudwatch put-metric-alarm \
  --alarm-name s3browser-api-5xx-errors \
  --alarm-description "Alert when API has 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ApiId,Value=9th34ei7t8 \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

---

### 8. No Backup or Disaster Recovery Plan
**Current State:** Single deployment with no backup

**Problem:**
- If CloudFormation stack is deleted, everything is lost
- No way to rollback to previous version
- No infrastructure as code versioning

**Fix Required:**
1. **Commit CloudFormation templates to git** (already done)
2. **Tag releases:**
   ```bash
   git tag -a v1.0-account-721010870103 -m "Initial deployment to account 721010870103"
   git push origin v1.0-account-721010870103
   ```
3. **Export stack template:**
   ```bash
   aws cloudformation get-template \
     --stack-name s3browser-prod \
     --region ap-southeast-1 \
     --profile minitempproject-prod \
     --query 'TemplateBody' > deployed-template-backup.yaml
   ```

---

## 📋 Priority Order

### High Priority (Fix Immediately)
1. ✅ **Create IAM Identity Center groups** - Security risk with admin fallback
2. ✅ **Remove GitHub token from parameters file** - Security risk
3. ✅ **Fix cross-account access** - Core functionality not working

### Medium Priority (Fix This Week)
4. ⚠️ **Update Lambda to use environment variables** - Maintainability
5. ⚠️ **Verify Amplify environment variables** - Functionality
6. ⚠️ **Add CloudWatch alarms** - Operational visibility

### Low Priority (Fix When Time Permits)
7. 📝 **Fix CloudFormation template for cross-account** - Nice to have
8. 📝 **Setup backup/DR plan** - Best practice

---

## 🔧 Quick Fix Script

Here's a script to fix the most critical issues:

```bash
#!/bin/bash
set -e

echo "🔧 Fixing S3 Browser Critical Issues"

# 1. Remove GitHub token from parameters file
echo "1. Removing GitHub token from parameters file..."
rm -f /Users/wilbensibayan/Downloads/S3Browser/parameters-721010870103.json
echo "parameters-*.json" >> /Users/wilbensibayan/Downloads/S3Browser/.gitignore

# 2. Update Lambda to remove admin fallback (after groups are created)
echo "2. Updating Lambda code..."
cd /Users/wilbensibayan/Downloads/S3Browser/backend/lambda

# Create backup
cp s3-operations.py s3-operations.py.backup

# Remove admin fallback (do this AFTER creating groups!)
# sed -i '' '/Temporary: If no groups/,/user_groups = \['\''s3-browser-admin'\''\]/d' s3-operations.py

# 3. Add cross-account IAM policy manually
echo "3. Adding cross-account IAM policy..."
cat > /tmp/cross-account-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::236300332446:role/S3BrowserCrossAccountRole",
        "arn:aws:iam::502174880086:role/S3BrowserCrossAccountRole",
        "arn:aws:iam::471112740803:role/S3BrowserCrossAccountRole"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name S3BrowserLambdaRole \
  --policy-name CrossAccountAssumeRole \
  --policy-document file:///tmp/cross-account-policy.json \
  --profile minitempproject-prod

echo "✅ Critical fixes applied!"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "1. Create IAM Identity Center groups (see issue #3)"
echo "2. Deploy cross-account roles (see issue #1)"
echo "3. Verify Amplify environment variables (see issue #6)"
```

---

## 📝 Checklist

- [ ] Create IAM Identity Center groups
- [ ] Assign users to groups
- [ ] Remove admin fallback from Lambda
- [ ] Deploy cross-account roles (or remove from Lambda config)
- [ ] Add cross-account IAM policy to Lambda role
- [ ] Delete parameters file with GitHub token
- [ ] Verify Amplify environment variables
- [ ] Add CloudWatch alarms
- [ ] Tag git release
- [ ] Backup CloudFormation template
- [ ] Test application end-to-end

---

**Created:** March 4, 2026  
**Account:** 721010870103  
**Status:** Deployment complete, fixes required
