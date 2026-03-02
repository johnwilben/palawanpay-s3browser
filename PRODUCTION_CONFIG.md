# Production Deployment Configuration

## IMPORTANT: Update Before Production Deployment

This application is currently configured for sandbox account **821276124335**. Before deploying to production, you MUST update the following:

---

## 1. Lambda Function - Account ID

**File**: `backend/lambda/s3-operations.py`

```python
# Update line 11
CROSS_ACCOUNT_ROLES = [
    {'account': 'YOUR_PRODUCTION_ACCOUNT_ID', 'role': None},  # Primary hosting account
    {'account': '730335474290', 'role': 'arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole'},
    {'account': '684538810129', 'role': 'arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole'}
]
```

---

## 2. Cross-Account Trust Relationships

Update trust policies in accounts **730335474290** and **684538810129**:

**Role**: `S3BrowserCrossAccountRole`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_PRODUCTION_ACCOUNT_ID:role/LambdaS3BrowserRole"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

---

## 3. Documentation Updates

Update account references in:
- `README.md` - Line 93, 216
- `docs/DEPLOYMENT.md` - Line 5, 74, 100, 129, 300
- `docs/ARCHITECTURE.md` - Line 80, 194
- `docs/PRODUCTION_CHECKLIST.md` - Line 33, 98, 134, 415
- `docs/TEST_CASES.md` - Line 37, 357
- `docs/USER-MANUAL.md` - Line 112
- `scripts/apply-cors-all-buckets.sh` - Line 4

**Find and Replace**:
```bash
# Run from project root
find . -type f \( -name "*.md" -o -name "*.sh" \) -exec sed -i '' 's/821276124335/YOUR_PRODUCTION_ACCOUNT_ID/g' {} +
```

---

## 4. AWS CLI Profile

Update AWS CLI commands to use production profile:

```bash
# Replace all instances of
--profile palawanpay

# With your production profile
--profile production
```

---

## 5. IAM Policy Updates

**File**: `backend/iam-policy.json`

Update cross-account role ARNs if needed:

```json
{
  "Effect": "Allow",
  "Action": "sts:AssumeRole",
  "Resource": [
    "arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole",
    "arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole"
  ]
}
```

---

## 6. Cognito Configuration

Update Cognito User Pool domain and callback URLs:

**Current (Sandbox)**:
- Domain: `palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com`
- Callback: `https://feature-cross-account-access.drm7arslkowgf.amplifyapp.com`

**Production**:
- Domain: `palawanpay-s3browser-prod.auth.ap-southeast-1.amazoncognito.com`
- Callback: `https://YOUR_PRODUCTION_DOMAIN`

Update in `src/aws-exports.js`

---

## 7. Amplify Environment Variables

Set in Amplify Console:

```
REACT_APP_AWS_ACCOUNT_ID=YOUR_PRODUCTION_ACCOUNT_ID
REACT_APP_ENV=production
```

---

## Quick Setup Script

```bash
#!/bin/bash
# setup-production.sh

# Set your production account ID
PROD_ACCOUNT_ID="YOUR_PRODUCTION_ACCOUNT_ID"
SANDBOX_ACCOUNT_ID="821276124335"

echo "Updating account ID from $SANDBOX_ACCOUNT_ID to $PROD_ACCOUNT_ID..."

# Update Lambda function
sed -i '' "s/$SANDBOX_ACCOUNT_ID/$PROD_ACCOUNT_ID/g" backend/lambda/s3-operations.py

# Update documentation
find docs -type f -name "*.md" -exec sed -i '' "s/$SANDBOX_ACCOUNT_ID/$PROD_ACCOUNT_ID/g" {} +

# Update README
sed -i '' "s/$SANDBOX_ACCOUNT_ID/$PROD_ACCOUNT_ID/g" README.md

# Update scripts
find scripts -type f -name "*.sh" -exec sed -i '' "s/$SANDBOX_ACCOUNT_ID/$PROD_ACCOUNT_ID/g" {} +

echo "Done! Review changes with: git diff"
echo "Remember to update cross-account trust relationships manually!"
```

---

## Verification Checklist

After updating account IDs:

- [ ] Lambda function has correct account ID
- [ ] Cross-account trust relationships updated
- [ ] Documentation reflects production account
- [ ] Cognito configured for production domain
- [ ] Amplify environment variables set
- [ ] IAM policies reference correct accounts
- [ ] Test deployment in production account
- [ ] Verify cross-account access works

---

## Rollback

If issues occur, revert to sandbox configuration:

```bash
git checkout backend/lambda/s3-operations.py
git checkout docs/
git checkout README.md
```

---

## Support

For questions about production deployment:
- Review: `docs/PRODUCTION_CHECKLIST.md`
- Security: `docs/SECURITY_CHECKLIST.md`
- Testing: `docs/TEST_CASES.md`
