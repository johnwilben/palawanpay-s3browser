# S3 Browser - CloudFormation Deployment

Deploy the entire S3 Browser infrastructure to any AWS account with a single command.

## Quick Start

1. **Copy parameters template:**
   ```bash
   cp parameters.json.example parameters.json
   ```

2. **Edit parameters.json** with your values:
   - GitHub token
   - Cognito User Pool details
   - Cross-account role ARNs

3. **Run deployment:**
   ```bash
   ./deploy.sh s3browser-prod ap-southeast-1 palawanpay
   ```

4. **Update Cognito redirect URLs** (shown in output)

5. **Create IAM Identity Center groups:**
   - s3-browser-admin
   - s3-browser-datalake
   - s3-browser-finance
   - s3-browser-finance-GL
   - s3-browser-archive-treasury
   - s3-browser-visa
   - s3-browser-pgc

## What Gets Deployed

- ✅ Lambda function (s3browser-operations)
- ✅ API Gateway HTTP API with JWT authorizer
- ✅ Amplify app connected to GitHub
- ✅ IAM roles and permissions
- ✅ CORS configuration
- ✅ Environment variables

## Manual Steps Required

1. **GitHub Token**: Create at https://github.com/settings/tokens
   - Needs `repo` scope

2. **Cognito Redirect URLs**: Update after deployment
   ```bash
   aws cognito-idp update-user-pool-client \
     --user-pool-id YOUR_POOL_ID \
     --client-id YOUR_CLIENT_ID \
     --callback-urls "http://localhost:3000/","https://YOUR-AMPLIFY-URL/" \
     --logout-urls "http://localhost:3000/","https://YOUR-AMPLIFY-URL/"
   ```

3. **IAM Identity Center Groups**: Create via AWS Console

## Cross-Account Setup

Deploy the cross-account role in each secondary account:

```bash
aws cloudformation create-stack \
  --stack-name s3browser-cross-account-role \
  --template-body file://cloudformation/cross-account-role.yaml \
  --parameters ParameterKey=PrimaryAccountId,ParameterValue=821276124335 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1
```

## Updating

To update the stack:
```bash
aws cloudformation update-stack \
  --stack-name s3browser-prod \
  --template-body file://cloudformation/s3browser-infrastructure.yaml \
  --parameters file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM
```

To update Lambda code only:
```bash
cd backend/lambda
zip -r function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip
```

## Deleting

```bash
aws cloudformation delete-stack --stack-name s3browser-prod
```

## Documentation

- Full deployment guide: [cloudformation/DEPLOYMENT.md](cloudformation/DEPLOYMENT.md)
- Architecture overview: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Group configuration: [docs/GROUP_ACCESS_CONTROL.md](docs/GROUP_ACCESS_CONTROL.md)

## Cost

Estimated monthly cost: **$2-5** for typical usage
- Lambda: ~$0.20
- API Gateway: ~$1.00
- Amplify: ~$1-3
