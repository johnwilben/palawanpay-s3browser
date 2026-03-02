# S3Browser - PalawanPay S3 Management Portal

Web application for managing S3 buckets with Entra SSO integration.

## Features

- Entra ID (Azure AD) SSO + Username/Password authentication
- List all accessible S3 buckets with permission detection
- Upload/download files based on user permissions
- PalawanPay branding

## Setup Instructions

### 1. Install Dependencies

```bash
cd ~/Downloads/S3Browser
npm install
```

### 2. Configure AWS Resources

#### A. Create Cognito User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name palawanpay-s3browser \
  --region ap-southeast-1 \
  --profile <your-profile>
```

Save the `UserPoolId` from the output.

#### B. Create Cognito User Pool Client

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <UserPoolId> \
  --client-name s3browser-client \
  --generate-secret \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --callback-urls http://localhost:3000/,https://main.XXXXXX.amplifyapp.com/ \
  --logout-urls http://localhost:3000/,https://main.XXXXXX.amplifyapp.com/ \
  --supported-identity-providers COGNITO \
  --region ap-southeast-1 \
  --profile <your-profile>
```

Save the `ClientId` from the output.

#### C. Create Identity Pool

```bash
aws cognito-identity create-identity-pool \
  --identity-pool-name palawanpay_s3browser \
  --allow-unauthenticated-identities false \
  --cognito-identity-providers ProviderName=cognito-idp.ap-southeast-1.amazonaws.com/<UserPoolId>,ClientId=<ClientId> \
  --region ap-southeast-1 \
  --profile <your-profile>
```

Save the `IdentityPoolId` from the output.

#### D. Deploy Lambda Function

```bash
cd backend/lambda
zip function.zip s3-operations.py

aws lambda create-function \
  --function-name s3browser-operations \
  --runtime python3.11 \
  --role arn:aws:iam::821276124335:role/LambdaS3BrowserRole \
  --handler s3-operations.lambda_handler \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile <your-profile>
```

**Note:** Create the IAM role `LambdaS3BrowserRole` with permissions for S3 and CloudWatch Logs first.

#### E. Create API Gateway

```bash
aws apigatewayv2 create-api \
  --name s3browser-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:ap-southeast-1:821276124335:function:s3browser-operations \
  --region ap-southeast-1 \
  --profile <your-profile>
```

Save the `ApiEndpoint` from the output.

#### F. Configure Entra ID Federation

1. Go to Azure Portal → App Registrations → New Registration
2. Name: `PalawanPay S3 Browser`
3. Redirect URI: `https://palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com/oauth2/idpresponse`
4. Save Tenant ID, Application (Client) ID, and create a Client Secret
5. In Cognito User Pool, add Entra ID as identity provider with these credentials

### 3. Update Configuration

Edit `src/aws-exports.js` with your actual values:
- `userPoolId`
- `userPoolClientId`
- `identityPoolId`
- `oauth.domain`
- `API.REST.S3BrowserAPI.endpoint`

### 4. Deploy to Amplify

```bash
# Initialize git repo
git init
git add .
git commit -m "Initial commit"

# Create Amplify app
aws amplify create-app \
  --name s3browser \
  --region ap-southeast-1 \
  --profile <your-profile>

# Connect repository and deploy
# Follow AWS Amplify console instructions
```

### 5. IAM Permissions

Create IAM role for Lambda with these policies:
- `AmazonS3ReadOnlyAccess` (or custom policy for specific buckets)
- `CloudWatchLogsFullAccess`

For cross-account bucket access (Organization-wide), set up assume role trust relationships.

## Local Development

```bash
npm start
```

Visit `http://localhost:3000`

## Account Details

- AWS Account: 821276124335
- Region: ap-southeast-1 (Singapore)

## TODO

- [ ] Update Entra ID credentials in Cognito
- [ ] Configure cross-account roles for Organization bucket access
- [ ] Add PalawanPay logo to `public/` folder
- [ ] Update brand colors if needed
- [ ] Set up CloudWatch monitoring
