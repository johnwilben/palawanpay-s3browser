# IAM Identity Center Groups - Quick Reference

## Groups to Create

Create these groups in IAM Identity Center (Identity Store ID: d-96677c10e5):

### Admin Groups
```
AWS-s3-browser-admin
AWS Super Administrators (already exists)
AWS Administrators (already exists)
```
**Access:** Full access to all buckets in all accounts

---

### Datalake Groups
```
AWS-s3-browser-datalake-read
AWS-s3-browser-datalake-write
```

**AWS-s3-browser-datalake-read:**
- Read-only access to all buckets matching `datalake-*`

**AWS-s3-browser-datalake-write:**
- Full access (read + write + delete) to all buckets matching `datalake-*`

---

### Finance Groups
```
AWS-s3-browser-finance
AWS-s3-browser-finance-GL
```

**AWS-s3-browser-finance:**
- Read-only: `datalake-uat-ap-southeast-1-502174880086-output-common`
- Full access: `datalake-uat-ap-southeast-1-502174880086-athena`
- Full access: `datalake-uat-ap-southeast-1-502174880086-sandbox`
- Full access: `datalake-uat-ap-southeast-1-502174880086-staging-common`

**AWS-s3-browser-finance-GL:**
- Read-only: `datalake-uat-ap-southeast-1-502174880086-raw-megalink`
- Folder restriction: `megalink-wkf01/transaction-gl/` only

---

### Other Groups
```
AWS-s3-browser-archive-treasury
AWS-s3-browser-visa
```

**AWS-s3-browser-archive-treasury:**
- Full access: `operations-bucket-backup-sharepoint`

**AWS-s3-browser-visa:**
- Read-only: `visa-report-paymentology`

---

### PGC Groups
```
AWS-s3-browser-pgc-read
AWS-s3-browser-pgc-write
```

**AWS-s3-browser-pgc-read:**
- Read-only access to all buckets matching `pgcdatalake-*`

**AWS-s3-browser-pgc-write:**
- Full access (read + write + delete) to all buckets matching `pgcdatalake-*`

---

### PCIC Group
```
AWS-s3browser-PCIC
```

**AWS-s3browser-PCIC:**
- Full access (read + write + delete) to bucket `s3-sftpserver`

---

### Test Groups
```
AWS-s3-browser-test-confluent
```

**AWS-s3-browser-test-confluent:**
- Full access (read + write + delete) to all buckets matching `test-*`

---

## How to Create Groups

1. Go to **IAM Identity Center Console**
2. Click **Groups** in the left menu
3. Click **Create group**
4. Enter the group name exactly as shown above
5. Add description (optional)
6. Click **Create group**
7. Repeat for all groups

---

## How to Assign Users

1. Go to **IAM Identity Center** → **Groups**
2. Click on the group name
3. Click **Add users**
4. Select users to add
5. Click **Add users**

**Important:** Users must also be assigned to the "S3 Browser - Account 721010870103" application!

---

## How to Assign Application

1. Go to **IAM Identity Center** → **Applications**
2. Click **S3 Browser - Account 721010870103**
3. Click **Assign users**
4. Select users
5. Click **Assign users**

---

## Permission Matrix

| Group | Bucket Pattern | Permission | Notes |
|-------|---------------|------------|-------|
| AWS-s3-browser-admin | `*` | Write | All buckets |
| AWS Super Administrators | `*` | Write | All buckets |
| AWS Administrators | `*` | Write | All buckets |
| AWS-s3-browser-datalake-read | `datalake-*` | Read | All datalake buckets |
| AWS-s3-browser-datalake-write | `datalake-*` | Write | All datalake buckets |
| AWS-s3-browser-finance | Specific buckets | Mixed | See details above |
| AWS-s3-browser-finance-GL | `raw-megalink` | Read | Folder: `megalink-wkf01/transaction-gl/` |
| AWS-s3-browser-archive-treasury | `operations-bucket-backup-sharepoint` | Write | Single bucket |
| AWS-s3-browser-visa | `visa-report-paymentology` | Read | Single bucket |
| AWS-s3-browser-pgc-read | `pgcdatalake-*` | Read | All PGC buckets |
| AWS-s3-browser-pgc-write | `pgcdatalake-*` | Write | All PGC buckets |

**Permission Levels:**
- **Read** = View and download only
- **Write** = View, download, upload, and delete

---

## Multi-Group Membership

Users can be in multiple groups. They will see buckets from ALL their groups combined.

**Example:**
- User in `AWS-s3-browser-finance` + `AWS-s3-browser-visa`
- Will see: Finance buckets + Visa bucket

---

## Important Notes

1. **Group names must match exactly** (case-sensitive, including AWS- prefix)
2. **Users must log out and log back in** after group changes
3. **Token caching:** Group changes may take up to 1 hour to reflect (token expiry)
4. **Force refresh:** Delete Cognito user if immediate update needed
5. **Application assignment:** Users must be assigned to both groups AND application

---

## Troubleshooting

**User sees no buckets:**
- Check if user is in any groups
- Check if user is assigned to application
- Check CloudWatch logs for user's groups

**User sees wrong buckets:**
- Check user's group membership
- Delete Cognito user to force token refresh
- Wait for token to expire (1 hour)

**Group changes not reflecting:**
- User must log out and log back in
- Delete Cognito user: `aws cognito-idp admin-delete-user --user-pool-id ap-southeast-1_ieR5X01hf --username IAMIdentityCenter_<email>`
