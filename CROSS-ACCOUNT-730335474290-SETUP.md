# Cross-Account Setup for Account 730335474290

## Summary

✅ **Cross-account access configured for account 730335474290**

**Bucket:** `test-bucket-confluent-ppay`
**Account:** `730335474290`
**Group:** `AWS-s3-browser-test-confluent`
**Permission:** Read-only

---

## What Was Done

### 1. ✅ Updated Trust Policy in Account 730335474290

**Role:** `S3BrowserCrossAccountRole`

**Before:**
```json
{
  "Principal": {
    "AWS": "arn:aws:iam::821276124335:role/LambdaS3BrowserRole"
  }
}
```

**After:**
```json
{
  "Principal": {
    "AWS": "arn:aws:iam::721010870103:role/S3BrowserLambdaRole"
  }
}
```

**Why:** The role was trusting the wrong account. Updated to trust the correct Lambda role in account 721010870103.

---

### 2. ✅ Updated Lambda Role Permissions in Account 721010870103

**Role:** `S3BrowserLambdaRole`
**Policy:** `AssumeRolePolicy`

**Added:**
```json
"arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole"
```

**Full Resource List:**
- `arn:aws:iam::236300332446:role/S3BrowserCrossAccountRole`
- `arn:aws:iam::502174880086:role/S3BrowserCrossAccountRole`
- `arn:aws:iam::471112740803:role/S3BrowserCrossAccountRole`
- `arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole` ← **NEW**

---

### 3. ✅ Verified Bucket Access

**Bucket:** `test-bucket-confluent-ppay`
**Region:** `ap-southeast-1`
**Status:** ✅ Exists and accessible

**Contents:**
- `topics/` folder
- Sample files for testing

---

### 4. ✅ Verified Role Permissions

**Role in 730335474290:** `S3BrowserCrossAccountRole`
**Attached Policy:** `AmazonS3FullAccess`
**Status:** ✅ Has full S3 access (Lambda will restrict to read-only via code)

---

## Configuration Summary

### Lambda Configuration (Account 721010870103)
```python
'AWS-s3-browser-test-confluent': {
    'buckets': [
        {
            'pattern': 'test-bucket-confluent-ppay',
            'permission': 'read',  # Read-only
            'account': '730335474290'
        }
    ]
}
```

### Cross-Account Flow
1. User logs in with IAM Identity Center
2. User is member of `AWS-s3-browser-test-confluent` group
3. Lambda detects group membership
4. Lambda assumes `S3BrowserCrossAccountRole` in account 730335474290
5. Lambda lists/reads files from `test-bucket-confluent-ppay`
6. User sees bucket and can download files (read-only)

---

## Testing

### Expected Behavior

**User in `AWS-s3-browser-test-confluent` group:**
- ✅ Sees bucket `test-bucket-confluent-ppay`
- ✅ Can browse folders
- ✅ Can view file details
- ✅ Can download files
- ❌ Cannot upload files (no button)
- ❌ Cannot delete files (no button)
- ❌ Cannot create folders (no button)

---

## Verification Steps

### 1. Check Trust Relationship (Account 730335474290)
```bash
aws iam get-role \
  --role-name S3BrowserCrossAccountRole \
  --profile AWSAdministratorAccess-730335474290 \
  --query 'Role.AssumeRolePolicyDocument'
```

**Expected:** Should show `arn:aws:iam::721010870103:role/S3BrowserLambdaRole`

### 2. Check Lambda Permissions (Account 721010870103)
```bash
aws iam get-role-policy \
  --role-name S3BrowserLambdaRole \
  --policy-name AssumeRolePolicy \
  --profile minitempproject-prod \
  --query 'PolicyDocument.Statement[0].Resource'
```

**Expected:** Should include `arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole`

### 3. Test Bucket Access
```bash
aws s3 ls s3://test-bucket-confluent-ppay \
  --profile AWSAdministratorAccess-730335474290 \
  --region ap-southeast-1
```

**Expected:** Should list files and folders

---

## Troubleshooting

### User can't see the bucket
1. Check if user is in `AWS-s3-browser-test-confluent` group
2. Check if group is assigned to S3 Browser application
3. Check Lambda logs in CloudWatch for errors
4. Verify bucket name is exactly `test-bucket-confluent-ppay`

### Access Denied errors
1. Verify trust policy in account 730335474290
2. Verify Lambda role has assume role permission
3. Check CloudWatch logs for specific error messages

### Bucket shows but can't list files
1. Verify `S3BrowserCrossAccountRole` has S3 permissions
2. Check bucket policy doesn't deny access
3. Verify region is `ap-southeast-1`

---

## Next Steps

1. ⏳ Create `AWS-s3-browser-test-confluent` group in IAM Identity Center
2. ⏳ Add users to the group
3. ⏳ Assign group to S3 Browser application
4. ⏳ Test with a user account

---

## Deployment Status

✅ **Cross-account role configured:** 2026-03-09 15:55 PHT
✅ **Lambda role updated:** 2026-03-09 15:55 PHT
✅ **Lambda code deployed:** 2026-03-09 15:43 PHT
✅ **Trust policy fixed:** 2026-03-09 15:55 PHT

---

## Contact

For issues or questions:
- Check CloudWatch logs: `/aws/lambda/s3browser-operations`
- Check audit logs: `palawanpay-s3browser-audit-logs` bucket
- Contact IT administrator
