# S3 Browser Admin - Configuration Guide

## Overview

Groups, bucket access, and cross-account roles are managed via a JSON config file stored in S3. Changes take effect within 5 minutes (no code deploy needed).

**Config location:** `s3://palawanpay-s3browser-config/groups.json`

---

## How to Edit Config

### Option 1: AWS Console
1. Go to **S3 Console** → `palawanpay-s3browser-config` bucket
2. Download `groups.json`
3. Edit in any text editor
4. Upload back (overwrite)
5. Changes apply within 5 minutes

### Option 2: AWS CLI
```bash
# Download
aws s3 cp s3://palawanpay-s3browser-config/groups.json .

# Edit...

# Upload
aws s3 cp groups.json s3://palawanpay-s3browser-config/groups.json
```

### Option 3: Admin API
```bash
# Get current config
curl -H "Authorization: Bearer <token>" \
  https://9th34ei7t8.execute-api.ap-southeast-1.amazonaws.com/prod/admin/config

# Save config
curl -X PUT -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @groups.json \
  https://9th34ei7t8.execute-api.ap-southeast-1.amazonaws.com/prod/admin/config
```

---

## Config Structure

```json
{
  "cross_account_roles": [...],
  "groups": {...},
  "admin_groups": [...]
}
```

---

## Adding a New Group

Add an entry under `"groups"`:

```json
"MY-NEW-GROUP": {
  "description": "Description of what this group accesses",
  "buckets": [
    {
      "pattern": "my-bucket-name",
      "permission": "read"
    }
  ]
}
```

### Fields:

| Field | Required | Description |
|-------|----------|-------------|
| `description` | No | Human-readable description |
| `buckets` | Yes | Array of bucket access rules |
| `buckets[].pattern` | Yes | Bucket name or pattern (`*` = all, `prefix-*` = wildcard) |
| `buckets[].permission` | Yes | `read` (view/download) or `write` (full access) |
| `buckets[].account` | No | Account ID if bucket is cross-account |
| `buckets[].prefix` | No | Restrict to specific folder path |

### Permission Levels:

| Permission | Can View | Can Download | Can Upload | Can Delete |
|-----------|----------|-------------|-----------|-----------|
| `read` | ✅ | ✅ | ❌ | ❌ |
| `write` | ✅ | ✅ | ✅ | ✅ |

---

## Adding a New Cross-Account

Add an entry under `"cross_account_roles"`:

```json
{
  "account": "123456789012",
  "role": "arn:aws:iam::123456789012:role/S3BrowserCrossAccountRole",
  "name": "Friendly Name"
}
```

**Also required in the target account:**
1. Create `S3BrowserCrossAccountRole` (use CloudFormation template in `cloudformation/magento-cross-account-role.yaml`)
2. Role must trust `arn:aws:iam::721010870103:role/S3BrowserLambdaRole`
3. Role must have `s3:ListAllMyBuckets` + access to specific buckets

---

## Examples

### Read-only access to a specific bucket
```json
"AWS-s3-browser-reports": {
  "description": "Read-only access to reports bucket",
  "buckets": [
    {"pattern": "company-reports-bucket", "permission": "read"}
  ]
}
```

### Write access to multiple buckets
```json
"AWS-s3-browser-devteam": {
  "description": "Dev team - full access to dev buckets",
  "buckets": [
    {"pattern": "dev-uploads", "permission": "write"},
    {"pattern": "dev-artifacts", "permission": "write"}
  ]
}
```

### Wildcard pattern
```json
"AWS-s3-browser-datalake": {
  "description": "All datalake buckets",
  "buckets": [
    {"pattern": "datalake-*", "permission": "read"}
  ]
}
```

### Cross-account bucket
```json
"AWS-s3-browser-partner": {
  "description": "Partner bucket in another account",
  "buckets": [
    {"pattern": "partner-data-bucket", "permission": "read", "account": "999888777666"}
  ]
}
```

### Folder-restricted access
```json
"AWS-s3-browser-finance-gl": {
  "description": "Only transaction-gl folder",
  "buckets": [
    {"pattern": "raw-data-bucket", "permission": "read", "prefix": "finance/transaction-gl/"}
  ]
}
```

---

## Important Notes

1. **Group names must match exactly** with IAM Identity Center group names (case-sensitive)
2. **Changes take up to 5 minutes** to apply (Lambda caches config)
3. **Force immediate refresh:** Redeploy Lambda (no code change needed, just re-deploy same zip)
4. **Admin access:** Only users in `admin_groups` can use the `/admin/config` API
5. **Audit:** All config changes via API are logged to `palawanpay-s3browser-audit-logs`
6. **Backup:** Enable S3 versioning on `palawanpay-s3browser-config` to keep history

---

## Checklist: Adding a New Group + Bucket

- [ ] Add group to `groups.json` config
- [ ] Upload config to S3
- [ ] Create group in IAM Identity Center (Entra)
- [ ] Add users to the group
- [ ] Assign group to S3 Browser application
- [ ] If cross-account: add account to `cross_account_roles` in config
- [ ] If cross-account: create `S3BrowserCrossAccountRole` in target account
- [ ] If cross-account: add account to Lambda role's `sts:AssumeRole` policy
- [ ] Test: user logs out and back in
- [ ] Verify bucket appears in S3 Browser

---

## Troubleshooting

### Bucket not showing
- Check config has the correct group name (case-sensitive)
- Check user is in the group in IAM Identity Center
- User must log out and log back in
- Wait 5 minutes for config cache to refresh

### Cross-account bucket not showing
- Verify `S3BrowserCrossAccountRole` exists in target account
- Verify role trusts `arn:aws:iam::721010870103:role/S3BrowserLambdaRole`
- Verify role has `s3:ListAllMyBuckets` permission
- Check Lambda role has `sts:AssumeRole` for the target account

### Config not loading
- Check `palawanpay-s3browser-config` bucket exists
- Check `groups.json` file exists and is valid JSON
- Check Lambda has S3 read access to the config bucket
