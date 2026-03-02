# S3 Browser Test Cases

## Authentication Tests

### TC-AUTH-001: SSO Login
- **Precondition**: User has valid IAM Identity Center credentials
- **Steps**:
  1. Navigate to application URL
  2. Click "Sign In" button
  3. Complete SSO authentication
- **Expected**: User successfully authenticated and redirected to bucket list
- **Priority**: Critical

### TC-AUTH-002: Unauthorized Access
- **Steps**: Access `/bucket/test-bucket` without authentication
- **Expected**: Redirected to login page
- **Priority**: Critical

### TC-AUTH-003: Session Expiry
- **Steps**: 
  1. Login successfully
  2. Wait for token expiration (1 hour)
  3. Attempt any action
- **Expected**: Redirected to login or token refresh occurs
- **Priority**: High

### TC-AUTH-004: Sign Out
- **Steps**: Click "Sign Out" button
- **Expected**: User logged out and redirected to login page
- **Priority**: High

---

## Bucket Listing Tests

### TC-BUCKET-001: List All Buckets (Single Account)
- **Precondition**: User authenticated, buckets exist in account 821276124335
- **Steps**: View bucket list page
- **Expected**: All accessible buckets from current account displayed
- **Priority**: Critical

### TC-BUCKET-002: List Cross-Account Buckets
- **Precondition**: Cross-account roles configured for accounts 730335474290, 684538810129
- **Steps**: View bucket list page
- **Expected**: Buckets from all 3 accounts displayed with account ID
- **Priority**: Critical

### TC-BUCKET-003: Empty Bucket List
- **Precondition**: No accessible buckets
- **Expected**: "No buckets available" message displayed
- **Priority**: Medium

### TC-BUCKET-004: Bucket List Performance
- **Steps**: Load bucket list with 50+ buckets across accounts
- **Expected**: Page loads within 5 seconds, parallel loading works
- **Priority**: Medium

### TC-BUCKET-005: Failed Cross-Account Access
- **Precondition**: One cross-account role has invalid permissions
- **Expected**: Buckets from working accounts still display, error logged
- **Priority**: High

---

## Object Listing Tests

### TC-OBJ-001: List Objects in Bucket
- **Precondition**: Bucket contains files
- **Steps**: Click on bucket name
- **Expected**: All objects displayed with name, size, last modified
- **Priority**: Critical

### TC-OBJ-002: Empty Bucket
- **Steps**: Open bucket with no objects
- **Expected**: "No files in this bucket" message
- **Priority**: Medium

### TC-OBJ-003: Large Object List
- **Steps**: Open bucket with 1000+ objects
- **Expected**: Objects load (may need pagination in future)
- **Priority**: Low

### TC-OBJ-004: Cross-Account Bucket Objects
- **Steps**: Open bucket from account 730335474290 or 684538810129
- **Expected**: Objects listed correctly using assumed role
- **Priority**: Critical

### TC-OBJ-005: No Read Permission
- **Steps**: Access bucket without read permission
- **Expected**: 403 error with "No read access" message
- **Priority**: High

---

## Upload Tests

### TC-UPLOAD-001: Upload Small File (<5MB)
- **Precondition**: User has write permission on bucket
- **Steps**:
  1. Click "Upload File"
  2. Select file <5MB
  3. Wait for upload completion
- **Expected**: File uploaded, appears in object list
- **Priority**: Critical

### TC-UPLOAD-002: Upload Large File (>5MB)
- **Steps**: Upload file >5MB
- **Expected**: Upload succeeds or shows appropriate size limit error
- **Priority**: High
- **Note**: Lambda payload limit is 6MB, may need presigned URL for larger files

### TC-UPLOAD-003: Upload to Read-Only Bucket
- **Precondition**: User has read-only permission
- **Steps**: Attempt to upload file
- **Expected**: Upload button not visible or disabled
- **Priority**: High

### TC-UPLOAD-004: Upload Duplicate Filename
- **Steps**: Upload file with same name as existing object
- **Expected**: File overwrites existing (S3 default behavior) or shows warning
- **Priority**: Medium

### TC-UPLOAD-005: Upload Special Characters in Filename
- **Steps**: Upload file named `test file (1) & special.txt`
- **Expected**: File uploads with properly encoded name
- **Priority**: Medium

