# CloudFormation Deployment Guide

## Prerequisites

1. Get your IAM Identity Center details:
```bash
# Get Instance ARN
aws sso-admin list-instances --region ap-southeast-1 --profile palawanpay

# Get Application ARN (if you have one, or create new)
aws sso-admin list-applications \
  --instance-arn YOUR_INSTANCE_ARN \
  --region ap-southeast-1 \
  --profile palawanpay
```

2. Note your SAML assertion URL from IAM Identity Center

---

## Deployment Steps

### Step 1: Update Parameters

Edit `cloudformation/s3-access-grants-infrastructure.yaml` and update the Default values:

```yaml
Parameters:
  IAMIdentityCenterInstanceArn:
    Default: 'arn:aws:sso:::instance/ssoins-XXXXXXXXXX'  # Your actual instance ARN
  
  IAMIdentityCenterApplicationArn:
    Default: 'arn:aws:sso::ACCOUNT_ID:application/ssoins-XXX/apl-XXX'  # Your app ARN
  
  TrustedTokenIssuer:
    Default: 'https://portal.sso.ap-southeast-1.amazonaws.com/saml/assertion/XXX'  # Your issuer
```

### Step 2: Deploy Stack

```bash
cd /Users/wilbensibayan/Downloads/S3Browser

aws cloudformation create-stack \
  --stack-name s3browser-access-grants \
  --template-body file://cloudformation/s3-access-grants-infrastructure.yaml \
  --capabilities CAPABILITY_IAM \
  --region ap-southeast-1 \
  --profile palawanpay
```

### Step 3: Monitor Deployment

```bash
aws cloudformation describe-stacks \
  --stack-name s3browser-access-grants \
  --region ap-southeast-1 \
  --profile palawanpay \
  --query 'Stacks[0].StackStatus'
```

Wait until status is `CREATE_COMPLETE` (5-10 minutes)

### Step 4: Get Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name s3browser-access-grants \
  --region ap-southeast-1 \
  --profile palawanpay \
  --query 'Stacks[0].Outputs'
```

You'll get:
- `ApiGatewayUrl` - Use this in your frontend
- `TestBucketName` - Test bucket created
- `AccessGrantsInstanceArn` - For creating grants
- `LambdaFunctionArn` - Token exchange function

---

## Step 5: Create Access Grants

### Via AWS Console

1. Go to **S3 → Access Grants**
2. Click **Create grant**
3. Fill in:
   - **Grantee**: IAM Identity Center user or group
   - **Location**: `s3://test-s3browser-access-grants/*`
   - **Permission**: READWRITE
4. Click **Create**

### Via AWS CLI

```bash
# Get your IAM Identity Center user ID
aws identitystore list-users \
  --identity-store-id d-XXXXXXXXXX \
  --filters AttributePath=UserName,AttributeValue=wilben.s@palawanpay.com \
  --region ap-southeast-1

# Create grant
aws s3control create-access-grant \
  --account-id YOUR_ACCOUNT_ID \
  --access-grants-location-id YOUR_LOCATION_ID \
  --grantee Type=IAM_IDENTITY_CENTER_USER,Identifier=YOUR_USER_ID \
  --permission READWRITE \
  --region ap-southeast-1 \
  --profile palawanpay
```

---

## Step 6: Update Frontend

Update your `.env` file:

```bash
VITE_AWS_REGION=ap-southeast-1
VITE_AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
VITE_APIGW_URL=https://XXXXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/prod/exchange
```

---

## Troubleshooting

### Stack Creation Failed

```bash
# Check events
aws cloudformation describe-stack-events \
  --stack-name s3browser-access-grants \
  --region ap-southeast-1 \
  --profile palawanpay \
  --max-items 20
```

### Delete and Retry

```bash
aws cloudformation delete-stack \
  --stack-name s3browser-access-grants \
  --region ap-southeast-1 \
  --profile palawanpay

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name s3browser-access-grants \
  --region ap-southeast-1 \
  --profile palawanpay
```

---

## What Gets Created

✅ S3 bucket with CORS configured
✅ S3 Access Grants instance
✅ S3 Access Grants location
✅ Lambda function for token exchange
✅ API Gateway endpoint
✅ IAM roles with proper permissions

**Total Cost:** ~$5-10/month (same as current setup)

---

## Next Steps

1. Deploy the CloudFormation stack
2. Create access grants for your users
3. Update frontend to use new API Gateway URL
4. Test with different users

**Ready to deploy?** Just run the commands above!
