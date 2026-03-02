# Deployment Guide

## Prerequisites

- AWS CLI configured with credentials for account 821276124335
- Node.js 18+ and npm installed
- Git installed
- Access to GitHub repository
- AWS Amplify Console access
- IAM permissions to create/modify resources

## Initial Deployment

### 1. Repository Setup

```bash
# Clone repository
git clone https://github.com/johnwilben/palawanpay-s3browser.git
cd palawanpay-s3browser

# Install dependencies
npm install
```

### 2. AWS Infrastructure Setup

#### Create Lambda Execution Role

```bash
# Create trust policy
cat > /tmp/lambda-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name LambdaS3BrowserRole \
  --assume-role-policy-document file:///tmp/lambda-trust.json \
  --region ap-southeast-1 \
  --profile palawanpay

# Attach policies
aws iam attach-role-policy \
  --role-name LambdaS3BrowserRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess \
  --profile palawanpay

aws iam attach-role-policy \
  --role-name LambdaS3BrowserRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess \
  --profile palawanpay
```

#### Deploy Lambda Function

```bash
cd backend/lambda
zip function.zip s3-operations.py

aws lambda create-function \
  --function-name s3browser-operations \
  --runtime python3.11 \
  --role arn:aws:iam::821276124335:role/LambdaS3BrowserRole \
  --handler s3-operations.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 128 \
  --region ap-southeast-1 \
  --profile palawanpay
```

#### Create API Gateway

```bash
# Create API
aws apigatewayv2 create-api \
  --name s3browser-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="*" \
  --region ap-southeast-1 \
  --profile palawanpay

# Note the ApiId from output

# Create integration
aws apigatewayv2 create-integration \
  --api-id <API_ID> \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:ap-southeast-1:821276124335:function:s3browser-operations \
  --payload-format-version 2.0 \
  --region ap-southeast-1 \
  --profile palawanpay

# Note the IntegrationId from output

# Create route
aws apigatewayv2 create-route \
  --api-id <API_ID> \
  --route-key '$default' \
  --target integrations/<INTEGRATION_ID> \
  --region ap-southeast-1 \
  --profile palawanpay

# Create stage
aws apigatewayv2 create-stage \
  --api-id <API_ID> \
  --stage-name prod \
  --auto-deploy \
  --region ap-southeast-1 \
  --profile palawanpay

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name s3browser-operations \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-southeast-1:821276124335:<API_ID>/*/*" \
  --region ap-southeast-1 \
  --profile palawanpay
```

#### Create Cognito User Pool

```bash
# Create user pool
aws cognito-idp create-user-pool \
  --pool-name palawanpay-s3browser \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OFF \
  --region ap-southeast-1 \
  --profile palawanpay

# Note the UserPoolId

# Create user pool domain
aws cognito-idp create-user-pool-domain \
  --domain palawanpay-s3browser \
  --user-pool-id <USER_POOL_ID> \
  --region ap-southeast-1 \
  --profile palawanpay

# Create user pool client
aws cognito-idp create-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-name s3browser-spa-client \
  --allowed-o-auth-flows code \
  --allowed-o-auth-flows-user-pool-client \
  --allowed-o-auth-scopes openid email profile aws.cognito.signin.user.admin \
  --callback-urls http://localhost:3000/ \
  --logout-urls http://localhost:3000/ \
  --supported-identity-providers COGNITO \
  --region ap-southeast-1 \
  --profile palawanpay

# Note the ClientId
```

#### Configure IAM Identity Center

1. Go to IAM Identity Center Console
2. Navigate to **Applications** → **Add application**
3. Select **Custom SAML 2.0 application**
4. Configure:
   - Name: PalawanPay S3 Browser
   - Application ACS URL: `https://palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com/saml2/idpresponse`
   - Application SAML audience: `urn:amazon:cognito:sp:<USER_POOL_ID>`
5. Attribute mappings:
   - Subject: `${user:email}` (emailAddress)
   - email: `${user:email}` (unspecified)
   - name: `${user:name}` (unspecified)
6. Download metadata URL
7. Assign users/groups

#### Add IAM Identity Center to Cognito

```bash
aws cognito-idp create-identity-provider \
  --user-pool-id <USER_POOL_ID> \
  --provider-name IAMIdentityCenter \
  --provider-type SAML \
  --provider-details MetadataURL=<METADATA_URL>,attributes_request_method=GET \
  --attribute-mapping email=http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress,name=http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name \
  --region ap-southeast-1 \
  --profile palawanpay

# Update client to support IAM Identity Center
aws cognito-idp update-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --supported-identity-providers COGNITO IAMIdentityCenter \
  --region ap-southeast-1 \
  --profile palawanpay
```

#### Create Identity Pool

```bash
aws cognito-identity create-identity-pool \
  --identity-pool-name palawanpay_s3browser \
  --no-allow-unauthenticated-identities \
  --cognito-identity-providers ProviderName=cognito-idp.ap-southeast-1.amazonaws.com/<USER_POOL_ID>,ClientId=<CLIENT_ID> \
  --region ap-southeast-1 \
  --profile palawanpay

# Note the IdentityPoolId
```

### 3. Update Configuration

Edit `src/aws-exports.js`:

```javascript
const config = {
  Auth: {
    Cognito: {
      userPoolId: '<USER_POOL_ID>',
      userPoolClientId: '<CLIENT_ID>',
      identityPoolId: '<IDENTITY_POOL_ID>',
      loginWith: {
        oauth: {
          domain: 'palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: ['http://localhost:3000/'],
          redirectSignOut: ['http://localhost:3000/'],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    REST: {
      S3BrowserAPI: {
        endpoint: 'https://<API_ID>.execute-api.ap-southeast-1.amazonaws.com/prod',
        region: 'ap-southeast-1'
      }
    }
  }
};
```

