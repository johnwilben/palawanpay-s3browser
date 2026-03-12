# S3 Browser - Branch Strategy

## Branches

### `main`
- **Production deployment** on ECS
- Domain: `s3browser.palawanpay.com`
- Cognito redirect: `https://s3browser.palawanpay.com`
- Deployment: ECS Fargate + Internal ALB (VPN-only access)
- Image: `721010870103.dkr.ecr.ap-southeast-1.amazonaws.com/s3browser:arm64`

### `sandbox`
- **Sandbox/Testing deployment** on AWS Amplify
- Domain: Amplify auto-generated URL (e.g., `https://sandbox.xxxxx.amplifyapp.com`)
- Cognito redirect: Amplify URL
- Deployment: AWS Amplify (public internet)
- For testing and development

### `feature/cross-account-access`
- Feature branch for cross-account S3 access
- Merge to `main` when ready

---

## Cognito Configuration

### Production (main branch - ECS)
**Callback URLs:**
```
https://s3browser.palawanpay.com
https://s3browser.palawanpay.com/
```

**Logout URLs:**
```
https://s3browser.palawanpay.com
https://s3browser.palawanpay.com/
```

### Sandbox (sandbox branch - Amplify)
**Callback URLs:**
```
https://sandbox.xxxxx.amplifyapp.com
https://sandbox.xxxxx.amplifyapp.com/
```

**Logout URLs:**
```
https://sandbox.xxxxx.amplifyapp.com
https://sandbox.xxxxx.amplifyapp.com/
```

**Note:** Update Cognito User Pool to include BOTH production and sandbox URLs.

---

## Deployment Workflow

### Sandbox (Amplify)
1. Make changes in `sandbox` branch
2. Push to GitHub
3. Amplify auto-deploys
4. Test with Amplify URL

### Production (ECS)
1. Merge changes to `main` branch
2. Build Docker image: `./build-and-push.sh`
3. Update ECS service to use new image
4. ECS auto-deploys

---

## Environment Variables

### Sandbox (Amplify)
Set in Amplify Console → App Settings → Environment Variables:
```
REACT_APP_API_URL=<API Gateway URL>
REACT_APP_COGNITO_DOMAIN=<Cognito Domain>
REACT_APP_COGNITO_CLIENT_ID=<Client ID>
REACT_APP_COGNITO_REDIRECT_URI=<Amplify URL>
```

### Production (ECS)
Built into Docker image at build time. Update `src/config.js` before building.

---

## Current Status

- ✅ `sandbox` branch created
- ✅ ECR repository created with ARM64 image
- ⏳ Amplify app for sandbox (to be configured)
- ⏳ ECS deployment for production (to be configured)

---

## Next Steps

1. **Configure Amplify for sandbox branch:**
   - Connect GitHub repo
   - Set branch to `sandbox`
   - Add environment variables
   - Deploy

2. **Update Cognito User Pool:**
   - Add sandbox Amplify URL to callback/logout URLs
   - Keep production URL

3. **Deploy to ECS (production):**
   - Create Terraform for ECS + ALB
   - Deploy from `main` branch
