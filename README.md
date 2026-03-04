# PalawanPay S3 Browser

A secure web application for managing S3 buckets across multiple AWS accounts with IAM Identity Center (SSO) authentication via Entra ID.

![PalawanPay Logo](public/PalawanPay%20logo%20-%20Yellow%20-%20horizontal%20stack.png)

## 🌟 Features

- **Custom Login Experience**: Beautiful full-screen green login page with PalawanPay branding
- **IAM Identity Center Authentication**: Secure single sign-on via Entra ID SSO
- **Cross-Account Access**: View and manage S3 buckets across multiple AWS accounts simultaneously
- **Permission Detection**: Automatically detects read/write permissions for each bucket
- **High Performance**: Parallel processing and intelligent caching for 3-second load times
- **File Management**: Upload and download files with permission-based access control
- **PalawanPay Branding**: Custom UI with company colors (green) and logo
- **Real-time Updates**: Live bucket and file listing with 60-second cache
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
- [Configuration](#configuration)
- [Cross-Account Setup](#cross-account-setup)
- [Deployment](#deployment)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Maintenance](#maintenance)

## 🏗️ Architecture

### Components

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   AWS Amplify (Frontend Hosting)        │
│   - React SPA                            │
│   - CloudFront Distribution              │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Amazon Cognito                         │
│   - User Pool: ap-southeast-1_YdUsCa38i │
│   - Identity Pool                        │
│   - IAM Identity Center Federation       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   IAM Identity Center                    │
│   - Entra ID Integration                 │
│   - SAML 2.0 Provider                    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   API Gateway + Lambda                   │
│   - Function: s3browser-operations       │
│   - Cross-account role assumption        │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Amazon S3 (Multiple Accounts)          │
│   - Account 821276124335 (Primary)       │
│   - Account 730335474290                 │
│   - Account 684538810129                 │
└─────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18, React Router, AWS Amplify UI (customized)
- **Backend**: AWS Lambda (Python 3.11) with ThreadPoolExecutor for parallel processing
- **API**: API Gateway HTTP API
- **Authentication**: Amazon Cognito + IAM Identity Center + Entra ID
- **Hosting**: AWS Amplify with CloudFront
- **Storage**: Amazon S3
- **Region**: ap-southeast-1 (Singapore)
- **Performance**: Parallel processing, 60-second caching, 512 MB Lambda

## ✅ Prerequisites

### AWS Resources
- AWS Account: **821276124335** (primary hosting account)
- IAM Identity Center configured with Entra ID
- AWS CLI configured with appropriate credentials
- Node.js 18+ and npm

### Azure Resources
- Entra ID (Azure AD) tenant
- Application registration for IAM Identity Center

### Required Permissions
- Administrator access to AWS accounts
- Ability to create IAM roles and policies
- Access to IAM Identity Center administration
- Entra ID application registration permissions

## 🚀 Setup Guide

### 1. Clone Repository

```bash
git clone https://github.com/johnwilben/palawanpay-s3browser.git
cd palawanpay-s3browser
```

### 2. Install Dependencies

```bash
npm install
```

### 3. AWS Resources Setup

#### A. Cognito User Pool

Already created:
- **User Pool ID**: `ap-southeast-1_YdUsCa38i`
- **Client ID**: `19lg9i63etaa6322ml0jv0clqu`
- **Domain**: `palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com`

#### B. IAM Identity Center Application

1. Go to IAM Identity Center Console
2. Navigate to **Applications** → **Add application**
3. Select **Custom SAML 2.0 application**
4. Configure:
   - **Name**: PalawanPay S3 Browser
   - **Application ACS URL**: `https://palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com/saml2/idpresponse`
   - **Application SAML audience**: `urn:amazon:cognito:sp:ap-southeast-1_YdUsCa38i`

5. **Attribute mappings**:
   - Subject: `${user:email}` (format: emailAddress)
   - email: `${user:email}` (format: unspecified)
   - name: `${user:name}` (format: unspecified)

6. **Assign users/groups** to the application

7. Copy the **IAM Identity Center SAML metadata URL**

#### C. Lambda Function

Already deployed:
- **Function Name**: `s3browser-operations`
- **Runtime**: Python 3.11
- **Role**: `LambdaS3BrowserRole`
- **Timeout**: 30 seconds
- **Memory**: 128 MB

**Permissions**:
- AmazonS3FullAccess
- CloudWatchLogsFullAccess
- S3BrowserCrossAccountAssumeRole (custom policy)

#### D. API Gateway

Already created:
- **API ID**: `c9bc3h6l94`
- **Endpoint**: `https://c9bc3h6l94.execute-api.ap-southeast-1.amazonaws.com/prod`
- **Type**: HTTP API
- **CORS**: Enabled for all origins

### 4. Configuration Files

#### `src/aws-exports.js`

```javascript
const config = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_YdUsCa38i',
      userPoolClientId: '19lg9i63etaa6322ml0jv0clqu',
      identityPoolId: 'ap-southeast-1:6728d3e2-e8bc-416b-9d9d-c8d7a1028881',
      loginWith: {
        oauth: {
          domain: 'palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: ['https://main.drm7arslkowgf.amplifyapp.com/', 'http://localhost:3000/'],
          redirectSignOut: ['https://main.drm7arslkowgf.amplifyapp.com/', 'http://localhost:3000/'],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    REST: {
      S3BrowserAPI: {
        endpoint: 'https://c9bc3h6l94.execute-api.ap-southeast-1.amazonaws.com/prod',
        region: 'ap-southeast-1'
      }
    }
  }
};

export default config;
```

## 🔐 Cross-Account Setup

### Overview

The application supports accessing S3 buckets across multiple AWS accounts using cross-account IAM roles.

### Current Configuration

- **Primary Account**: 821276124335
- **Cross-Account 1**: 730335474290
- **Cross-Account 2**: 684538810129

### Adding New Accounts

#### Step 1: Create Cross-Account Role

In the **target account**, create an IAM role:

```bash
# Create trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::821276124335:role/LambdaS3BrowserRole"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name S3BrowserCrossAccountRole \
  --assume-role-policy-document file://trust-policy.json

# Attach S3 permissions
aws iam attach-role-policy \
  --role-name S3BrowserCrossAccountRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

#### Step 2: Update Lambda Configuration

Edit `backend/lambda/s3-operations.py`:

```python
CROSS_ACCOUNT_ROLES = [
    {'account': '821276124335', 'role': None},
    {'account': '730335474290', 'role': 'arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole'},
    {'account': '684538810129', 'role': 'arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole'},
    {'account': 'NEW_ACCOUNT_ID', 'role': 'arn:aws:iam::NEW_ACCOUNT_ID:role/S3BrowserCrossAccountRole'}
]
```

#### Step 3: Update Assume Role Policy

In the **primary account (821276124335)**:

```bash
# Update the S3BrowserCrossAccountAssumeRole policy
aws iam create-policy-version \
  --policy-arn arn:aws:iam::821276124335:policy/S3BrowserCrossAccountAssumeRole \
  --policy-document file://updated-policy.json \
  --set-as-default
```

#### Step 4: Deploy Lambda

```bash
cd backend/lambda
zip function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1
```

## 📦 Deployment

### Local Development

```bash
npm start
```

Access at: `http://localhost:3000`

### Production Deployment

#### Via Amplify Console

1. Go to [Amplify Console](https://ap-southeast-1.console.aws.amazon.com/amplify/home?region=ap-southeast-1)
2. Select **s3browser** app
3. Amplify auto-deploys on push to `main` branch

#### Manual Deployment

```bash
# Build
npm run build

# Deploy via Amplify CLI (if configured)
amplify publish
```

### Branch Deployments

- **Main**: `https://main.drm7arslkowgf.amplifyapp.com`
- **Feature branches**: Auto-deployed when enabled

### Updating Callback URLs

When adding new deployment URLs:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id ap-southeast-1_YdUsCa38i \
  --client-id 19lg9i63etaa6322ml0jv0clqu \
  --callback-urls "https://new-url.amplifyapp.com/" "https://main.drm7arslkowgf.amplifyapp.com/" \
  --logout-urls "https://new-url.amplifyapp.com/" "https://main.drm7arslkowgf.amplifyapp.com/" \
  --region ap-southeast-1
```

## 🎨 User Interface

### Login Page

- **Full-screen green gradient background** matching PalawanPay brand colors
- **Centered white card** containing PalawanPay logo
- **Large, clear typography** for title and subtitle
- **Single "Sign In" button** - no username/password fields
- **Responsive design** - adapts to all screen sizes
- **Smooth animations** - fade-in effects and hover states

### Main Application

- **Green header bar** with PalawanPay logo and user greeting
- **Grid layout** for bucket cards
- **Permission badges** showing Read/Write access
- **Account ID display** for each bucket
- **Loading spinner** with progress message
- **Responsive bucket cards** that adapt to screen size

### Logging In

1. Navigate to `https://main.drm7arslkowgf.amplifyapp.com`
2. You'll see a beautiful full-screen green login page with:
   - PalawanPay logo in a white box
   - "S3 Browser" title
   - "Secure access to your S3 buckets across multiple accounts" subtitle
   - Large white "Sign In" button
   - "Happy Palawan Day!" message
3. Click **"Sign In"** button
4. Automatically redirects to IAM Identity Center
5. Authenticate via Entra ID with your PalawanPay credentials
6. Redirected back to bucket list

**Note**: No username/password or sign-up forms - only SSO authentication via IAM Identity Center.

### Viewing Buckets

- All accessible buckets from all configured accounts are displayed
- Each bucket shows:
  - Bucket name
  - Account ID
  - Permission badges (Read/Write)

### Managing Files

#### Viewing Files
1. Click on a bucket card
2. View all files in the bucket

#### Uploading Files
1. Navigate to a bucket with **Write** permission
2. Click **"Upload File"**
3. Select file from your computer
4. File uploads to S3

#### Downloading Files
1. Navigate to any bucket with **Read** permission
2. Click **"Download"** next to the file
3. File downloads to your computer

### Permissions

- **Read**: Can view and download files
- **Write**: Can upload files (includes read access)
- **No badge**: No access to bucket

## 🔧 Troubleshooting

### Login Issues

**Problem**: Redirect loop after login

**Solution**:
1. Check Cognito callback URLs include your domain
2. Verify IAM Identity Center application is assigned to your user
3. Clear browser cookies and try again

### Buckets Not Showing

**Problem**: Cross-account buckets not appearing

**Solution**:
1. Check Lambda logs: `aws logs tail /aws/lambda/s3browser-operations --follow`
2. Verify cross-account role exists in target account
3. Confirm Lambda role has `sts:AssumeRole` permission
4. Check trust relationship in cross-account role

### Upload/Download Failures

**Problem**: 403 Forbidden errors

**Solution**:
1. Verify bucket permissions
2. Check S3 bucket policies
3. Confirm Lambda role has S3 permissions
4. Review CloudWatch logs for detailed errors

### CORS Errors

**Problem**: API requests blocked by CORS

**Solution**:
1. Verify API Gateway CORS configuration
2. Check Lambda response headers include CORS headers
3. Ensure OPTIONS requests return 200

## 🔒 Security

### Authentication Flow

1. User clicks "Sign in with IAM Identity Center"
2. Redirected to Cognito Hosted UI
3. Cognito redirects to IAM Identity Center
4. IAM Identity Center authenticates via Entra ID
5. SAML assertion returned to Cognito
6. Cognito issues JWT tokens
7. User authenticated in application

### Authorization

- **Frontend**: JWT tokens validate user identity
- **Backend**: Lambda assumes roles based on configuration
- **S3 Access**: Controlled by IAM policies and bucket policies

### Best Practices

1. **Least Privilege**: Cross-account roles have only S3 permissions
2. **Temporary Credentials**: All cross-account access uses temporary STS credentials
3. **Audit Logging**: CloudTrail logs all API calls
4. **Session Management**: Cognito handles token refresh automatically
5. **No Credential Storage**: No AWS credentials stored in frontend

### Compliance

- **CloudWatch Logs**: All Lambda executions logged
- **CloudTrail**: All AWS API calls tracked
- **Cognito Logs**: Authentication events recorded
- **S3 Access Logs**: Can be enabled per bucket

## 🛠️ Maintenance

### Monitoring

#### CloudWatch Dashboards

Monitor:
- Lambda invocations and errors
- API Gateway requests and latency
- Cognito authentication metrics

#### Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/s3browser-operations --follow

# API Gateway logs (if enabled)
aws logs tail /aws/apigateway/c9bc3h6l94 --follow
```

### Updating Lambda Code

```bash
cd backend/lambda
# Edit s3-operations.py
zip function.zip s3-operations.py
aws lambda update-function-code \
  --function-name s3browser-operations \
  --zip-file fileb://function.zip \
  --region ap-southeast-1 \
  --profile palawanpay
```

### Updating Frontend

```bash
# Make changes to src/
git add .
git commit -m "Description of changes"
git push origin main
# Amplify auto-deploys
```

### Rotating Credentials

#### IAM Identity Center
- Credentials managed by Entra ID
- No manual rotation needed

#### Lambda Role
- Uses IAM role (no static credentials)
- Rotate if role is compromised

### Backup and Recovery

#### Configuration Backup

```bash
# Export Cognito configuration
aws cognito-idp describe-user-pool \
  --user-pool-id ap-southeast-1_YdUsCa38i \
  > cognito-backup.json

# Export Lambda configuration
aws lambda get-function \
  --function-name s3browser-operations \
  > lambda-backup.json
```

#### Disaster Recovery

1. **Frontend**: Redeploy from GitHub repository
2. **Lambda**: Redeploy from `backend/lambda/` directory
3. **Cognito**: Recreate from backup configuration
4. **API Gateway**: Recreate and update Lambda integration

## 📊 Performance Optimization

### Current Performance

- **Lambda Cold Start**: ~500ms
- **Lambda Warm**: ~50-100ms
- **Bucket Listing**: 2-3 seconds (with parallel processing across 3 accounts)
- **Cached Bucket Listing**: Instant (60-second cache)
- **File Upload**: Depends on file size and network
- **File Download**: Direct from S3 via presigned URLs

### Optimization Implemented

1. **Parallel Account Processing**: All accounts queried simultaneously using ThreadPoolExecutor
   - 3x faster than sequential processing
   - Reduces total wait time to the slowest account response

2. **Frontend Caching**: 60-second cache for bucket list
   - Subsequent page loads are instant
   - Reduces API calls and Lambda invocations

3. **Increased Lambda Memory**: 512 MB (from 128 MB)
   - More memory = more CPU allocation
   - Faster execution times

4. **Simplified Permission Checks**: Removed slow write-permission tests
   - Assumes write access based on role configuration
   - Eliminates test file uploads

5. **Loading Indicators**: Animated spinner with progress message
   - Better user experience during load times

## 🤝 Contributing

### Branch Strategy

- `main`: Production code
- `feature/*`: New features
- `bugfix/*`: Bug fixes

### Development Workflow

1. Create feature branch
2. Make changes
3. Test locally
4. Push to GitHub
5. Create pull request
6. Review and merge

### Code Style

- **Frontend**: ESLint + Prettier
- **Backend**: PEP 8 (Python)
- **Commits**: Conventional Commits format

## 📞 Support

### Contacts

- **Developer**: Wilben Sibayan (wilben.s@palawanpay.com)
- **Repository**: https://github.com/johnwilben/palawanpay-s3browser

### Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Amazon Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [IAM Identity Center Documentation](https://docs.aws.amazon.com/singlesignon/)
- [React Documentation](https://react.dev/)

## 📝 License

Internal PalawanPay application - All rights reserved

## 🎉 Acknowledgments

Built for PalawanPay to simplify S3 bucket management across multiple AWS accounts.

---

**Happy Palawan Day! 🌴**
