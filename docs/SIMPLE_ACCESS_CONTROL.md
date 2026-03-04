# Simple User-Based Bucket Access Control

## How It Works

Users only see buckets listed in `bucket-access-config.json`. Simple, no AWS configuration needed.

---

## Configuration File

Edit `backend/bucket-access-config.json`:

```json
{
  "users": {
    "user@example.com": {
      "allowedBuckets": ["test-*", "datalake-*"],
      "description": "Test and datalake access"
    }
  }
}
```

### Wildcard Patterns

- `*` - All buckets
- `test-*` - Buckets starting with "test-"
- `exact-bucket-name` - Exact match only

---

## Adding a New User

1. Edit `backend/bucket-access-config.json`
2. Add user entry:
```json
"john.doe@palawanpay.com": {
  "allowedBuckets": ["report-*"],
  "description": "Reports team"
}
```
3. Deploy Lambda
4. Done!

---

## Deployment

```bash
cd /Users/wilbensibayan/Downloads/S3Browser/backend/lambda

# Package with config file
zip -r function.zip s3-operations.py bucket-access-config.json

# Deploy
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile palawanpay
```

---

## Testing

1. Login as user
2. Should only see buckets matching their patterns
3. Try accessing non-allowed bucket → 403 error

---

## Advantages

✅ Simple - just edit JSON file
✅ No AWS configuration needed
✅ Works immediately
✅ Easy to understand
✅ Full control over who sees what

## Disadvantages

❌ Need to redeploy Lambda when adding users
❌ Manual management

---

## Example Configuration

```json
{
  "users": {
    "wilben.s@palawanpay.com": {
      "allowedBuckets": ["*"],
      "description": "Admin - all buckets"
    },
    "developer@palawanpay.com": {
      "allowedBuckets": ["test-*", "dev-*"],
      "description": "Development team"
    },
    "analyst@palawanpay.com": {
      "allowedBuckets": ["datalake-*", "report-*"],
      "description": "Data analysts"
    },
    "finance@palawanpay.com": {
      "allowedBuckets": ["finance-*", "accounting-*"],
      "description": "Finance team"
    }
  },
  "defaultPolicy": "deny"
}
```

---

**This is the simplest solution that gives you exactly what you want!**
