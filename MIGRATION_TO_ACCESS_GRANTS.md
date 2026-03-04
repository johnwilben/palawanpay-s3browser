# Migration to S3 Access Grants

## What This Solves
✅ Users automatically see only buckets they have IAM Identity Center permissions for
✅ No manual configuration needed
✅ Permissions managed centrally in IAM Identity Center
✅ Works seamlessly across multiple AWS accounts

---

## Prerequisites
- IAM Identity Center already configured (✅ You have this)
- AWS CDK installed: `npm install -g aws-cdk`
- Node.js 16+

---

## Phase 1: Setup S3 Access Grants (Day 1)

### Step 1.1: Install Dependencies
```bash
cd /Users/wilbensibayan/Downloads/s3browser-access-grants/cdk
npm install
```

### Step 1.2: Configure Context
Edit `cdk.json` or pass via command line:
- `idcArn`: Your IAM Identity Center ARN
- `idcUserId`: Test user ID from IAM Identity Center
- `bucketName`: Test bucket name
- `accountId`: Your AWS account ID
- `region`: ap-southeast-1
- `idcAppArn`: IAM Identity Center application ARN
- `trustedTokenIssuerJwksEndpoint`: Your SAML JWKS endpoint

### Step 1.3: Deploy Access Grants Stack
```bash
cd /Users/wilbensibayan/Downloads/s3browser-access-grants/cdk

cdk deploy sample-S3AccessGrantStack \
  --context idcArn=arn:aws:sso:::instance/YOUR_INSTANCE_ID \
  --context idcUserId=YOUR_USER_ID \
  --context bucketName=test-bucket-s3-browser-ppay12 \
  --profile palawanpay
```

### Step 1.4: Deploy Lambda Stack
```bash
cdk deploy sample-LambdaStack \
  --context accountId=PRIMARY_ACCOUNT_ID \
  --context region=ap-southeast-1 \
  --context idcAppArn=YOUR_IDC_APP_ARN \
  --context trustedTokenIssuerJwksEndpoint=YOUR_JWKS_ENDPOINT \
  --profile palawanpay
```

---

## Phase 2: Update Frontend (Day 2)

### Step 2.1: Copy Sample Frontend
```bash
# Backup current app
cp -r /Users/wilbensibayan/Downloads/S3Browser /Users/wilbensibayan/Downloads/S3Browser-backup

# Copy new components
cp -r /Users/wilbensibayan/Downloads/s3browser-access-grants/src/* \
      /Users/wilbensibayan/Downloads/S3Browser/src/
```

### Step 2.2: Update Dependencies
```bash
cd /Users/wilbensibayan/Downloads/S3Browser
npm install @aws-amplify/ui-react-storage
```

### Step 2.3: Configure Environment
Create `.env` file:
```
VITE_AWS_REGION=ap-southeast-1
VITE_AWS_ACCOUNT_ID=PRIMARY_ACCOUNT_ID
VITE_APIGW_URL=https://YOUR_API_GATEWAY_URL/exchange
```

### Step 2.4: Test Locally
```bash
npm run dev
```

---

## Phase 3: Configure Permissions (Day 3)

### Step 3.1: Create Access Grants for Users
In AWS Console → S3 → Access Grants:

1. Create grant for user/group
2. Specify bucket or prefix
3. Set permission level (READ, WRITE, READWRITE)
4. Link to IAM Identity Center user/group

### Step 3.2: Test Access Control
1. Login as different users
2. Verify each sees only their allowed buckets
3. Test upload/download permissions

---

## Key Files to Review

### From Sample:
- `cdk/lib/lambda/handler.ts` - Token exchange logic
- `cdk/lib/access-grants-stack.ts` - S3 Access Grants setup
- `src/components/Home.tsx` - Storage Browser component

### Your Current App:
- `backend/lambda/s3-operations.py` - Will be replaced
- `src/components/BucketView.js` - Will use Storage Browser component

---

## Rollback Plan

If issues occur:
```bash
# Restore backup
rm -rf /Users/wilbensibayan/Downloads/S3Browser
mv /Users/wilbensibayan/Downloads/S3Browser-backup /Users/wilbensibayan/Downloads/S3Browser

# Destroy CDK stacks
cd /Users/wilbensibayan/Downloads/s3browser-access-grants/cdk
cdk destroy sample-LambdaStack --profile palawanpay
cdk destroy sample-S3AccessGrantStack --profile palawanpay
```

---

## Next Steps

**Ready to start?**

1. ✅ Sample cloned
2. ⏳ Install CDK dependencies
3. ⏳ Get IAM Identity Center details
4. ⏳ Deploy Access Grants stack
5. ⏳ Test with one bucket

**What do you need help with first?**
- Getting IAM Identity Center ARNs?
- Understanding the Lambda code?
- Deploying the CDK stacks?
