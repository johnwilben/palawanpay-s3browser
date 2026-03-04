# IAM Identity Center Group-Based Access - Setup Guide

## Overview

Users are automatically filtered based on their IAM Identity Center group membership. No manual user management needed!

---

## Step 1: Get IAM Identity Center Details

```bash
# Get Identity Store ID
aws sso-admin list-instances --region ap-southeast-1 --profile palawanpay

# Output will show:
# "IdentityStoreId": "d-XXXXXXXXXX"
# "InstanceArn": "arn:aws:sso:::instance/ssoins-XXXXXXXXXX"
```

---

## Step 2: Update Lambda Code

Edit `backend/lambda/s3-operations.py` lines 9-10:

```python
IDENTITY_STORE_ID = 'd-XXXXXXXXXX'  # Your actual ID
IAM_IDENTITY_CENTER_INSTANCE_ARN = 'arn:aws:sso:::instance/ssoins-XXXXXXXXXX'
```

---

## Step 3: Create Groups in IAM Identity Center

**AWS Console → IAM Identity Center → Groups → Create group**

Create these groups:
- `s3-browser-admin` - Full access
- `s3-browser-datalake` - Data lake buckets only
- `s3-browser-test` - Test buckets only
- `s3-browser-finance` - Finance buckets only
- `s3-browser-reports` - Report buckets only

---

## Step 4: Assign Users to Groups

**AWS Console → IAM Identity Center → Users → [Select User] → Groups → Add to groups**

Example:
- Add data engineers to `s3-browser-datalake`
- Add developers to `s3-browser-test`
- Add admins to `s3-browser-admin`

---

## Step 5: Update IAM Policy

```bash
aws iam put-role-policy \
  --role-name LambdaS3BrowserRole \
  --policy-name S3BrowserPolicy \
  --policy-document file://backend/iam-policy.json \
  --region ap-southeast-1 \
  --profile palawanpay
```

---

## Step 6: Deploy Lambda

```bash
cd /Users/wilbensibayan/Downloads/S3Browser/backend/lambda
zip -r function.zip s3-operations.py

aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile palawanpay
```

---

## Step 7: Test

1. Login as user in `s3-browser-test` group
2. Should only see test-* and testing-* buckets
3. Login as user in `s3-browser-admin` group
4. Should see all buckets

---

## Group-to-Bucket Mapping

Edit in `s3-operations.py` line 18:

```python
GROUP_BUCKET_ACCESS = {
    's3-browser-admin': ['*'],
    's3-browser-datalake': ['datalake-*', 'pgcdatalake-*'],
    's3-browser-test': ['test-*', 'testing-*'],
    's3-browser-finance': ['finance-*', 'accounting-*'],
    's3-browser-reports': ['report-*', 'ppay-report-*']
}
```

---

## Adding New Groups

1. Create group in IAM Identity Center
2. Add to `GROUP_BUCKET_ACCESS` in Lambda code
3. Redeploy Lambda
4. Assign users to group

**No code changes needed for adding users - just assign them to groups!**

---

## Advantages

✅ Centralized in IAM Identity Center
✅ No manual user list management
✅ Add users by assigning to groups
✅ Audit trail in IAM Identity Center
✅ Scales to thousands of users

---

## Troubleshooting

### User sees "No groups assigned"

**Solution**: Add user to at least one s3-browser-* group in IAM Identity Center

### User sees wrong buckets

**Solution**: Check group membership and GROUP_BUCKET_ACCESS mapping

### Lambda timeout

**Solution**: Increase Lambda timeout to 60 seconds (Identity Store API calls take time)

---

**This is enterprise-ready!**
