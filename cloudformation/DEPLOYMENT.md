# S3 Browser - CloudFormation Deployment Guide

## Prerequisites

1. **IAM Identity Center** configured in your AWS account
2. **Cognito User Pool** integrated with IAM Identity Center (SAML)
3. **GitHub Personal Access Token** with repo access
4. **AWS CLI** configured with appropriate credentials

## Step 1: Prepare Parameters

Create a parameters file `parameters.json`:

```json
[
  {
    "ParameterKey": "GitHubRepository",
    "ParameterValue": "https://github.com/johnwilben/palawanpay-s3browser"
  },
  {
    "ParameterKey": "GitHubBranch",
    "ParameterValue": "feature/cross-account-access"
  },
  {
    "ParameterKey": "GitHubToken",
    "ParameterValue": "ghp_YOUR_TOKEN_HERE"
  },
  {
    "ParameterKey": "IdentityStoreId",
    "ParameterValue": "d-96677c10e5"
  },
  {
    "ParameterKey": "CognitoUserPoolId",
    "ParameterValue": "ap-southeast-1_YdUsCa38i"
  },
  {
    "ParameterKey": "CognitoUserPoolClientId",
    "ParameterValue": "19lg9i63etaa6322ml0jv0clqu"
  },
  {
    "ParameterKey": "CognitoUserPoolDomain",
    "ParameterValue": "palawanpay-s3browser"
  },
  {
    "ParameterKey": "CrossAccountRoleArn1",
    "ParameterValue": "arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole"
  },
  {
    "ParameterKey": "CrossAccountRoleArn2",
    "ParameterValue": "arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole"
  },
  {
    "ParameterKey": "CrossAccountRoleArn3",
    "ParameterValue": ""
  }
]
```

## Step 2: Deploy CloudFormation Stack

```bash
aws cloudformation create-stack \
  --stack-name s3browser-prod \
  --template-body file://cloudformation/s3browser-infrastructure.yaml \
  --parameters file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --profile palawanpay
```

Wait for stack creation:
```bash
aws cloudformation wait stack-create-complete \
  --stack-name s3browser-prod \
  --region ap-southeast-1 \
  --profile palawanpay
```

## Step 3: Get Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name s3browser-prod \
  --region ap-southeast-1 \
  --profile palawanpay \
  --query 'Stacks[0].Outputs'
```

Note down:
- `APIEndpoint`
- `AmplifyURL`
- `LambdaFunctionName`

## Step 4: Deploy Lambda Code

```bash
cd backend/lambda
zip -r function.zip s3-operations.py

aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile palawanpay
```

## Step 5: Update Cognito Redirect URLs

Add the Amplify URL to Cognito:

```bash
AMPLIFY_URL="https://feature-cross-account-access.d1234567890.amplifyapp.com"

aws cognito-idp update-user-pool-client \
  --user-pool-id ap-southeast-1_YdUsCa38i \
  --client-id 19lg9i63etaa6322ml0jv0clqu \
  --callback-urls "https://localhost:3000/","$AMPLIFY_URL/" \
  --logout-urls "https://localhost:3000/","$AMPLIFY_URL/" \
  --region ap-southeast-1 \
  --profile palawanpay
```

## Step 6: Update Frontend Configuration

The CloudFormation stack automatically sets environment variables for Amplify, but verify `src/aws-exports.js` matches:

```javascript
const awsconfig = {
  aws_project_region: 'ap-southeast-1',
  aws_cognito_region: 'ap-southeast-1',
  aws_user_pools_id: 'ap-southeast-1_YdUsCa38i',
  aws_user_pools_web_client_id: '19lg9i63etaa6322ml0jv0clqu',
  oauth: {
    domain: 'palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com',
    redirectSignIn: ['https://YOUR-AMPLIFY-URL/', 'http://localhost:3000/'],
    redirectSignOut: ['https://YOUR-AMPLIFY-URL/', 'http://localhost:3000/'],
    responseType: 'code'
  }
};
```

Commit and push changes to trigger Amplify rebuild.

## Step 7: Create IAM Identity Center Groups

```bash
# You'll need to do this via AWS Console or IAM Identity Center API
# Create these groups:
- s3-browser-admin
- s3-browser-datalake
- s3-browser-finance
- s3-browser-finance-GL
- s3-browser-archive-treasury
- s3-browser-visa
- s3-browser-pgc
```

## Step 8: Setup Cross-Account Roles (if needed)

In each cross-account, create the trust role:

```bash
aws cloudformation create-stack \
  --stack-name s3browser-cross-account-role \
  --template-body file://cloudformation/cross-account-role.yaml \
  --parameters ParameterKey=PrimaryAccountId,ParameterValue=821276124335 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1
```

## Updating the Stack

To update the infrastructure:

```bash
aws cloudformation update-stack \
  --stack-name s3browser-prod \
  --template-body file://cloudformation/s3browser-infrastructure.yaml \
  --parameters file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --profile palawanpay
```

## Deleting the Stack

```bash
aws cloudformation delete-stack \
  --stack-name s3browser-prod \
  --region ap-southeast-1 \
  --profile palawanpay
```

**Note:** This will delete all resources except:
- Cognito User Pool (pre-existing)
- IAM Identity Center (pre-existing)
- S3 buckets (not managed by this stack)

## Troubleshooting

### Lambda deployment fails
```bash
# Check Lambda logs
aws logs tail /aws/lambda/s3browser-operations --follow --region ap-southeast-1 --profile palawanpay
```

### Amplify build fails
```bash
# Check Amplify console for build logs
aws amplify list-apps --region ap-southeast-1 --profile palawanpay
```

### CORS errors
- Verify API Gateway CORS configuration
- Check Cognito redirect URLs include Amplify URL
- Ensure OPTIONS route has no authorizer

## Cost Estimate

- **Lambda**: ~$0.20/month (1M requests)
- **API Gateway**: ~$1.00/month (1M requests)
- **Amplify**: ~$0.01/month (build minutes) + $0.15/GB served
- **Total**: ~$2-5/month for typical usage
