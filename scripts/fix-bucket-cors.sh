#!/bin/bash
# Script to add CORS configuration to S3 buckets

BUCKET_NAME="$1"

if [ -z "$BUCKET_NAME" ]; then
    echo "Usage: ./fix-bucket-cors.sh <bucket-name>"
    exit 1
fi

# Create CORS configuration
cat > /tmp/cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": [
        "https://main.drm7arslkowgf.amplifyapp.com",
        "https://feature-cross-account-access.drm7arslkowgf.amplifyapp.com",
        "http://localhost:3000"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration file:///tmp/cors-config.json \
  --profile palawanpay \
  --region ap-southeast-1

echo "CORS configuration applied to bucket: $BUCKET_NAME"
