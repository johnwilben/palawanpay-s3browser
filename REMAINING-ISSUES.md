# Remaining Issues to Fix

## 1. Temp Folder Created
**Issue**: When creating a folder, a temp folder appears
**Possible Cause**: The create_folder function creates an empty object with trailing `/`
**Status**: Need to investigate - may be S3 console behavior or frontend refresh issue

## 2. Cannot Move or Copy Files
**Issue**: Copy/Move operations not working
**Possible Cause**: Lambda functions exist but may need deployment or permission issues
**Next Steps**: 
- Deploy Lambda with latest changes
- Test copy/move in production
- Check CloudWatch logs for errors

## 3. Upload Redirects to Main Folder
**Issue**: After uploading files, user is redirected to main folder instead of staying in current folder
**Current Code**: `navigate(\`/bucket/${bucketName}${currentPrefix ? \`?prefix=${currentPrefix}\` : ''}\`)`
**Status**: Code looks correct - need to verify currentPrefix is being passed correctly

## 4. Grid Text Not Legible in Dark Mode
**Issue**: Text not visible when hovering over grid cards in dark mode
**Fix Applied**: Added more specific CSS rules for hover state
**Status**: Need to test after deployment

## Deployment Checklist
- [ ] Deploy Lambda with audit logging and create_folder fixes
- [ ] Create audit log bucket: `palawanpay-s3browser-audit-logs`
- [ ] Grant Lambda permission to write to audit bucket
- [ ] Deploy frontend via Amplify
- [ ] Test all operations in production
