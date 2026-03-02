# Production Deployment Checklist

## Pre-Deployment

### Code Review
- [ ] All feature branch code reviewed and approved
- [ ] No hardcoded credentials or secrets in code
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all API calls
- [ ] All TODO/FIXME comments resolved or documented

### Testing
- [ ] All critical test cases passed (see TEST_CASES.md)
- [ ] Cross-account access tested in all 3 accounts
- [ ] Upload/download tested with various file types and sizes
- [ ] Authentication flow tested end-to-end
- [ ] Permission checks validated (read-only vs read-write)
- [ ] Error scenarios tested (network failure, timeouts, etc.)
- [ ] Browser compatibility tested (Chrome, Safari, Edge, Firefox)
- [ ] Mobile responsiveness verified

### Documentation
- [ ] README.md updated with production URLs
- [ ] DEPLOYMENT.md reflects production configuration
- [ ] Architecture diagrams current
- [ ] API documentation complete
- [ ] Runbook created for common issues

---

## Infrastructure Setup

### AWS Account: 821276124335 (Primary)

#### IAM Roles
- [ ] `LambdaS3BrowserRole` created with correct permissions
- [ ] Inline policy `S3BrowserPolicy` attached (see backend/iam-policy.json)
- [ ] Trust relationship allows Lambda service
- [ ] `sts:AssumeRole` permission for cross-account roles

#### Lambda Function
- [ ] Function name: `s3browser-operations-prod`
- [ ] Runtime: Python 3.11
- [ ] Memory: 512 MB (adjust based on testing)
- [ ] Timeout: 30 seconds
- [ ] Environment variables set (if any)
- [ ] Latest code deployed from main branch
- [ ] Function URL disabled (use API Gateway only)
- [ ] Reserved concurrency configured (optional, based on usage)

#### API Gateway
- [ ] REST API created: `S3BrowserAPI-prod`
- [ ] CORS configured for production domain
- [ ] Cognito authorizer attached
- [ ] Throttling configured (rate: 1000 req/sec, burst: 2000)
- [ ] API key not required (using Cognito)
- [ ] CloudWatch logging enabled
- [ ] Stage: `prod`
- [ ] Custom domain configured (optional)

#### Cognito User Pool
- [ ] User pool created: `palawanpay-s3browser-prod`
- [ ] SAML identity provider configured
- [ ] IAM Identity Center metadata uploaded
- [ ] App client created with correct callback URLs
- [ ] Token expiration: Access (1 hour), ID (1 hour), Refresh (30 days)
- [ ] MFA enforced (recommended)
- [ ] Password policy configured
- [ ] User pool domain: `palawanpay-s3browser-prod.auth.ap-southeast-1.amazoncognito.com`

#### Amplify Hosting
- [ ] App connected to GitHub repository
- [ ] Main branch configured for production
- [ ] Build settings from amplify.yml
- [ ] Environment variables set:
  - `REACT_APP_ENV=production`
  - Any other required variables
- [ ] Custom domain configured (optional): `s3browser.palawanpay.com`
- [ ] SSL certificate provisioned
- [ ] Redirects configured (HTTP → HTTPS)
- [ ] Branch auto-deployment enabled for main

#### CloudWatch
- [ ] Log group created: `/aws/lambda/s3browser-operations-prod`
- [ ] Log retention: 30 days (or per compliance requirements)
- [ ] Alarms configured:
  - Lambda errors > 10 in 5 minutes
  - Lambda duration > 25 seconds
  - API Gateway 5xx errors > 5 in 5 minutes
  - API Gateway 4xx errors > 100 in 5 minutes

---

### AWS Account: 730335474290 (Cross-Account)

