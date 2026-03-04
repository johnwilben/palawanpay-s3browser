#!/bin/bash
set -e

# S3 Browser - Quick Deployment Script
# Usage: ./deploy.sh <stack-name> <region> <profile>

STACK_NAME=${1:-s3browser-prod}
REGION=${2:-ap-southeast-1}
PROFILE=${3:-palawanpay}

echo "🚀 Deploying S3 Browser to $STACK_NAME in $REGION"

# Check if parameters.json exists
if [ ! -f "parameters.json" ]; then
    echo "❌ parameters.json not found!"
    echo "Create parameters.json with your configuration. See DEPLOYMENT.md for template."
    exit 1
fi

# Deploy CloudFormation stack
echo "📦 Creating CloudFormation stack..."
aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body file://cloudformation/s3browser-infrastructure.yaml \
    --parameters file://parameters.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --profile "$PROFILE"

echo "⏳ Waiting for stack creation..."
aws cloudformation wait stack-create-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --profile "$PROFILE"

# Get outputs
echo "📋 Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Deploy Lambda code
echo "📤 Deploying Lambda code..."
cd backend/lambda
zip -r function.zip s3-operations.py
aws lambda update-function-code \
    --function-name s3browser-operations \
    --zip-file fileb://function.zip \
    --region "$REGION" \
    --profile "$PROFILE"
cd ../..

# Get Amplify URL
AMPLIFY_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Stacks[0].Outputs[?OutputKey==`AmplifyURL`].OutputValue' \
    --output text)

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update Cognito redirect URLs to include: $AMPLIFY_URL"
echo "2. Create IAM Identity Center groups (see DEPLOYMENT.md)"
echo "3. Access the app at: $AMPLIFY_URL"
echo ""
echo "To update Cognito redirect URLs, run:"
echo "aws cognito-idp update-user-pool-client \\"
echo "  --user-pool-id YOUR_POOL_ID \\"
echo "  --client-id YOUR_CLIENT_ID \\"
echo "  --callback-urls \"http://localhost:3000/\",\"$AMPLIFY_URL/\" \\"
echo "  --logout-urls \"http://localhost:3000/\",\"$AMPLIFY_URL/\" \\"
echo "  --region $REGION --profile $PROFILE"
