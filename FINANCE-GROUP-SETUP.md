# Finance Groups Setup Guide

**Date:** April 6, 2026

---

## Step 1: Create Groups in IAM Identity Center

1. Go to **AWS Console** → **IAM Identity Center**
2. Click **Groups** in the left menu

### Create Group 1: `AWS-s3-browser-finance`

1. Click **Create group**
2. Group name: `AWS-s3-browser-finance`
3. Description: `Finance team - Write access to sandbox, staging-common, and sharepoint backup`
4. Click **Create group**

### Create Group 2: `AWS-s3-browser-finance-leads`

1. Click **Create group**
2. Group name: `AWS-s3-browser-finance-leads`
3. Description: `Finance leads - Read access to output-common and visa-report`
4. Click **Create group**

---

## Step 2: Add Users to Groups

### Group: `AWS-s3-browser-finance` (All 19 users)

1. Click on **AWS-s3-browser-finance**
2. Click **Add users**
3. Search and select ALL 19 users:

| # | Name |
|---|------|
| 1 | Michael Jallorina |
| 2 | Maureen Abuan |
| 3 | Fhualyn Valdestamon |
| 4 | Alfred Miraflores |
| 5 | Ruth Magbanua |
| 6 | Marc Dennis Dy |
| 7 | Raquelyn Constantino |
| 8 | Iris Losito |
| 9 | Dorothy Aperocho |
| 10 | Nikki Italia |
| 11 | Arthur Salvador |
| 12 | Ellen Tamundes |
| 13 | Noreen Binag |
| 14 | Jhomar Bolalin |
| 15 | Paolo Reyes |
| 16 | Joy Gloria |
| 17 | Lyka Valdez |
| 18 | Dandy Palma |
| 19 | Noriebeth Padin |

4. Click **Add users**

### Group: `AWS-s3-browser-finance-leads` (7 users only)

1. Click on **AWS-s3-browser-finance-leads**
2. Click **Add users**
3. Search and select these 7 users ONLY:

| # | Name |
|---|------|
| 1 | Michael Jallorina |
| 2 | Maureen Abuan |
| 3 | Fhualyn Valdestamon |
| 4 | Alfred Miraflores |
| 5 | Ruth Magbanua |
| 6 | Marc Dennis Dy |
| 7 | Paolo Reyes |

4. Click **Add users**

---

## Step 3: Assign Users to S3 Browser Application

Each user must also be assigned to the S3 Browser application.

1. Go to **IAM Identity Center** → **Applications**
2. Click on **S3 Browser** application
3. Click **Assign users and groups**
4. Select **AWS-s3-browser-finance** group
5. Select **AWS-s3-browser-finance-leads** group
6. Click **Assign users and groups**

> **Note:** If users are already assigned individually, this step may already be done.

---

## Step 4: Deploy Lambda (Wilben)

> This step requires AWS CLI access. Wilben will handle this.

```bash
cd /Users/wilbensibayan/Downloads/S3Browser/backend/lambda
zip -r function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1
```

---

## Step 5: Verify Access

### Test with a Finance Lead (e.g., Michael Jallorina)

1. Login to S3 Browser
2. Should see **5 buckets**:
   - ✅ datalake-uat-...-sandbox (Read + Write)
   - ✅ datalake-uat-...-staging-common (Read + Write)
   - ✅ finance-palawanpay-sharepoint-backup (Read + Write)
   - ✅ datalake-uat-...-output-common (Read only)
   - ✅ visa-report-paymentology (Read only)
3. Verify upload works on sandbox ✅
4. Verify upload is blocked on output-common ❌ (read only)

### Test with a Regular Finance User (e.g., Joy Gloria)

1. Login to S3 Browser
2. Should see **3 buckets**:
   - ✅ datalake-uat-...-sandbox (Read + Write)
   - ✅ datalake-uat-...-staging-common (Read + Write)
   - ✅ finance-palawanpay-sharepoint-backup (Read + Write)
3. Should NOT see:
   - ❌ datalake-uat-...-output-common
   - ❌ visa-report-paymentology

---

## Troubleshooting

### User sees no buckets
- Check if user is added to the correct group
- Check if group is assigned to S3 Browser application
- User must **log out and log back in** after group changes

### Group changes not reflecting
- Token caches for up to **1 hour**
- User must log out and log back in
- If still not working, delete Cognito user to force refresh:
  ```
  aws cognito-idp admin-delete-user \
    --user-pool-id ap-southeast-1_ieR5X01hf \
    --username IAMIdentityCenter_<user-email>
  ```
  User will be recreated on next login.

### User sees wrong buckets
- Verify group membership in IAM Identity Center
- Check if user is in the correct group(s)
- Wait for token to expire or force refresh

---

## Access Summary

| Bucket | finance (19) | finance-leads (7) |
|--------|:-----------:|:-----------------:|
| datalake-uat-...-sandbox | ✅ Write | - |
| datalake-uat-...-staging-common | ✅ Write | - |
| finance-palawanpay-sharepoint-backup | ✅ Write | - |
| datalake-uat-...-output-common | - | ✅ Read |
| visa-report-paymentology | - | ✅ Read |