#### IAM Role
- [ ] Role name: `S3BrowserCrossAccountRole`
- [ ] Trust relationship allows account 821276124335 to assume role
- [ ] Permissions:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:HeadBucket"
        ],
        "Resource": "arn:aws:s3:::*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        "Resource": "arn:aws:s3:::*/*"
      }
    ]
  }
  ```
- [ ] External ID configured (optional, for additional security)
- [ ] Session duration: 1 hour

---

### AWS Account: 684538810129 (Cross-Account)

#### IAM Role
- [ ] Role name: `S3BrowserCrossAccountRole`
- [ ] Trust relationship allows account 821276124335 to assume role
- [ ] Same permissions as 730335474290
- [ ] External ID configured (optional)
- [ ] Session duration: 1 hour

---

## Security Checklist

### Authentication & Authorization
- [ ] SSO integration with IAM Identity Center working
- [ ] Only authorized users can access application
- [ ] Session tokens expire after 1 hour
- [ ] Refresh tokens working correctly
- [ ] Sign out clears all tokens
- [ ] No authentication bypass possible

### API Security
- [ ] All API endpoints require authentication
- [ ] Cognito authorizer validates tokens
- [ ] CORS restricted to production domain only
- [ ] No sensitive data in API responses
- [ ] Rate limiting configured
- [ ] API Gateway logs don't contain tokens

### Data Security
- [ ] No credentials in code or environment variables
- [ ] Cross-account roles use least privilege
- [ ] S3 buckets have appropriate bucket policies
- [ ] Encryption at rest enabled on S3 buckets
- [ ] Encryption in transit (HTTPS only)
- [ ] No PII logged to CloudWatch

### Application Security
- [ ] XSS protection (React escapes by default)
- [ ] No eval() or dangerouslySetInnerHTML used
- [ ] Dependencies scanned for vulnerabilities (`npm audit`)
- [ ] Content Security Policy headers configured
- [ ] Subresource Integrity (SRI) for CDN resources
- [ ] No inline scripts in HTML

### Network Security
- [ ] Lambda in VPC (if accessing private resources)
- [ ] Security groups configured correctly
- [ ] NACLs reviewed
- [ ] VPC endpoints for S3 (optional, for private access)

### Compliance
- [ ] Data residency requirements met (ap-southeast-1)
- [ ] Audit logging enabled
- [ ] Access logs retained per policy
- [ ] GDPR/privacy requirements addressed
- [ ] Incident response plan documented

### Secrets Management
- [ ] No secrets in code repository
- [ ] AWS Secrets Manager used for sensitive config (if needed)
- [ ] IAM roles used instead of access keys
- [ ] Secrets rotation configured (if applicable)

---

## Deployment Steps

### 1. Merge to Main Branch
```bash
# Ensure feature branch is up to date
git checkout feature/cross-account-access
git pull origin feature/cross-account-access

# Create pull request to main
# Get approvals from team
# Merge PR
```

### 2. Deploy Lambda Function
```bash
# Package function
cd backend/lambda
zip -r function-prod.zip s3-operations.py

# Deploy to production
aws lambda update-function-code \
  --function-name s3browser-operations-prod \
  --zip-file fileb://function-prod.zip \
  --region ap-southeast-1 \
  --profile palawanpay

# Verify deployment
aws lambda get-function \
  --function-name s3browser-operations-prod \
  --region ap-southeast-1 \
  --profile palawanpay
```

### 3. Update IAM Policies
```bash
# Update Lambda execution role
aws iam put-role-policy \
  --role-name LambdaS3BrowserRole \
  --policy-name S3BrowserPolicy \
  --policy-document file://backend/iam-policy.json \
  --region ap-southeast-1 \
  --profile palawanpay
```

### 4. Configure Amplify
- [ ] Navigate to Amplify Console
- [ ] Connect main branch
- [ ] Set environment variables
- [ ] Trigger manual deployment
- [ ] Monitor build logs

### 5. Update Frontend Configuration
```bash
# Update src/aws-exports.js with production values
# Commit and push to main branch
```

### 6. DNS Configuration (if using custom domain)
```bash
# Add CNAME record pointing to Amplify domain
# Wait for SSL certificate validation
# Verify HTTPS access
```

---

## Post-Deployment Verification

### Smoke Tests
- [ ] Access production URL
- [ ] Login with test user
- [ ] View bucket list from all 3 accounts
- [ ] Open a bucket and view objects
- [ ] Upload a small test file
- [ ] Download the uploaded file
- [ ] Delete test file (if write access)
- [ ] Sign out

### Monitoring Setup
- [ ] CloudWatch dashboard created
- [ ] Alarms configured and tested
- [ ] SNS topic for alerts created
- [ ] Email/Slack notifications working
- [ ] Log insights queries saved

### Performance Verification
- [ ] Bucket list loads in <5 seconds
- [ ] Object list loads in <3 seconds
- [ ] Upload completes successfully
- [ ] Download works without CORS errors
- [ ] No console errors in browser

### Security Verification
- [ ] Unauthenticated access blocked
- [ ] Cross-account access working
- [ ] Permission checks functioning
- [ ] No sensitive data in logs
- [ ] HTTPS enforced

---

## Rollback Plan

### If Issues Detected

#### Option 1: Revert Frontend
```bash
# In Amplify Console
# Redeploy previous successful build
# Or revert commit in GitHub and push
```

#### Option 2: Revert Lambda
```bash
# List versions
aws lambda list-versions-by-function \
  --function-name s3browser-operations-prod \
  --region ap-southeast-1

# Revert to previous version
aws lambda update-function-configuration \
  --function-name s3browser-operations-prod \
  --environment Variables={FUNCTION_VERSION=previous} \
  --region ap-southeast-1
```

#### Option 3: Full Rollback
- [ ] Revert GitHub main branch to previous commit
- [ ] Redeploy Lambda from previous version
- [ ] Update IAM policies if changed
- [ ] Clear CloudFront cache (if using)
- [ ] Notify users of temporary issues

---

## Communication Plan

### Before Deployment
- [ ] Notify stakeholders of deployment window
- [ ] Schedule maintenance window (if downtime expected)
- [ ] Prepare status page update

### During Deployment
- [ ] Update status page: "Maintenance in progress"
- [ ] Monitor deployment progress
- [ ] Run smoke tests immediately after

### After Deployment
- [ ] Announce successful deployment
- [ ] Update status page: "All systems operational"
- [ ] Send summary email with changes
- [ ] Update internal documentation

### If Issues Occur
- [ ] Immediately notify stakeholders
- [ ] Update status page with issue details
- [ ] Execute rollback plan
- [ ] Post-mortem meeting scheduled

---

## Post-Deployment Tasks

### Day 1
- [ ] Monitor CloudWatch logs for errors
- [ ] Check alarm status
- [ ] Review user feedback
- [ ] Verify all features working

### Week 1
- [ ] Analyze usage patterns
- [ ] Review performance metrics
- [ ] Adjust Lambda memory/timeout if needed
- [ ] Optimize costs

### Month 1
- [ ] Security audit
- [ ] Performance review
- [ ] User satisfaction survey
- [ ] Plan next iteration

---

## Maintenance

### Regular Tasks
- [ ] **Weekly**: Review CloudWatch logs and alarms
- [ ] **Monthly**: Update dependencies (`npm audit fix`)
- [ ] **Quarterly**: Security review and penetration testing
- [ ] **Annually**: Disaster recovery drill

### Dependency Updates
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Test thoroughly before deploying
npm test
```

### Lambda Updates
- [ ] Monitor AWS Lambda runtime deprecation notices
- [ ] Plan migration to newer Python versions
- [ ] Test in staging before production

---

## Contacts

### Escalation Path
1. **Developer**: [Your Name] - [email]
2. **Team Lead**: [Name] - [email]
3. **DevOps**: [Name] - [email]
4. **Security**: [Name] - [email]

### AWS Support
- **Account**: 821276124335
- **Support Plan**: Business/Enterprise
- **Support Portal**: https://console.aws.amazon.com/support/

---

## Sign-Off

- [ ] **Developer**: Code ready for production - _________________ Date: _______
- [ ] **QA**: All tests passed - _________________ Date: _______
- [ ] **Security**: Security review complete - _________________ Date: _______
- [ ] **DevOps**: Infrastructure ready - _________________ Date: _______
- [ ] **Manager**: Approved for deployment - _________________ Date: _______

---

## Deployment Log

| Date | Version | Deployed By | Changes | Status |
|------|---------|-------------|---------|--------|
| 2026-03-02 | v1.0.0 | [Name] | Initial production release | Success |
|  |  |  |  |  |
