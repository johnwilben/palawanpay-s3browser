#!/bin/bash
set -e

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID}"
ECR_REPOSITORY="${ECR_REPOSITORY:-s3browser}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
AWS_PROFILE="${AWS_PROFILE:-default}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== S3 Browser - Build and Push to ECR ===${NC}\n"

# Validate required variables
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Error: AWS_ACCOUNT_ID is required${NC}"
    echo "Usage: AWS_ACCOUNT_ID=123456789012 ./build-and-push.sh"
    exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE_NAME="${ECR_URI}/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  AWS Account: ${AWS_ACCOUNT_ID}"
echo "  AWS Region: ${AWS_REGION}"
echo "  AWS Profile: ${AWS_PROFILE}"
echo "  ECR Repository: ${ECR_REPOSITORY}"
echo "  Image Tag: ${IMAGE_TAG}"
echo "  Full Image: ${FULL_IMAGE_NAME}"
echo ""

# Check if ECR repository exists, create if not
echo -e "${YELLOW}Checking ECR repository...${NC}"
if ! aws ecr describe-repositories \
    --repository-names ${ECR_REPOSITORY} \
    --region ${AWS_REGION} \
    --profile ${AWS_PROFILE} \
    >/dev/null 2>&1; then
    
    echo -e "${YELLOW}Creating ECR repository: ${ECR_REPOSITORY}${NC}"
    aws ecr create-repository \
        --repository-name ${ECR_REPOSITORY} \
        --region ${AWS_REGION} \
        --profile ${AWS_PROFILE} \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
    
    echo -e "${GREEN}✓ ECR repository created${NC}\n"
else
    echo -e "${GREEN}✓ ECR repository exists${NC}\n"
fi

# Login to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password \
    --region ${AWS_REGION} \
    --profile ${AWS_PROFILE} | \
    docker login --username AWS --password-stdin ${ECR_URI}

echo -e "${GREEN}✓ Logged in to ECR${NC}\n"

# Build Docker image for ARM64 (Graviton)
echo -e "${YELLOW}Building Docker image for ARM64...${NC}"
docker buildx build --platform linux/arm64 -t ${ECR_REPOSITORY}:${IMAGE_TAG} --load .

echo -e "${GREEN}✓ Docker image built${NC}\n"

# Tag image for ECR
echo -e "${YELLOW}Tagging image for ECR...${NC}"
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${FULL_IMAGE_NAME}

echo -e "${GREEN}✓ Image tagged${NC}\n"

# Push to ECR
echo -e "${YELLOW}Pushing image to ECR...${NC}"
docker push ${FULL_IMAGE_NAME}

echo -e "${GREEN}✓ Image pushed to ECR${NC}\n"

# Get image digest
IMAGE_DIGEST=$(aws ecr describe-images \
    --repository-name ${ECR_REPOSITORY} \
    --image-ids imageTag=${IMAGE_TAG} \
    --region ${AWS_REGION} \
    --profile ${AWS_PROFILE} \
    --query 'imageDetails[0].imageDigest' \
    --output text)

echo -e "${GREEN}=== Build Complete ===${NC}"
echo ""
echo "Image URI: ${FULL_IMAGE_NAME}"
echo "Image Digest: ${IMAGE_DIGEST}"
echo ""
echo -e "${YELLOW}Use this image in your ECS task definition:${NC}"
echo "${FULL_IMAGE_NAME}"
