# Separate Cognito Setup for Account 721010870103

## ✅ Created Resources

### Cognito User Pool
- **Pool ID:** `ap-southeast-1_ieR5X01hf`
- **Pool Name:** `s3browser-userpool-721010870103`
- **Domain:** `s3browser-721010870103.auth.ap-southeast-1.amazoncognito.com`
- **Client ID:** `504f5m01uepjpq2d0v4i8ceh15`
- **Client Name:** `s3browser-client`

### Updated Resources
- ✅ API Gateway Authorizer updated to use new Cognito pool
- ✅ Amplify environment variables updated
- ✅ Frontend aws-exports created (`src/aws-exports-721010870103.js`)

---

## 🔴 Manual Steps Required

### Step 1: Configure IAM Identity Center SAML Application

1. Go to **IAM Identity Center Console**
2. Navigate to **Applications** → **Add application**
3. Select **Custom SAML 2.0 application**
4. Fill in:
   - **Display name:** `S3 Browser - Account 721010870103`
   - **Description:** `S3 Browser for account 721010870103`
5. Click **Next**
6. **Download** the IAM Identity Center SAML metadata file
7. Configure application metadata:
   - **Application ACS URL:** `https://s3browser-721010870103.auth.ap-southeast-1.amazoncognito.com/saml2/idpresponse`
   - **Application SAML audience:** `urn:amazon:cognito:sp:ap-southeast-1_ieR5X01hf`
8. Click **Submit**

### Step 2: Add SAML Provider to Cognito

After downloading the metadata file, run:

```bash
aws cognito-idp create-identity-provider \
  --user-pool-id ap-southeast-1_ieR5X01hf \
  --provider-name IAMIdentityCenter \
  --provider-type SAML \
  --provider-details file://metadata.xml \
  --attribute-mapping email=http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

### Step 3: Update User Pool Client

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id ap-southeast-1_ieR5X01hf \
  --client-id 504f5m01uepjpq2d0v4i8ceh15 \
  --supported-identity-providers IAMIdentityCenter \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

### Step 4: Configure Attribute Mapping

1. Go to **Cognito User Pool** → `s3browser-userpool-721010870103`
2. Navigate to **Sign-in experience** → **Attribute mapping**
3. Select **IAMIdentityCenter** provider
4. Map attributes:
   - SAML: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` → Cognito: `email`
   - SAML: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` → Cognito: `name`
5. Click **Save changes**

### Step 5: Update Frontend Configuration

Replace `src/aws-exports.js` with the new configuration:

```bash
cd /Users/wilbensibayan/Downloads/S3Browser
cp src/aws-exports-721010870103.js src/aws-exports.js
git add src/aws-exports.js
git commit -m "Update aws-exports for account 721010870103 Cognito"
git push origin feature/cross-account-access
```

### Step 6: Trigger Amplify Build

```bash
aws amplify start-job \
  --app-id d32el4qcx14shm \
  --branch-name feature/cross-account-access \
  --job-type RELEASE \
  --region ap-southeast-1 \
  --profile minitempproject-prod
```

### Step 7: Create IAM Identity Center Groups

In IAM Identity Center, create these groups:
- `s3-browser-admin`
- `s3-browser-datalake-read`
- `s3-browser-datalake-write`
- `s3-browser-finance`
- `s3-browser-finance-GL`
- `s3-browser-archive-treasury`
- `s3-browser-visa`
- `s3-browser-pgc-read`
- `s3-browser-pgc-write`

### Step 8: Assign Users to Groups

1. Go to **IAM Identity Center** → **Users**
2. Select a user
3. Click **Groups** tab → **Add user to groups**
4. Select appropriate groups

---

## 🎯 What Changed

### Before (Shared Cognito)
- Account 821276124335: Cognito User Pool ✅
- Account 721010870103: Uses shared Cognito ❌

### After (Separate Cognito)
- Account 821276124335: Cognito User Pool ✅ (unchanged)
- Account 721010870103: **Own Cognito User Pool** ✅

### Benefits
- ✅ Independent user management per account
- ✅ Separate group configurations
- ✅ Account isolation
- ✅ Can have different users per account

### Trade-offs
- ⚠️ Users need separate logins for each account
- ⚠️ Groups must be created in both accounts
- ⚠️ More maintenance overhead

---

## 📝 Configuration Summary

| Resource | Account 821276124335 | Account 721010870103 |
|----------|---------------------|---------------------|
| Cognito Pool ID | ap-southeast-1_YdUsCa38i | ap-southeast-1_ieR5X01hf |
| Client ID | 19lg9i63etaa6322ml0jv0clqu | 504f5m01uepjpq2d0v4i8ceh15 |
| Domain | palawanpay-s3browser | s3browser-721010870103 |
| Amplify URL | drm7arslkowgf.amplifyapp.com | d32el4qcx14shm.amplifyapp.com |
| API Gateway | c9bc3h6l94 | 9th34ei7t8 |
| Lambda | s3browser-operations | s3browser-operations |

---

## ✅ Checklist

- [x] Create Cognito User Pool
- [x] Create User Pool Domain
- [x] Create User Pool Client
- [x] Update API Gateway Authorizer
- [x] Update Amplify environment variables
- [x] Create frontend aws-exports
- [ ] Configure IAM Identity Center SAML app (manual)
- [ ] Add SAML provider to Cognito (manual)
- [ ] Update User Pool Client with SAML (manual)
- [ ] Configure attribute mapping (manual)
- [ ] Update frontend aws-exports.js (manual)
- [ ] Trigger Amplify build (manual)
- [ ] Create IAM Identity Center groups (manual)
- [ ] Assign users to groups (manual)
- [ ] Test login and bucket access (manual)

---

**Next:** Complete the manual steps above to finish the setup!
