# AWS-s3browser-PCIC Group Setup

## Group Details

**Group Name:** `AWS-s3browser-PCIC`

**Access Level:** Full access (Read + Write + Delete)

**Buckets:** `s3-sftpserver`

**Permissions:**
- ✅ View files and folders
- ✅ Download files
- ✅ Upload files
- ✅ Delete files
- ✅ Create folders
- ✅ Copy/Move files

---

## Setup Steps

### 1. Create Group in IAM Identity Center

1. Go to **IAM Identity Center Console**
2. Click **Groups** in the left menu
3. Click **Create group**
4. Enter group name: `AWS-s3browser-PCIC`
5. Description: `Full access to SFTP server bucket (s3-sftpserver)`
6. Click **Create group**

### 2. Add Users to Group

1. In IAM Identity Center, go to **Groups**
2. Click on `AWS-s3browser-PCIC`
3. Click **Add users**
4. Select PCIC users
5. Click **Add users**

### 3. Assign Group to S3 Browser Application

1. In IAM Identity Center, go to **Applications**
2. Click on **S3 Browser** application
3. Click **Assign users and groups**
4. Select `AWS-s3browser-PCIC` group
5. Click **Assign users and groups**

---

## Verification

### Test Access

1. Login as a PCIC user
2. Should see only `s3-sftpserver` bucket
3. Can view, download, upload, and delete files
4. Upload button should appear (full access)

### Expected Behavior

**Visible Buckets:**
- `s3-sftpserver` bucket only

**Available Actions:**
- Browse folders
- View file details
- Download files
- Upload files
- Delete files
- Create folders
- Copy/Move files

**Restricted Actions:**
- None (full access to s3-sftpserver bucket)

---

## Troubleshooting

### User can't see any buckets
- Check if user is added to `AWS-s3browser-PCIC` group
- Check if group is assigned to S3 Browser application
- Check if bucket name is exactly `s3-sftpserver`

### User sees upload button (should be read-only)
- Not applicable - PCIC has full access (read + write + delete)

### Bucket name doesn't match pattern
If the actual bucket name is different:
1. Update Lambda code in `backend/lambda/s3-operations.py`
2. Change pattern from `s3-sftpserver` to actual bucket name
3. Redeploy Lambda

---

## Deployment Status

✅ **Lambda Updated:** 2026-03-09 10:10 PHT
✅ **Code Committed:** commit `866ff8b`
✅ **Documentation Updated:** IAM-IDENTITY-CENTER-GROUPS.md

---

## Next Steps

1. ⏳ Create `AWS-s3browser-PCIC` group in IAM Identity Center
2. ⏳ Add PCIC users to the group
3. ⏳ Assign group to S3 Browser application
4. ⏳ Test with PCIC user account
5. ⏳ Verify bucket name is exactly `s3-sftpserver`

---

## Contact

For questions or issues:
- Check Lambda logs in CloudWatch
- Review audit logs in `palawanpay-s3browser-audit-logs` bucket
- Contact IT administrator
