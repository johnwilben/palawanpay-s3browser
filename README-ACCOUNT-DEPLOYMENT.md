# S3 Browser - New Account Deployment Guide

Complete step-by-step guide to deploy S3 Browser in a new AWS account.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS account with admin access
- [ ] AWS CLI installed and configured
- [ ] IAM Identity Center enabled in your organization
- [ ] GitHub account with repository access
- [ ] Git installed locally

---

## Part 1: IAM Identity Center Setup

### Step 1.1: Enable IAM Identity Center

1. Go to AWS Console → **IAM Identity Center**
2. Click **Enable**
3. Note down your **Identity Store ID** (format: `d-xxxxxxxxxx`)
   - Found in: Settings → Identity source → Identity Store ID

### Step 1.2: Create Users

1. In IAM Identity Center, go to **Users**
2. Click **Add user**
3. Fill in user details:
   - Username: user email (e.g., `john.doe@company.com`)
   - Email: same as username
   - First name, Last name
4. Click **Add user**
5. User will receive email to set password

### Step 1.3: Create Groups

Create the following groups:

1. Go to **Groups** → **Create group**
2. Create these groups one by one:

| Group Name | Description |
|------------|-------------|
| `s3-browser-admin` | Full access to all buckets |
| `s3-browser-datalake` | Write access to datalake-* buckets |
| `s3-browser-finance` | Mixed read/write to finance buckets |
| `s3-browser-finance-GL` | Read-only to specific GL folder |
| `s3-browser-archive-treasury` | Write to operations backup bucket |
| `s3-browser-visa` | Write to visa backup bucket |
| `s3-browser-pgc` | Write to pgcdatalake-* buckets |

### Step 1.4: Assign Users to Groups

1. Go to **Groups** → Select a group
2. Click **Add users**
3. Select users and click **Add users**

---

## Part 2: Cognito User Pool Setup

### Step 2.1: Create Cognito User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name s3browser-userpool \
  --auto-verified-attributes email \
  --region ap-southeast-1 \
  --profile your-profile
```

**Note down the `UserPoolId`** (format: `ap-southeast-1_XXXXXXXXX`)

### Step 2.2: Create User Pool Domain

```bash
aws cognito-idp create-user-pool-domain \
  --domain your-company-s3browser \
  --user-pool-id ap-southeast-1_XXXXXXXXX \
  --region ap-southeast-1 \
  --profile your-profile
```

### Step 2.3: Create User Pool Client

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id ap-southeast-1_XXXXXXXXX \
  --client-name s3browser-client \
  --generate-secret false \
  --callback-urls "http://localhost:3000/" \
  --logout-urls "http://localhost:3000/" \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers COGNITO \
  --region ap-southeast-1 \
  --profile your-profile
```

**Note down the `ClientId`**

### Step 2.4: Configure IAM Identity Center as SAML Provider

1. In IAM Identity Center, go to **Applications**
2. Click **Add application** → **Add custom SAML 2.0 application**
3. Application properties:
   - Display name: `S3 Browser`
   - Description: `S3 Browser Web Application`
4. Click **Next**
5. Download the **IAM Identity Center SAML metadata file**
6. Application metadata:
   - Application ACS URL: `https://your-company-s3browser.auth.ap-southeast-1.amazoncognito.com/saml2/idpresponse`
   - Application SAML audience: `urn:amazon:cognito:sp:ap-southeast-1_XXXXXXXXX`
7. Click **Submit**

### Step 2.5: Add SAML Provider to Cognito

1. Go to Cognito User Pool → **Sign-in experience** → **Federated identity provider sign-in**
2. Click **Add identity provider** → **SAML**
3. Provider name: `IAMIdentityCenter`
4. Upload the metadata file from Step 2.4
5. Click **Add identity provider**

### Step 2.6: Configure Attribute Mapping

1. In Cognito User Pool → **Sign-in experience** → **Attribute mapping**
2. Select **IAMIdentityCenter** provider
3. Map attributes:
   - SAML attribute: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` → User pool attribute: `email`
   - SAML attribute: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` → User pool attribute: `name`
4. Click **Save changes**

### Step 2.7: Update App Client Settings

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id ap-southeast-1_XXXXXXXXX \
  --client-id YOUR_CLIENT_ID \
  --supported-identity-providers IAMIdentityCenter \
  --region ap-southeast-1 \
  --profile your-profile
```

---

## Part 3: GitHub Setup

### Step 3.1: Fork or Clone Repository

**Option A: Fork the repository**
1. Go to https://github.com/johnwilben/palawanpay-s3browser
2. Click **Fork**
3. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/palawanpay-s3browser.git
   cd palawanpay-s3browser
   ```

**Option B: Use existing repository**
```bash
git clone https://github.com/johnwilben/palawanpay-s3browser.git
cd palawanpay-s3browser
git checkout feature/cross-account-access
```

