# PalawanPay S3 Browser - User Manual

## Welcome to S3 Browser! 🌴

This guide will help you navigate and use the PalawanPay S3 Browser to access and manage your S3 buckets across multiple AWS accounts.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Logging In](#logging-in)
3. [Viewing Your Buckets](#viewing-your-buckets)
4. [Browsing Files](#browsing-files)
5. [Uploading Files](#uploading-files)
6. [Downloading Files](#downloading-files)
7. [Understanding Permissions](#understanding-permissions)
8. [Troubleshooting](#troubleshooting)
9. [Frequently Asked Questions](#frequently-asked-questions)

---

## Getting Started

### What is S3 Browser?

S3 Browser is a secure web application that allows you to:
- View S3 buckets from multiple AWS accounts in one place
- Upload and download files
- See which buckets you have access to
- Manage files across different accounts easily

### Who Can Use It?

Any PalawanPay employee with:
- An active PalawanPay email account
- Access granted through IAM Identity Center
- Assigned permissions to specific S3 buckets

### Accessing the Application

**URL**: https://main.drm7arslkowgf.amplifyapp.com

**Supported Browsers**:
- Google Chrome (recommended)
- Microsoft Edge
- Safari
- Firefox

**Supported Devices**:
- Desktop computers
- Laptops
- Tablets
- Mobile phones

---

## Logging In

### Step-by-Step Login Process

1. **Open your web browser** and navigate to:
   ```
   https://main.drm7arslkowgf.amplifyapp.com
   ```

2. **You will see the login page** with:
   - Green background with PalawanPay branding
   - PalawanPay logo in a white box
   - "S3 Browser" title
   - A large white "Sign In" button

   ![Login Page](login-page-example.png)

3. **Click the "Sign In" button**
   - You will be automatically redirected to the IAM Identity Center login page

4. **Enter your PalawanPay credentials**:
   - Email: `your.name@palawanpay.com`
   - Password: Your PalawanPay password

5. **Complete any additional authentication** if required:
   - Multi-factor authentication (MFA)
   - Security questions

6. **You're in!** 
   - After successful login, you'll be redirected back to S3 Browser
   - You'll see "Happy Palawan Day, [your email]" in the top right corner

### Important Notes

- ⚠️ **No username/password on S3 Browser**: You won't see username and password fields on the S3 Browser page itself. The login happens through IAM Identity Center.
- ⚠️ **No sign-up option**: You cannot create an account yourself. Access must be granted by your IT administrator.
- ⚠️ **Session timeout**: Your session will expire after a period of inactivity. Simply log in again if this happens.

---

## Viewing Your Buckets

### Understanding the Bucket List

After logging in, you'll see a grid of cards, each representing an S3 bucket you have access to.

### What You'll See on Each Bucket Card

Each bucket card displays:

1. **Bucket Name** (large text at the top)
   - Example: `palawanpay-production-data`

2. **Account ID** (below the bucket name)
   - Example: `Account: 821276124335`
   - This tells you which AWS account the bucket belongs to

3. **Permission Badges** (colored labels at the bottom)
   - **Blue "Read" badge**: You can view and download files
   - **Orange "Write" badge**: You can upload files
   - **Both badges**: You have full access

### How to Navigate

- **Scroll** through the page to see all your buckets
- **Click on any bucket card** to open it and view its contents
- **Look for the account ID** to identify which account a bucket belongs to

### Loading Time

- **First load**: May take 2-3 seconds to fetch buckets from all accounts
- **Subsequent loads**: Nearly instant (cached for 60 seconds)
- **Loading indicator**: You'll see a spinning animation while buckets are being loaded

---

## Browsing Files

### Opening a Bucket

1. **Click on a bucket card** from the main page
2. **Wait for files to load** (usually 1-2 seconds)
3. **You'll see a list of all files** in the bucket

### Understanding the File List

Each file entry shows:

1. **File Name** (left side)
   - Example: `report-2026-03.pdf`

2. **File Size** (below the file name)
   - Example: `2.45 MB`
   - Displayed in KB (kilobytes) or MB (megabytes)

3. **Download Button** (right side)
   - Blue button labeled "Download"

### Navigation

- **Back to Buckets**: Click the "← Back" button at the top left
- **Scroll**: Use your mouse or touchscreen to scroll through long file lists

### Empty Buckets

If a bucket has no files, you'll see:
```
No files in this bucket
```

---

## Uploading Files

### Can I Upload?

You can only upload files to buckets where you have **Write** permission (orange badge).

### How to Upload a File

1. **Open the bucket** where you want to upload

2. **Look for the "Upload File" button** at the top right
   - If you don't see this button, you don't have write permission

3. **Click "Upload File"**
   - A file picker dialog will open

4. **Select your file**
   - Browse your computer
   - Select the file you want to upload
   - Click "Open"

5. **Wait for upload to complete**
   - You'll see "Uploading..." on the button
   - The button will be disabled during upload
   - Upload time depends on file size and internet speed

6. **File appears in the list**
   - Once uploaded, the file will automatically appear in the file list
   - You can now download it or share it with others

### Upload Limitations

- **File size**: No hard limit, but very large files (>5GB) may take a long time
- **File types**: All file types are supported
- **Internet connection**: Stable internet required for large files
- **Permissions**: You must have Write access to the bucket

### Upload Tips

✅ **Check your internet connection** before uploading large files
✅ **Don't close the browser** while uploading
✅ **Wait for confirmation** before navigating away
✅ **Use descriptive file names** for easy identification

---

## Downloading Files

### How to Download a File

1. **Navigate to the bucket** containing the file

2. **Find the file** you want to download in the list

3. **Click the "Download" button** next to the file
   - The button is blue and on the right side

4. **File downloads automatically**
   - Your browser will download the file
   - Check your Downloads folder
   - Some browsers may ask where to save the file

### Download Behavior

- **Direct download**: Files download directly from S3 (fast and secure)
- **No size limit**: You can download files of any size
- **Secure links**: Download links expire after 1 hour for security
- **Multiple downloads**: You can download multiple files, one at a time

### Download Tips

✅ **Check available disk space** before downloading large files
✅ **Stable internet connection** recommended for large files
✅ **Browser downloads folder** - know where your browser saves files
✅ **Antivirus scan** - your antivirus may scan downloaded files

---

## Understanding Permissions

### Permission Types

#### Read Permission (Blue Badge)

**What you can do**:
- ✅ View the bucket
- ✅ See all files in the bucket
- ✅ Download any file
- ✅ See file names and sizes

**What you cannot do**:
- ❌ Upload new files
- ❌ Delete files
- ❌ Modify existing files

#### Write Permission (Orange Badge)

**What you can do**:
- ✅ Everything from Read permission
- ✅ Upload new files
- ✅ Replace existing files (by uploading with same name)

**What you cannot do**:
- ❌ Delete files (not implemented in this version)
- ❌ Rename files (not implemented in this version)

#### No Permission

If you don't have any permission to a bucket:
- ❌ The bucket won't appear in your list at all
- ❌ You cannot access it even if you know the name

### Why Don't I Have Access?

Permissions are controlled by:
1. **Your IAM Identity Center role**
2. **AWS account policies**
3. **S3 bucket policies**
4. **Your department or team assignment**

**To request access**: Contact your IT administrator or team lead.

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "I can't log in"

**Possible causes**:
- Incorrect email or password
- Account not assigned to S3 Browser application
- Network connectivity issues

**Solutions**:
1. ✅ Verify your email and password are correct
2. ✅ Try resetting your password through IAM Identity Center
3. ✅ Contact IT support if you believe you should have access
4. ✅ Check your internet connection

---

#### Issue: "I don't see any buckets"

**Possible causes**:
- No buckets assigned to you
- Permissions not yet configured
- Buckets are loading (wait a few seconds)

**Solutions**:
1. ✅ Wait 3-5 seconds for buckets to load
2. ✅ Refresh the page (F5 or Ctrl+R)
3. ✅ Contact your team lead to request bucket access
4. ✅ Verify you're logged in (check top right corner for your email)

---

#### Issue: "Upload button is missing"

**Possible causes**:
- You only have Read permission
- Bucket is read-only

**Solutions**:
1. ✅ Check if the bucket has an orange "Write" badge
2. ✅ Request write access from your administrator if needed
3. ✅ Use a different bucket where you have write permission

---

#### Issue: "Upload is taking too long"

**Possible causes**:
- Large file size
- Slow internet connection
- Network congestion

**Solutions**:
1. ✅ Check your internet speed
2. ✅ Try uploading during off-peak hours
3. ✅ Split large files if possible
4. ✅ Use a wired connection instead of WiFi

---

#### Issue: "Download failed"

**Possible causes**:
- Internet connection interrupted
- Insufficient disk space
- Browser security settings

**Solutions**:
1. ✅ Check your available disk space
2. ✅ Try downloading again
3. ✅ Check browser download settings
4. ✅ Disable browser extensions temporarily
5. ✅ Try a different browser

---

#### Issue: "Page is blank or not loading"

**Possible causes**:
- Browser compatibility
- JavaScript disabled
- Cache issues

**Solutions**:
1. ✅ Clear your browser cache (Ctrl+Shift+Delete)
2. ✅ Enable JavaScript in browser settings
3. ✅ Try a different browser (Chrome recommended)
4. ✅ Disable browser extensions
5. ✅ Check if you're using a supported browser

---

#### Issue: "Session expired"

**Possible causes**:
- Inactive for too long
- Security timeout

**Solutions**:
1. ✅ Simply log in again
2. ✅ Your work is not lost - buckets and files remain unchanged

---

## Frequently Asked Questions

### General Questions

**Q: Is my data secure?**
A: Yes! All data is:
- Encrypted in transit (HTTPS)
- Stored in secure AWS S3 buckets
- Access controlled by IAM Identity Center
- Logged and audited

**Q: Can I access this from home?**
A: Yes, as long as you have:
- Internet connection
- Valid PalawanPay credentials
- Access granted by your administrator

**Q: Does this work on mobile?**
A: Yes! The interface is responsive and works on:
- Smartphones
- Tablets
- Desktop computers

**Q: Can I share files with others?**
A: Not directly through the app. To share:
1. Download the file
2. Share via email or other approved methods
3. Or grant the person access to the bucket

---

### Account & Access Questions

**Q: How do I get access to more buckets?**
A: Contact your:
- Team lead
- Department manager
- IT administrator

**Q: Why can I see some buckets but not others?**
A: Access is granted on a per-bucket basis based on your role and department needs.

**Q: Can I create new buckets?**
A: No, bucket creation is not available in this application. Contact IT for new bucket requests.

**Q: How long does my session last?**
A: Sessions typically last for several hours. You'll be prompted to log in again if it expires.

---

### File Management Questions

**Q: What's the maximum file size I can upload?**
A: There's no hard limit, but:
- Files over 5GB may take a long time
- Your internet connection affects upload speed
- Very large files (>100GB) should be uploaded via other methods

**Q: Can I upload multiple files at once?**
A: Currently, you can only upload one file at a time. Upload them sequentially.

**Q: Can I delete files?**
A: File deletion is not currently available in this version. Contact IT if you need files deleted.

**Q: Can I rename files?**
A: Not directly. You can:
1. Download the file
2. Rename it on your computer
3. Upload it with the new name

**Q: What file types are supported?**
A: All file types are supported:
- Documents (PDF, Word, Excel)
- Images (JPG, PNG, GIF)
- Videos (MP4, AVI)
- Archives (ZIP, RAR)
- Any other file type

---

### Performance Questions

**Q: Why is it slow to load buckets?**
A: The first load queries multiple AWS accounts (2-3 seconds). Subsequent loads are cached and instant.

**Q: Can I make it faster?**
A: The app is already optimized with:
- Parallel processing
- Intelligent caching
- Fast AWS infrastructure

**Q: Why do some downloads start immediately while others take time?**
A: All downloads are direct from S3. Speed depends on:
- File size
- Your internet connection
- AWS region proximity

---

### Technical Questions

**Q: Which browsers are supported?**
A: 
- ✅ Google Chrome (recommended)
- ✅ Microsoft Edge
- ✅ Safari
- ✅ Firefox
- ❌ Internet Explorer (not supported)

**Q: Do I need to install anything?**
A: No! It's a web application. Just use your browser.

**Q: Can I use this offline?**
A: No, internet connection is required to:
- Log in
- View buckets
- Upload/download files

**Q: Is there a mobile app?**
A: No dedicated mobile app, but the website works perfectly on mobile browsers.

---

## Getting Help

### Support Contacts

**For technical issues**:
- Email: IT Support
- Slack: #it-support channel

**For access requests**:
- Contact your team lead or manager

**For urgent issues**:
- Contact IT helpdesk

### Providing Feedback

We welcome your feedback! If you have:
- Feature requests
- Bug reports
- Suggestions for improvement

Please contact the development team or submit through your normal IT channels.

---

## Tips for Best Experience

### Do's ✅

- ✅ Use Google Chrome for best performance
- ✅ Keep your browser updated
- ✅ Use descriptive file names
- ✅ Check file size before uploading
- ✅ Wait for uploads to complete
- ✅ Log out when done (click "Sign Out")

### Don'ts ❌

- ❌ Don't share your login credentials
- ❌ Don't close browser during uploads
- ❌ Don't upload sensitive data to wrong buckets
- ❌ Don't leave your session unattended
- ❌ Don't use on public/shared computers without logging out

---

## Glossary

**S3 Bucket**: A container for storing files in Amazon S3

**IAM Identity Center**: AWS service for single sign-on authentication

**Entra ID**: Microsoft's identity and access management service (formerly Azure AD)

**Permission**: Authorization to perform specific actions (read, write)

**Upload**: Transfer a file from your computer to S3

**Download**: Transfer a file from S3 to your computer

**Session**: Your logged-in period in the application

**Cache**: Temporary storage for faster subsequent loads

**Cross-Account**: Accessing resources across multiple AWS accounts

---

## Version Information

**Application Version**: 1.0
**Last Updated**: March 2, 2026
**Manual Version**: 1.0

---

**Happy Palawan Day!** 🌴

For the latest updates and information, visit the application at:
https://main.drm7arslkowgf.amplifyapp.com