### TC-UPLOAD-006: Upload to Cross-Account Bucket
- **Steps**: Upload file to bucket in account 730335474290
- **Expected**: Upload succeeds using assumed role credentials
- **Priority**: Critical

### TC-UPLOAD-007: Concurrent Uploads
- **Steps**: Upload 3 files simultaneously
- **Expected**: All uploads complete successfully
- **Priority**: Low

### TC-UPLOAD-008: Upload Progress Indicator
- **Steps**: Upload file and observe UI
- **Expected**: "Uploading..." message shown, button disabled during upload
- **Priority**: Medium

---

## Download Tests

### TC-DOWNLOAD-001: Download Small File
- **Steps**: Click "Download" on any file
- **Expected**: File downloads or opens in new tab
- **Priority**: Critical

### TC-DOWNLOAD-002: Download Large File (>100MB)
- **Steps**: Download file >100MB
- **Expected**: Download succeeds via presigned URL
- **Priority**: High

### TC-DOWNLOAD-003: Download from Cross-Account Bucket
- **Steps**: Download file from bucket in account 684538810129
- **Expected**: Download succeeds with correct credentials
- **Priority**: Critical

### TC-DOWNLOAD-004: Download with Special Characters
- **Steps**: Download file with special characters in name
- **Expected**: File downloads with correct filename
- **Priority**: Medium

### TC-DOWNLOAD-005: Expired Presigned URL
- **Steps**: 
  1. Generate download URL
  2. Wait 61 minutes
  3. Use URL
- **Expected**: URL expired error (presigned URLs expire in 1 hour)
- **Priority**: Low

---

## Permission Tests

### TC-PERM-001: Read-Only Bucket Detection
- **Steps**: Open bucket with read-only access
- **Expected**: Upload button not displayed, canWrite=false
- **Priority**: High

### TC-PERM-002: Write Permission Detection
- **Steps**: Open bucket with write access
- **Expected**: Upload button visible and functional
- **Priority**: High

### TC-PERM-003: Permission Check Performance
- **Steps**: Open bucket and measure permission check time
- **Expected**: Permission check completes within 2 seconds
- **Priority**: Low

---

## Error Handling Tests

### TC-ERROR-001: Network Failure During Upload
- **Steps**: 
  1. Start upload
  2. Disconnect network
- **Expected**: Error message displayed
- **Priority**: Medium

### TC-ERROR-002: Invalid Bucket Name
- **Steps**: Manually navigate to `/bucket/invalid-bucket-name`
- **Expected**: Error message or redirect to bucket list
- **Priority**: Medium

### TC-ERROR-003: Lambda Timeout
- **Steps**: Trigger operation that takes >30 seconds
- **Expected**: Timeout error with user-friendly message
- **Priority**: Low

### TC-ERROR-004: Assume Role Failure
- **Precondition**: Cross-account role trust relationship broken
- **Steps**: Access cross-account bucket
- **Expected**: Error message, buckets from that account not shown
- **Priority**: High

---

## UI/UX Tests

### TC-UI-001: Responsive Design - Mobile
- **Steps**: Access application on mobile device (375px width)
- **Expected**: UI adapts, all functions accessible
- **Priority**: Medium

### TC-UI-002: Responsive Design - Tablet
- **Steps**: Access application on tablet (768px width)
- **Expected**: UI displays correctly
- **Priority**: Low

### TC-UI-003: Loading States
- **Steps**: Observe UI during bucket list load
- **Expected**: "Loading..." indicator shown
- **Priority**: Medium

### TC-UI-004: Back Navigation
- **Steps**: 
  1. Open bucket
  2. Click "← Back"
- **Expected**: Returns to bucket list
- **Priority**: High

### TC-UI-005: Browser Back Button
- **Steps**: Use browser back button from bucket view
- **Expected**: Returns to bucket list correctly
- **Priority**: Medium

---

## Security Tests

### TC-SEC-001: XSS in Bucket Name
- **Steps**: Create bucket with name containing `<script>alert('xss')</script>`
- **Expected**: Script not executed, name displayed as text
- **Priority**: Critical

### TC-SEC-002: XSS in Object Key
- **Steps**: Upload file with malicious name
- **Expected**: Name sanitized and displayed safely
- **Priority**: Critical

### TC-SEC-003: CSRF Protection
- **Steps**: Attempt API call without valid auth token
- **Expected**: Request rejected with 401/403
- **Priority**: Critical