### 4. Deploy to Amplify

#### Via Console

1. Go to [Amplify Console](https://ap-southeast-1.console.aws.amazon.com/amplify/home?region=ap-southeast-1)
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub**
4. Authorize AWS Amplify
5. Select repository: `johnwilben/palawanpay-s3browser`
6. Branch: `main`
7. Amplify auto-detects `amplify.yml`
8. Click **"Save and deploy"**

#### Update Callback URLs

Once deployed, get the Amplify URL and update Cognito:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --callback-urls https://<AMPLIFY_URL>/ http://localhost:3000/ \
  --logout-urls https://<AMPLIFY_URL>/ http://localhost:3000/ \
  --region ap-southeast-1 \
  --profile palawanpay
```

Update `src/aws-exports.js` with Amplify URL and push changes.

## Cross-Account Deployment

### For Each Additional Account

#### 1. Create Cross-Account Role

In the target account:

```bash
# Create trust policy
cat > /tmp/cross-account-trust.json << 'EOF'
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
EOF

# Create role
aws iam create-role \
  --role-name S3BrowserCrossAccountRole \
  --assume-role-policy-document file:///tmp/cross-account-trust.json

# Attach S3 permissions
aws iam attach-role-policy \
  --role-name S3BrowserCrossAccountRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

#### 2. Update Lambda Configuration

Edit `backend/lambda/s3-operations.py`:

```python
CROSS_ACCOUNT_ROLES = [
    {'account': '821276124335', 'role': None},
    {'account': '<NEW_ACCOUNT_ID>', 'role': 'arn:aws:iam::<NEW_ACCOUNT_ID>:role/S3BrowserCrossAccountRole'}
]
```

#### 3. Grant AssumeRole Permission

In primary account (821276124335):

```bash
# Create policy
cat > /tmp/assume-role-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::<NEW_ACCOUNT_ID>:role/S3BrowserCrossAccountRole"
    }
  ]
}
EOF

# Create or update policy
aws iam create-policy \
  --policy-name S3BrowserCrossAccountAssumeRole \
  --policy-document file:///tmp/assume-role-policy.json \
  --profile palawanpay

# Or update existing policy
aws iam create-policy-version \
  --policy-arn arn:aws:iam::821276124335:policy/S3BrowserCrossAccountAssumeRole \
  --policy-document file:///tmp/assume-role-policy.json \
  --set-as-default \
  --profile palawanpay

# Attach to Lambda role
aws iam attach-role-policy \
  --role-name LambdaS3BrowserRole \
  --policy-arn arn:aws:iam::821276124335:policy/S3BrowserCrossAccountAssumeRole \
  --profile palawanpay
```

#### 4. Deploy Lambda Update

```bash
cd backend/lambda
zip function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile palawanpay
```

## Updating Deployment

### Frontend Updates

```bash
# Make changes
git add .
git commit -m "Description"
git push origin main

# Amplify auto-deploys
```

### Lambda Updates

```bash
cd backend/lambda
# Edit s3-operations.py
zip function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile palawanpay
```

### Configuration Updates

```bash
# Update Cognito
aws cognito-idp update-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --callback-urls <NEW_URLS> \
  --region ap-southeast-1 \
  --profile palawanpay

# Update API Gateway (if needed)
aws apigatewayv2 update-api \
  --api-id <API_ID> \
  --cors-configuration AllowOrigins="<NEW_ORIGINS>" \
  --region ap-southeast-1 \
  --profile palawanpay
```

## Rollback Procedures

### Frontend Rollback

In Amplify Console:
1. Go to app → Deployments
2. Find previous successful deployment
3. Click **"Redeploy this version"**

### Lambda Rollback

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name s3browser-operations \
  --region ap-southeast-1 \
  --profile palawanpay

# Update alias to previous version
aws lambda update-alias \
  --function-name s3browser-operations \
  --name prod \
  --function-version <PREVIOUS_VERSION> \
  --region ap-southeast-1 \
  --profile palawanpay
```

## Monitoring Deployment

### Check Amplify Build

```bash
# Via Console
# Go to Amplify → App → Build history

# Via CLI
aws amplify list-apps --region ap-southeast-1 --profile palawanpay
```

### Check Lambda Deployment

```bash
aws lambda get-function \
  --function-name s3browser-operations \
  --region ap-southeast-1 \
  --profile palawanpay
```

### Test Deployment

```bash
# Test API
curl https://<API_ID>.execute-api.ap-southeast-1.amazonaws.com/prod/buckets

# Test frontend
open https://<AMPLIFY_URL>
```

## Troubleshooting Deployment

### Build Failures

Check Amplify build logs in console

Common issues:
- Missing dependencies: Check `package.json`
- Build script errors: Check `amplify.yml`
- Environment variables: Set in Amplify console

### Lambda Deployment Failures

```bash
# Check Lambda logs
aws logs tail /aws/lambda/s3browser-operations --follow \
  --region ap-southeast-1 \
  --profile palawanpay
```

Common issues:
- IAM role permissions
- Timeout too low
- Memory too low
- Code syntax errors

### Authentication Issues

- Verify Cognito callback URLs
- Check IAM Identity Center application assignment
- Confirm SAML metadata URL is correct
- Test with CloudWatch Logs