### Step 3.2: Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Token name: `S3 Browser Amplify`
4. Select scopes:
   - [x] `repo` (Full control of private repositories)
5. Click **Generate token**
6. **Copy the token** (you won't see it again!)

---

## Part 4: Configure Cross-Account Access (Optional)

If you need to access S3 buckets in other AWS accounts:

### Step 4.1: Deploy Cross-Account Role in Secondary Accounts

In **each secondary account**, run:

```bash
aws cloudformation create-stack \
  --stack-name s3browser-cross-account-role \
  --template-body file://cloudformation/cross-account-role.yaml \
  --parameters ParameterKey=PrimaryAccountId,ParameterValue=YOUR_PRIMARY_ACCOUNT_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --profile secondary-account-profile
```

Wait for completion:
```bash
aws cloudformation wait stack-create-complete \
  --stack-name s3browser-cross-account-role \
  --region ap-southeast-1 \
  --profile secondary-account-profile
```

### Step 4.2: Get Role ARNs

```bash
aws cloudformation describe-stacks \
  --stack-name s3browser-cross-account-role \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text \
  --region ap-southeast-1 \
  --profile secondary-account-profile
```

**Note down each Role ARN**

---

## Part 5: Deploy S3 Browser Infrastructure

### Step 5.1: Create Parameters File

```bash
cd palawanpay-s3browser
cp parameters.json.example parameters.json
```

Edit `parameters.json` with your values:

```json
[
  {
    "ParameterKey": "GitHubRepository",
    "ParameterValue": "https://github.com/YOUR_USERNAME/palawanpay-s3browser"
  },
  {
    "ParameterKey": "GitHubBranch",
    "ParameterValue": "feature/cross-account-access"
  },
  {
    "ParameterKey": "GitHubToken",
    "ParameterValue": "ghp_YOUR_TOKEN_FROM_STEP_3.2"
  },
  {
    "ParameterKey": "IdentityStoreId",
    "ParameterValue": "d-XXXXXXXXXX"
  },
  {
    "ParameterKey": "CognitoUserPoolId",
    "ParameterValue": "ap-southeast-1_XXXXXXXXX"
  },
  {
    "ParameterKey": "CognitoUserPoolClientId",
    "ParameterValue": "YOUR_CLIENT_ID_FROM_STEP_2.3"
  },
  {
    "ParameterKey": "CognitoUserPoolDomain",
    "ParameterValue": "your-company-s3browser"
  },
  {
    "ParameterKey": "CrossAccountRoleArn1",
    "ParameterValue": "arn:aws:iam::ACCOUNT_ID_1:role/S3BrowserCrossAccountRole"
  },
  {
    "ParameterKey": "CrossAccountRoleArn2",
    "ParameterValue": "arn:aws:iam::ACCOUNT_ID_2:role/S3BrowserCrossAccountRole"
  },
  {
    "ParameterKey": "CrossAccountRoleArn3",
    "ParameterValue": ""
  }
]
```

**If you don't have cross-account access**, leave the CrossAccountRoleArn fields empty:
```json
  {
    "ParameterKey": "CrossAccountRoleArn1",
    "ParameterValue": ""
  }
```

### Step 5.2: Run Deployment Script

```bash
./deploy.sh s3browser-prod ap-southeast-1 your-profile
```

This will:
- ✅ Create CloudFormation stack
- ✅ Deploy Lambda function
- ✅ Create API Gateway
- ✅ Deploy Amplify app
- ✅ Configure IAM roles

**Wait 5-10 minutes** for completion.

### Step 5.3: Get Deployment Outputs

The script will show outputs. Note down:
- **APIEndpoint**: `https://XXXXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/prod`
- **AmplifyURL**: `https://feature-cross-account-access.dXXXXXXXXXX.amplifyapp.com`

---

## Part 6: Update Cognito Redirect URLs

### Step 6.1: Update Callback URLs

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id ap-southeast-1_XXXXXXXXX \
  --client-id YOUR_CLIENT_ID \
  --callback-urls "http://localhost:3000/","https://YOUR_AMPLIFY_URL/" \
  --logout-urls "http://localhost:3000/","https://YOUR_AMPLIFY_URL/" \
  --region ap-southeast-1 \
  --profile your-profile
```

Replace `YOUR_AMPLIFY_URL` with the URL from Step 5.3.

### Step 6.2: Update IAM Identity Center Application

1. Go to IAM Identity Center → **Applications**
2. Select **S3 Browser** application
3. Click **Edit configuration**
4. Update **Application ACS URL** to include Amplify URL:
   - Keep: `https://your-company-s3browser.auth.ap-southeast-1.amazoncognito.com/saml2/idpresponse`
5. Click **Save changes**

---

## Part 7: Configure Lambda Function

### Step 7.1: Update Group Configuration (Optional)

If you need to customize bucket access patterns:

1. Edit `backend/lambda/s3-operations.py`
2. Update `GROUP_BUCKET_ACCESS` dictionary:

```python
GROUP_BUCKET_ACCESS = {
    's3-browser-admin': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]
    },
    's3-browser-datalake': {
        'buckets': [
            {'pattern': 'datalake-*', 'permission': 'write'}
        ]
    },
    # Add your custom groups here
}
```

3. Redeploy Lambda:
```bash
cd backend/lambda
zip -r function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile your-profile
```

---

## Part 8: Test the Application

### Step 8.1: Access the Application

1. Open your browser
2. Go to the **AmplifyURL** from Step 5.3
3. Click **Sign In**
4. You'll be redirected to IAM Identity Center login
5. Enter your credentials
6. You should see the S3 Browser dashboard

### Step 8.2: Verify Bucket Access

1. You should see buckets based on your group membership
2. Click on a bucket to view objects
3. Try uploading a file (if you have write permission)
4. Try downloading a file

### Step 8.3: Test Different Users

1. Sign out
2. Sign in with a different user (in different group)
3. Verify they see different buckets based on their group

---

## Part 9: Troubleshooting

### Issue: "Unable to identify user" error

**Solution:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/s3browser-operations --follow \
  --region ap-southeast-1 --profile your-profile
```

Verify:
- User is in IAM Identity Center
- User is assigned to at least one group
- Cognito attribute mapping is correct

### Issue: CORS errors

**Solution:**
1. Verify Cognito redirect URLs include Amplify URL
2. Check API Gateway CORS configuration:
```bash
aws apigatewayv2 get-api --api-id YOUR_API_ID \
  --region ap-southeast-1 --profile your-profile
```

### Issue: No buckets showing

**Solution:**
1. Check user's group membership in IAM Identity Center
2. Verify group names match `GROUP_BUCKET_ACCESS` in Lambda
3. Check Lambda logs for permission errors

### Issue: Amplify build fails

**Solution:**
1. Check Amplify console for build logs
2. Verify GitHub token has correct permissions
3. Check `amplify.yml` build configuration

### Issue: Cross-account access not working

**Solution:**
1. Verify cross-account role exists in secondary account
2. Check trust relationship allows primary account Lambda role
3. Verify role ARN in parameters.json is correct

---

## Part 10: Maintenance

### Update Lambda Code

```bash
cd backend/lambda
# Make your changes to s3-operations.py
zip -r function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile your-profile
```

### Update Frontend

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin feature/cross-account-access
# Amplify will auto-deploy
```

### Add New User

1. Create user in IAM Identity Center
2. Assign to appropriate group
3. User can immediately access S3 Browser

### Add New Group

1. Create group in IAM Identity Center
2. Update Lambda `GROUP_BUCKET_ACCESS` configuration
3. Redeploy Lambda
4. Assign users to new group

### Monitor Usage

```bash
# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=s3browser-operations \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-04T00:00:00Z \
  --period 86400 \
  --statistics Sum \
  --region ap-southeast-1 \
  --profile your-profile

# API Gateway requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiId,Value=YOUR_API_ID \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-04T00:00:00Z \
  --period 86400 \
  --statistics Sum \
  --region ap-southeast-1 \
  --profile your-profile
```

---

## Part 11: Cleanup (If Needed)

### Delete Everything

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack \
  --stack-name s3browser-prod \
  --region ap-southeast-1 \
  --profile your-profile

# Delete Cognito User Pool (optional)
aws cognito-idp delete-user-pool \
  --user-pool-id ap-southeast-1_XXXXXXXXX \
  --region ap-southeast-1 \
  --profile your-profile

# Delete cross-account roles (in each secondary account)
aws cloudformation delete-stack \
  --stack-name s3browser-cross-account-role \
  --region ap-southeast-1 \
  --profile secondary-account-profile
```

**Note:** IAM Identity Center users and groups must be deleted manually from the console.

---

## Summary Checklist

After completing all steps, you should have:

- [x] IAM Identity Center enabled with users and groups
- [x] Cognito User Pool with SAML federation
- [x] GitHub repository with access token
- [x] Cross-account roles (if needed)
- [x] CloudFormation stack deployed
- [x] Lambda function running
- [x] API Gateway configured
- [x] Amplify app deployed
- [x] Cognito redirect URLs updated
- [x] Application accessible and working

---

## Support

For issues or questions:
1. Check CloudWatch Logs for Lambda errors
2. Review Amplify build logs
3. Verify all configuration values match
4. Check IAM permissions

## Estimated Time

- **First-time setup**: 2-3 hours
- **Subsequent deployments**: 15-30 minutes

## Cost Estimate

Monthly cost for typical usage:
- Lambda: $0.20
- API Gateway: $1.00
- Amplify: $1-3
- **Total: $2-5/month**