### TC-SEC-004: Token in URL
- **Steps**: Check browser URL and history
- **Expected**: No auth tokens visible in URL
- **Priority**: High

### TC-SEC-005: Token in Logs
- **Steps**: Check CloudWatch logs
- **Expected**: No auth tokens or sensitive data logged
- **Priority**: High

### TC-SEC-006: Unauthorized Bucket Access
- **Steps**: Attempt to access bucket user doesn't have permission for
- **Expected**: 403 error, no data leaked
- **Priority**: Critical

### TC-SEC-007: SQL Injection in Parameters
- **Steps**: Send malicious input in bucket/key parameters
- **Expected**: Input sanitized, no errors
- **Priority**: High

---

## Performance Tests

### TC-PERF-001: Bucket List Load Time
- **Metric**: Time to load 50 buckets across 3 accounts
- **Target**: <5 seconds
- **Priority**: Medium

### TC-PERF-002: Object List Load Time
- **Metric**: Time to load 100 objects
- **Target**: <3 seconds
- **Priority**: Medium

### TC-PERF-003: Upload Speed
- **Metric**: Upload 10MB file
- **Target**: Completes within reasonable time based on connection
- **Priority**: Low

### TC-PERF-004: Concurrent Users
- **Steps**: 10 users accessing simultaneously
- **Expected**: No degradation, Lambda scales automatically
- **Priority**: Low

---

## Integration Tests

### TC-INT-001: IAM Identity Center Integration
- **Steps**: Complete full SSO flow
- **Expected**: User attributes correctly passed to application
- **Priority**: Critical

### TC-INT-002: API Gateway Integration
- **Steps**: Make API call through API Gateway
- **Expected**: Request routed to Lambda, response returned correctly
- **Priority**: Critical

### TC-INT-003: CloudWatch Logging
- **Steps**: Perform various operations
- **Expected**: Logs appear in CloudWatch with appropriate detail
- **Priority**: Medium

### TC-INT-004: Amplify Deployment
- **Steps**: Push code to feature branch
- **Expected**: Amplify auto-deploys, preview URL works
- **Priority**: High

---

## Regression Tests (Run Before Each Release)

1. TC-AUTH-001, TC-AUTH-004
2. TC-BUCKET-001, TC-BUCKET-002
3. TC-OBJ-001, TC-OBJ-004
4. TC-UPLOAD-001, TC-UPLOAD-006
5. TC-DOWNLOAD-001, TC-DOWNLOAD-003
6. TC-PERM-001, TC-PERM-002
7. TC-SEC-001, TC-SEC-002, TC-SEC-003, TC-SEC-006
8. TC-UI-004

---

## Test Data Requirements

### Accounts
- **Primary**: 821276124335
- **Cross-Account 1**: 730335474290
- **Cross-Account 2**: 684538810129

### Test Buckets
- `test-bucket-s3-browser-ppay12` (read/write)
- `testing-autosending` (read/write)
- `s3-to-sftp-test` (read-only)
- Cross-account buckets in 730335474290 and 684538810129

### Test Files
- Small: <1MB (text, image, PDF)
- Medium: 1-5MB (document, image)
- Large: >5MB (video, archive)
- Special names: `test file (1).txt`, `file&name.pdf`, `文件.txt`

---

## Test Environment Setup

```bash
# 1. Deploy to feature branch
git checkout feature/cross-account-access
git pull origin feature/cross-account-access

# 2. Verify Lambda deployed
aws lambda get-function --function-name s3browser-operations --region ap-southeast-1

# 3. Verify IAM roles exist
aws iam get-role --role-name LambdaS3BrowserRole
aws iam get-role --role-name S3BrowserCrossAccountRole --profile account-730335474290
aws iam get-role --role-name S3BrowserCrossAccountRole --profile account-684538810129

# 4. Access Amplify preview URL
# https://feature-cross-account-access.drm7arslkowgf.amplifyapp.com
```

---

## Bug Reporting Template

```
**Test Case ID**: TC-XXX-XXX
**Environment**: Feature/Production
**Browser**: Chrome 120 / Safari 17 / etc.
**User**: test@palawanpay.com

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:

**Actual Result**:

**Screenshots/Logs**:

**Severity**: Critical/High/Medium/Low
```
