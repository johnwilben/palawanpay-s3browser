# PalawanPay S3 Browser - User Manual v2.0

## Welcome to S3 Browser! 🌴

This guide will help you navigate and use the PalawanPay S3 Browser to access and manage your S3 buckets across multiple AWS accounts.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Logging In](#logging-in)
3. [Interface Overview](#interface-overview)
4. [Viewing Your Buckets](#viewing-your-buckets)
5. [Browsing Files & Folders](#browsing-files--folders)
6. [Uploading Files](#uploading-files)
7. [Downloading Files](#downloading-files)
8. [Copying & Moving Files](#copying--moving-files)
9. [Deleting Files](#deleting-files)
10. [Search & Sort](#search--sort)
11. [View Modes](#view-modes)
12. [Dark Mode](#dark-mode)
13. [Understanding Permissions](#understanding-permissions)
14. [Troubleshooting](#troubleshooting)
15. [Frequently Asked Questions](#frequently-asked-questions)

---

## Getting Started

### What is S3 Browser?

S3 Browser is a secure web application that allows you to:
- View S3 buckets from multiple AWS accounts in one place
- Browse folders and files with an intuitive interface
- Upload multiple files with drag-and-drop
- Download files individually or as ZIP archives
- Copy and move files between buckets
- Search and sort files easily
- Work in light or dark mode

### Who Can Use It?

Any PalawanPay employee with:
- An active PalawanPay email account
- Access granted through IAM Identity Center
- Assigned permissions to specific S3 buckets

### Accessing the Application

**URL**: https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com

**Supported Browsers**:
- Google Chrome (recommended)
- Microsoft Edge
- Safari
- Firefox

---

## Logging In

### Step-by-Step Login Process

1. **Open your web browser** and navigate to the application URL

2. **You will see the login page** with:
   - Green gradient background
   - PalawanPay logo
   - "S3 Browser" title
   - "Sign In" button

3. **Click the "Sign In" button**
   - Automatically redirected to IAM Identity Center

4. **Enter your PalawanPay credentials**:
   - Email: `your.name@palawanpay.com`
   - Password: Your PalawanPay password

5. **You're in!** 
   - See "Happy Palawan Day, [Your Name]" in the header

---

## Interface Overview

### Header

The top bar contains:
- **PalawanPay Logo** (left)
- **S3 Browser** title
- **Dark Mode Toggle** (🌙/☀️) - Switch between light and dark themes
- **User Greeting** - "Happy Palawan Day, [Your Name]"
- **Sign Out Button** - Log out of the application

### Main Area

- **Bucket List** (home page) - Grid or list of your accessible buckets
- **Bucket View** - Files and folders within a bucket
- **Upload Page** - Dedicated page for uploading multiple files

### Help Button

- **Floating ? Button** (bottom right) - Click for help and guides

---

## Viewing Your Buckets

### Bucket Display

Buckets are shown as cards (grid view) or rows (list view).

Each bucket shows:
- **Bucket Name** - Example: `datalake-prod-ap-southeast-1`
- **Permission Badges**:
  - 🔵 **Read** - View and download only
  - 🟠 **Write** - Full access (upload, download, delete)

### View Toggle

Switch between **Grid View** (⊞) and **List View** (☰):
- **Grid View** - Cards with large icons (default)
- **List View** - Compact rows showing more buckets

### Opening a Bucket

Click any bucket card/row to view its contents.

---

## Browsing Files & Folders

### Navigation

- **← Back** - Go to parent folder
- **Return to Home** - Go back to bucket list
- **Breadcrumb Path** - Click any part to jump to that folder
  - Example: `bucket-name / folder1 / folder2`

### Folder Structure

- **📁 Folders** - Click to navigate into
- **📄 Files** - Click checkbox to select

### File Information

Each file shows:
- **File Name**
- **File Size** (in KB/MB)
- **Last Modified Date**
- **Action Buttons** (↓ Download, 🗑️ Delete)

---

## Uploading Files

### Single Upload (Quick)

1. Navigate to desired folder
2. Click **Upload Files** button (top right)
3. Opens dedicated upload page

### Multi-File Upload Page

**Features**:
- **Drag & Drop Zone** - Drag files directly
- **Choose Files Button** - Browse and select multiple files
- **File List** - See all files before uploading
- **Progress Tracking** - ⏳ Uploading, ✅ Uploaded, ❌ Failed
- **Remove Files** - Click × to remove before uploading

**Steps**:
1. Click **Upload Files** from bucket view
2. **Drag files** into the drop zone OR click **Choose Files**
3. Select multiple files (hold Ctrl/Cmd)
4. Review file list
5. Click **Upload X Files**
6. Wait for all uploads to complete
7. Click **Done** to return to bucket

**Tips**:
- ✅ Upload multiple files at once
- ✅ See real-time progress for each file
- ✅ Files upload to current folder
- ✅ Remove unwanted files before uploading

---

## Downloading Files

### Single File Download

1. Find the file
2. Click **↓ (Download)** button
3. File downloads to your Downloads folder

### Multiple File Download (ZIP)

1. **Select files** using checkboxes
2. Click **↓ X** button in toolbar
3. Files are packaged into a ZIP file
4. ZIP downloads automatically
5. Extract ZIP on your computer

**Note**: Single file downloads directly, multiple files download as ZIP.

---

## Copying & Moving Files

### Copy Files

**Copies files to another location (keeps original)**

1. **Select files** using checkboxes
2. Click **📋 X** (Copy) button in toolbar
3. **Destination Picker** modal opens
4. **Select destination bucket**
5. **Navigate to folder** (optional)
6. Click **📍 Copy here**
7. Files are copied
8. Toast notification confirms success

### Move Files

**Moves files to another location (removes original)**

1. **Select files** using checkboxes
2. Click **➡️ X** (Move) button in toolbar
3. **Destination Picker** modal opens
4. **Select destination bucket**
5. **Navigate to folder** (optional)
6. Click **📍 Move here**
7. Files are moved
8. Toast notification confirms success

### Destination Picker

- **Bucket List** - Shows only buckets you can write to
- **Folder Browser** - Navigate into folders
- **← Back** - Go to parent folder or bucket list
- **Copy/Move here** - Confirm destination
- **Cancel** - Close without action

**Tips**:
- ✅ Copy to create backups
- ✅ Move to reorganize files
- ✅ Works across different buckets
- ✅ Works across different AWS accounts
- ✅ Bulk operations supported

---

## Deleting Files

### Delete Confirmation

**Apple-style modal** (not a browser prompt):
- Shows file name or count
- Type "delete" to confirm
- Cannot be undone warning

### Single File Delete

1. Click **🗑️ (Delete)** button next to file
2. **Delete modal** appears
3. Type **"delete"** in the text box
4. Click **Delete** button
5. File is deleted
6. Toast notification confirms

### Multiple File Delete

1. **Select files** using checkboxes
2. Click **🗑️ X** (Delete) button in toolbar
3. **Delete modal** appears
4. Type **"delete"** in the text box
5. Click **Delete** button
6. All selected files are deleted
7. Toast notification confirms

**Important**:
- ⚠️ Deletion is permanent
- ⚠️ Must type "delete" exactly
- ⚠️ Only available with Write permission

---

## Search & Sort

### Search

**Search bar** (top of file list):
- Type to filter files and folders
- Case-insensitive
- Searches current folder only
- Shows "X of Y items" when filtering

### Sort Options

**Sort dropdown** with options:
- **Name (A-Z)** - Alphabetical ascending (default)
- **Name (Z-A)** - Alphabetical descending
- **Size (Smallest)** - Smallest files first
- **Size (Largest)** - Largest files first
- **Date (Oldest)** - Oldest files first
- **Date (Newest)** - Newest files first

**Note**: Folders always sort by name, files sort by selected option.

---

## View Modes

### Grid View (⊞) - Default

- **Cards with large icons**
- **Visual and spacious**
- **Good for browsing**
- **Shows file preview icons**

### List View (☰)

- **Compact rows**
- **Shows more items at once**
- **Good for finding specific files**
- **Shows detailed information**

### Toggle

Click **⊞** or **☰** buttons (next to search bar) to switch views.

**Preference is saved** - Your choice persists across sessions.

---

## Dark Mode

### Toggle Dark Mode

Click **🌙** (moon) or **☀️** (sun) icon in header.

### Dark Mode Features

- **Pure black background** (#000000)
- **Dark gray cards** (#1c1c1e)
- **White text** for readability
- **Adjusted colors** for better contrast
- **All modals support dark mode**
- **Smooth transitions**

### Preference

Dark mode preference is **saved to your browser** - stays enabled across sessions.

---

## Understanding Permissions

### Read Permission (🔵 Blue Badge)

**You can**:
- ✅ View bucket
- ✅ Browse folders
- ✅ See all files
- ✅ Download files
- ✅ Search and sort

**You cannot**:
- ❌ Upload files
- ❌ Delete files
- ❌ Copy/Move files to this bucket

### Write Permission (🟠 Orange Badge)

**You can**:
- ✅ Everything from Read permission
- ✅ Upload files
- ✅ Delete files
- ✅ Copy files to this bucket
- ✅ Move files to this bucket

### Group-Based Access

Your permissions are determined by your **IAM Identity Center groups**:
- Groups like `AWS-s3-browser-finance`
- Groups like `AWS-s3-browser-datalake-read`
- Multiple groups = combined permissions

**To request access**: Contact your team lead or IT administrator.

---

## Troubleshooting

### Login Issues

**Problem**: Can't log in
**Solutions**:
- ✅ Verify email and password
- ✅ Check if assigned to S3 Browser application
- ✅ Contact IT support

### Display Issues

**Problem**: Text not readable in dark mode
**Solutions**:
- ✅ Refresh the page (F5)
- ✅ Toggle dark mode off and on
- ✅ Clear browser cache

**Problem**: Buttons or text widely spaced
**Solutions**:
- ✅ Refresh the page
- ✅ Try a different browser
- ✅ Clear browser cache

### Upload Issues

**Problem**: Upload fails
**Solutions**:
- ✅ Check internet connection
- ✅ Verify file size (very large files may timeout)
- ✅ Try uploading fewer files at once
- ✅ Check if you have Write permission

**Problem**: Can't find Upload button
**Solutions**:
- ✅ Check if bucket has Write permission (🟠 badge)
- ✅ Request write access from administrator

### Download Issues

**Problem**: Download fails
**Solutions**:
- ✅ Check available disk space
- ✅ Try again
- ✅ Check browser download settings
- ✅ Try different browser

**Problem**: ZIP download for multiple files fails
**Solutions**:
- ✅ Try downloading fewer files
- ✅ Download files individually
- ✅ Check internet connection

### Copy/Move Issues

**Problem**: Can't copy/move files
**Solutions**:
- ✅ Verify you have Write permission to destination bucket
- ✅ Check if files are selected
- ✅ Try with fewer files

**Problem**: Destination bucket not showing
**Solutions**:
- ✅ Only buckets with Write permission appear
- ✅ Request access to destination bucket

### Delete Issues

**Problem**: Delete button missing
**Solutions**:
- ✅ Check if you have Write permission
- ✅ Request write access from administrator

**Problem**: Can't type "delete" in modal
**Solutions**:
- ✅ Click in the text box first
- ✅ Type exactly "delete" (lowercase)
- ✅ No extra spaces

---

## Frequently Asked Questions

### General

**Q: What's new in version 2.0?**
A: 
- Multi-file upload with drag-and-drop
- Copy and move functionality
- Dark mode
- Grid/List view toggle
- Search and sort
- Folder navigation
- Apple-style delete confirmation
- ZIP downloads for multiple files

**Q: Is my data secure?**
A: Yes! All data is encrypted, access-controlled, and audited.

**Q: Can I use this on mobile?**
A: Yes! Fully responsive design works on all devices.

### Files & Folders

**Q: Can I create folders?**
A: Folders are created automatically when you upload files with paths. Use the upload page and include folder names in file paths.

**Q: Can I rename files?**
A: Not directly. Download, rename locally, and re-upload.

**Q: What's the file size limit?**
A: No hard limit, but very large files (>5GB) may take time to upload.

**Q: Can I upload folders?**
A: Not directly. Upload files individually or use the multi-file upload.

### Copy & Move

**Q: What's the difference between copy and move?**
A:
- **Copy** - Creates duplicate, keeps original
- **Move** - Transfers file, removes original

**Q: Can I copy between different AWS accounts?**
A: Yes! As long as you have Write permission to the destination bucket.

**Q: What happens if a file with the same name exists?**
A: The file will be overwritten in the destination.

### Dark Mode

**Q: Does dark mode save battery?**
A: On OLED screens, yes! Pure black pixels are turned off.

**Q: Can I schedule dark mode?**
A: Not currently. Toggle manually as needed.

### Performance

**Q: Why is the first load slow?**
A: Fetching buckets from multiple AWS accounts takes 2-3 seconds. Subsequent loads are cached.

**Q: How long are files cached?**
A: Bucket list is cached for 60 seconds. File lists are not cached.

---

## Keyboard Shortcuts

Currently, the application uses mouse/touch interactions. Keyboard shortcuts may be added in future versions.

---

## Tips for Best Experience

### Do's ✅

- ✅ Use Google Chrome for best performance
- ✅ Enable dark mode for night work
- ✅ Use grid view for browsing, list view for finding
- ✅ Search before scrolling through long lists
- ✅ Upload multiple files at once
- ✅ Use copy for backups, move for organization
- ✅ Select multiple files for bulk operations
- ✅ Log out when done

### Don'ts ❌

- ❌ Don't close browser during uploads
- ❌ Don't delete files without confirmation
- ❌ Don't share login credentials
- ❌ Don't upload sensitive data to wrong buckets
- ❌ Don't leave session unattended

---

## Getting Help

### In-App Help

Click the **? (Help)** button (bottom right) for:
- Quick guides
- Feature explanations
- Troubleshooting tips
- Support contact

### Support Contacts

**For technical issues**:
- IT Support team
- Slack: #it-support

**For access requests**:
- Your team lead or manager

---

## Version Information

**Application Version**: 2.0
**Last Updated**: March 6, 2026
**Manual Version**: 2.0

**Major Changes from v1.0**:
- Multi-file upload with drag-and-drop
- Copy and move functionality
- Dark mode support
- Grid/List view toggle
- Search and sort features
- Folder navigation with breadcrumbs
- Apple-style modals
- ZIP downloads for multiple files
- Improved UI/UX with Apple design language

---

**Happy Palawan Day!** 🌴

For the latest updates, visit the application or contact IT support.
