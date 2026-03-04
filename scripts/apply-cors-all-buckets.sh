#!/bin/bash
# Script to apply CORS configuration to all S3 buckets across all accounts

echo "Applying CORS to all buckets in account 821276124335..."

# Get all buckets in primary account
BUCKETS=$(aws s3api list-buckets --query 'Buckets[].Name' --output text --profile palawanpay --region ap-southeast-1)

# CORS configuration
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

# Apply to each bucket
for BUCKET in $BUCKETS; do
    echo "Applying CORS to: $BUCKET"
    aws s3api put-bucket-cors \
      --bucket "$BUCKET" \
      --cors-configuration file:///tmp/cors-config.json \
      --profile palawanpay \
      --region ap-southeast-1 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Success: $BUCKET"
    else
        echo "  ✗ Failed: $BUCKET (may not have permission)"
    fi
done

echo ""
echo "Done! CORS applied to all accessible buckets."
echo ""
echo "Note: For cross-account buckets (730335474290, 684538810129),"
echo "you need to run this script with credentials for those accounts."
