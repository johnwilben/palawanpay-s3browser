import json
import boto3
import logging
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
sts = boto3.client('sts')
identitystore = boto3.client('identitystore')
sso_admin = boto3.client('sso-admin')

# Audit log bucket
AUDIT_BUCKET = 'palawanpay-s3browser-audit-logs'

def log_audit(event_type, user_email, bucket, key='', details=None):
    """Log audit events to S3 - consolidated per hour"""
    try:
        # Use Philippine Time (UTC+8)
        from datetime import timedelta
        timestamp = datetime.utcnow() + timedelta(hours=8)
        date_prefix = timestamp.strftime('%Y/%m/%d')
        hour = timestamp.strftime('%H')
        
        log_entry = {
            'timestamp': timestamp.isoformat(),
            'event_type': event_type,
            'user_email': user_email,
            'bucket': bucket,
            'key': key,
            'details': details or {}
        }
        
        # Consolidate logs per hour
        log_key = f'{date_prefix}/{hour}00-audit.jsonl'
        
        # Append to existing file (JSONL format - one JSON per line)
        log_line = json.dumps(log_entry) + '\n'
        
        # Get existing content if file exists
        try:
            existing = s3.get_object(Bucket=AUDIT_BUCKET, Key=log_key)
            existing_content = existing['Body'].read()
            new_content = existing_content + log_line.encode('utf-8')
        except s3.exceptions.NoSuchKey:
            new_content = log_line.encode('utf-8')
        
        # Write back
        s3.put_object(
            Bucket=AUDIT_BUCKET,
            Key=log_key,
            Body=new_content,
            ContentType='application/x-ndjson'
        )
    except Exception as e:
        logger.error(f'Failed to log audit: {str(e)}')

# IAM Identity Center configuration
IDENTITY_STORE_ID = 'd-96677c10e5'
IAM_IDENTITY_CENTER_INSTANCE_ARN = 'arn:aws:sso:::instance/ssoins-96677c10e5'

# Cross-account configuration
CROSS_ACCOUNT_ROLES = [
    {'account': '721010870103', 'role': None},  # Primary account
    {'account': '236300332446', 'role': 'arn:aws:iam::236300332446:role/S3BrowserCrossAccountRole'},
    {'account': '502174880086', 'role': 'arn:aws:iam::502174880086:role/S3BrowserCrossAccountRole'},
    {'account': '471112740803', 'role': 'arn:aws:iam::471112740803:role/S3BrowserCrossAccountRole'},
    {'account': '730335474290', 'role': 'arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole'}
]

# Group-based bucket access with permissions
# Permission levels:
#   'read' = Read-only (view/download only, no upload/delete)
#   'write' = Full access (read + write + delete)
GROUP_BUCKET_ACCESS = {
    'AWS-s3-browser-admin': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]  # Full access to all buckets
    },
    'AWS Super Administrators': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]  # Full access to all buckets
    },
    'AWS Administrators': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]  # Full access to all buckets
    },
    
    # Datalake - Read-only group
    'AWS-s3-browser-datalake-read': {
        'buckets': [
            {'pattern': 'datalake-*', 'permission': 'read'}  # Read-only to all datalake-* buckets
        ]
    },
    # Datalake - Write group
    'AWS-s3-browser-datalake-write': {
        'buckets': [
            {'pattern': 'datalake-*', 'permission': 'write'}  # Read + Write + Delete to all datalake-* buckets
        ]
    },
    
    # Finance - Mixed permissions
    'AWS-s3-browser-finance': {
        'buckets': [
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-output-common',
                'permission': 'read'  # Read-only
            },
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-athena',
                'permission': 'write',  # Read + Write + Delete
                'prefix': ''
            },
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-sandbox',
                'permission': 'write',  # Read + Write + Delete
                'prefix': ''
            },
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-staging-common',
                'permission': 'write',  # Read + Write + Delete
                'prefix': ''
            }
        ]
    },
    
    # Finance GL - Read-only to specific folder
    'AWS-s3-browser-finance-GL': {
        'buckets': [
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-raw-megalink',
                'permission': 'read',  # Read-only
                'prefix': 'megalink-wkf01/transaction-gl/'  # Only this folder
            }
        ]
    },
    
    # Archive Treasury - Write access
    'AWS-s3-browser-archive-treasury': {
        'buckets': [
            {
                'pattern': 'operations-bucket-backup-sharepoint',
                'permission': 'write'  # Read + Write + Delete
            }
        ]
    },
    
    # Visa - Read-only access
    'AWS-s3-browser-visa': {
        'buckets': [
            {
                'pattern': 'visa-report-paymentology',
                'permission': 'read'  # Read-only
            }
        ]
    },
    
    # PGC - Read-only group
    'AWS-s3-browser-pgc-read': {
        'buckets': [
            {'pattern': 'pgcdatalake-*', 'permission': 'read'}  # Read-only to all pgcdatalake-* buckets
        ]
    },
    # PGC - Write group
    'AWS-s3-browser-pgc-write': {
        'buckets': [
            {'pattern': 'pgcdatalake-*', 'permission': 'write'}  # Read + Write + Delete to all pgcdatalake-* buckets
        ]
    },
    
    # PCIC - Full access to SFTP server bucket
    'AWS-s3browser-PCIC': {
        'buckets': [
            {
                'pattern': 's3-sftpserver',
                'permission': 'write'  # Read + Write + Delete
            }
        ]
    },
    
    # Test Confluent - Read-only access to specific test bucket
    'AWS-s3-browser-test-confluent': {
        'buckets': [
            {
                'pattern': 'test-bucket-confluent-ppay',
                'permission': 'read',  # Read-only
                'account': '730335474290'
            }
        ]
    }
}

def get_user_email(event):
    """Extract user email from Cognito token"""
    try:
        # Try different event structures (API Gateway v1 vs v2)
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        
        # API Gateway v2 format
        if 'jwt' in authorizer:
            claims = authorizer.get('jwt', {}).get('claims', {})
        else:
            # API Gateway v1 format
            claims = authorizer.get('claims', {})
        
        # Try to get email from various fields
        email = (claims.get('email') or 
                claims.get('cognito:username', '') or
                claims.get('username', ''))
        
        # Remove IAMIdentityCenter_ prefix if present
        if email.startswith('IAMIdentityCenter_'):
            email = email.replace('IAMIdentityCenter_', '')
        
        logger.info(f"Extracted email: {email}")
        logger.info(f"Event structure: {json.dumps(event.get('requestContext', {}))}")
        return email
    except Exception as e:
        logger.info(f"Error extracting email: {str(e)}")
        logger.info(f"Full event: {json.dumps(event)}")
        return None

def get_user_groups_from_token(event):
    """Get user's groups from JWT token (mapped from IAM Identity Center memberOf)"""
    try:
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        claims = authorizer.get('jwt', {}).get('claims', {})
        
        # Get groups from given_name (where we mapped memberOf from SAML)
        groups_str = claims.get('given_name', '')
        
        logger.info(f"Raw groups from token: {groups_str}")
        
        # Parse the group IDs - IAM Identity Center sends comma-separated group IDs
        if isinstance(groups_str, str) and groups_str:
            # Remove brackets and split by comma
            groups_str = groups_str.strip('[]')
            group_ids = [g.strip() for g in groups_str.split(',') if g.strip()]
        else:
            group_ids = []
        
        # Resolve group IDs to group names
        group_names = []
        for group_id in group_ids:
            try:
                response = identitystore.describe_group(
                    IdentityStoreId=IDENTITY_STORE_ID,
                    GroupId=group_id
                )
                group_name = response.get('DisplayName', '')
                if group_name:
                    group_names.append(group_name)
                    logger.info(f"Resolved group ID {group_id} to name: {group_name}")
            except Exception as e:
                logger.warning(f"Failed to resolve group ID {group_id}: {str(e)}")
        
        logger.info(f"User groups: {group_names}")
        return group_names
        
    except Exception as e:
        logger.info(f"Error getting user groups from token: {str(e)}")
        return []

def get_user_permissions_for_bucket(bucket_name, user_groups, prefix=''):
    """Get highest permission level user has for a bucket and optional prefix"""
    max_permission = None
    allowed_prefix = None
    
    for group in user_groups:
        if group not in GROUP_BUCKET_ACCESS:
            continue
        
        group_config = GROUP_BUCKET_ACCESS[group]
        buckets = group_config.get('buckets', [])
        
        for bucket_rule in buckets:
            pattern = bucket_rule['pattern']
            permission = bucket_rule['permission']
            required_prefix = bucket_rule.get('prefix', '')
            
            # Check if bucket matches
            matches = False
            if pattern == '*':
                matches = True
            elif pattern.endswith('*') and bucket_name.startswith(pattern[:-1]):
                matches = True
            elif bucket_name == pattern:
                matches = True
            
            if matches:
                # If checking a specific prefix, verify it matches
                if prefix and required_prefix:
                    if not prefix.startswith(required_prefix):
                        continue
                
                # 'write' permission overrides 'read'
                if permission == 'write':
                    return {'permission': 'write', 'prefix': required_prefix}
                max_permission = 'read'
                allowed_prefix = required_prefix
    
    if max_permission:
        return {'permission': max_permission, 'prefix': allowed_prefix or ''}
    return None

def is_bucket_allowed_for_user(bucket_name, user_groups):
    """Check if user's groups allow access to bucket"""
    return get_user_permissions_for_bucket(bucket_name, user_groups) is not None

def get_s3_client(role_arn):
    """Get S3 client for account"""
    if role_arn:
        assumed_role = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName='S3BrowserSession'
        )
        return boto3.client(
            's3',
            aws_access_key_id=assumed_role['Credentials']['AccessKeyId'],
            aws_secret_access_key=assumed_role['Credentials']['SecretAccessKey'],
            aws_session_token=assumed_role['Credentials']['SessionToken']
        )
    return s3

def get_client_for_bucket(bucket):
    """Get correct S3 client for bucket by checking each account"""
    for config in CROSS_ACCOUNT_ROLES:
        try:
            s3_client = get_s3_client(config['role'])
            s3_client.head_bucket(Bucket=bucket)
            return s3_client
        except:
            continue
    return s3

def process_account(account_config, user_groups):
    """Process single account in parallel"""
    account_id = account_config['account']
    role_arn = account_config['role']
    buckets = []
    
    try:
        s3_client = get_s3_client(role_arn)
        buckets_response = s3_client.list_buckets()
        
        logger.info(f"Account {account_id}: Found {len(buckets_response.get('Buckets', []))} buckets")
        
        for bucket in buckets_response.get('Buckets', []):
            bucket_name = bucket['Name']
            
            # Get user's permission level for this bucket
            user_permission = get_user_permissions_for_bucket(bucket_name, user_groups)
            if not user_permission:
                continue
            
            # Check actual S3 permissions
            s3_permissions = check_permissions(bucket_name, s3_client)
            
            if s3_permissions['canRead']:
                # Override S3 write permission based on group permission
                can_write = s3_permissions['canWrite'] and user_permission['permission'] == 'write'
                
                bucket_info = {
                    'name': bucket_name,
                    'canRead': s3_permissions['canRead'],
                    'canWrite': can_write
                }
                
                # Add prefix restriction if exists
                if user_permission.get('prefix'):
                    bucket_info['prefix'] = user_permission['prefix']
                
                buckets.append(bucket_info)
    except Exception as e:
        logger.info(f"Error accessing account {account_id}: {str(e)}")
    
    logger.info(f"Account {account_id}: Returning {len(buckets)} accessible buckets")
    return buckets

def lambda_handler(event, context):
    # Log incoming request
    request_id = context.aws_request_id
    logger.info(f"[{request_id}] === NEW REQUEST ===")
    logger.info(f"[{request_id}] Timestamp: {datetime.utcnow().isoformat()}")
    
    path = event.get('rawPath') or event.get('path', '')
    method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod', '')
    
    logger.info(f"[{request_id}] Method: {method}, Path: {path}")
    
    # Remove stage from path if present
    if path.startswith('/prod'):
        path = path[5:]
    
    if method == 'OPTIONS':
        logger.info(f"[{request_id}] OPTIONS request - returning CORS headers")
        return response(200, {})
    
    try:
        if path == '/buckets' and method == 'GET':
            return list_buckets(event)
        elif path.startswith('/buckets/') and path.endswith('/objects') and method == 'GET':
            bucket = path.split('/')[2]
            return list_objects(bucket, event)
        elif path.startswith('/buckets/') and path.endswith('/upload') and method == 'POST':
            bucket = path.split('/')[2]
            return generate_upload_url(bucket, event)
        elif path.startswith('/buckets/') and path.endswith('/activities') and method == 'GET':
            bucket = path.split('/')[2]
            return get_recent_activities(bucket, event)
        elif path.startswith('/buckets/') and '/objects' in path and method == 'PUT':
            bucket = path.split('/')[2]
            return create_folder(bucket, event)
        elif path.startswith('/buckets/') and path.endswith('/delete') and method == 'POST':
            bucket = path.split('/')[2]
            return delete_object(bucket, event)
        elif path.startswith('/buckets/') and path.endswith('/copy') and method == 'POST':
            bucket = path.split('/')[2]
            return copy_object(bucket, event)
        elif path.startswith('/buckets/') and path.endswith('/move') and method == 'POST':
            bucket = path.split('/')[2]
            return move_object(bucket, event)
        elif path.startswith('/buckets/') and path.endswith('/download-zip') and method == 'POST':
            bucket = path.split('/')[2]
            return generate_zip_download(bucket, event)
        elif path.startswith('/buckets/') and '/download' in path and method == 'GET':
            bucket = path.split('/')[2]
            return generate_download_url(bucket, event)
        else:
            return response(404, {'error': 'Not found'})
    except Exception as e:
        return response(500, {'error': str(e)})

def list_buckets(event):
    request_id = event.get('requestContext', {}).get('requestId', 'unknown')
    
    # Get user email
    user_email = get_user_email(event)
    logger.info(f"[{request_id}] User email: {user_email}")
    
    if not user_email:
        logger.warning(f"[{request_id}] Unable to identify user - access denied")
        return response(403, {'error': 'Unable to identify user'})
    
    # Get user's groups from Cognito token
    user_groups = get_user_groups_from_token(event)
    logger.info(f"[{request_id}] User groups: {user_groups}")
    
    # Temporary: If no groups, grant admin access until groups are set up
    if not user_groups:
        logger.warning(f"[{request_id}] User {user_email} has no groups, granting temporary admin access")
        user_groups = ['s3-browser-admin']
    
    all_buckets = []
    
    logger.info(f"[{request_id}] Processing {len(CROSS_ACCOUNT_ROLES)} accounts")
    
    # Process all accounts in parallel
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(process_account, config, user_groups) for config in CROSS_ACCOUNT_ROLES]
        
        for future in as_completed(futures):
            try:
                buckets = future.result()
                all_buckets.extend(buckets)
                logger.info(f"[{request_id}] Retrieved {len(buckets)} buckets from account")
            except Exception as e:
                logger.info(f"Error processing account: {str(e)}")
    
    return response(200, {'buckets': all_buckets})

def list_objects(bucket, event):
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    user_permission = get_user_permissions_for_bucket(bucket, user_groups)
    if not user_permission:
        return response(403, {'error': 'Access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canRead']:
        return response(403, {'error': 'No read access'})
    
    # Get prefix from query params (for folder navigation)
    query_params = event.get('queryStringParameters') or {}
    current_prefix = query_params.get('prefix', '')
    
    # Apply user's restricted prefix if any
    user_prefix = user_permission.get('prefix', '')
    if user_prefix:
        # Combine user restriction with current navigation
        prefix = user_prefix + current_prefix
    else:
        prefix = current_prefix
    
    list_params = {
        'Bucket': bucket,
        'Delimiter': '/'  # This groups objects into folders
    }
    if prefix:
        list_params['Prefix'] = prefix
    
    objects_response = s3_client.list_objects_v2(**list_params)
    
    # Get folders (common prefixes)
    folders = []
    for prefix_obj in objects_response.get('CommonPrefixes', []):
        folder_name = prefix_obj['Prefix']
        if prefix:
            folder_name = folder_name[len(prefix):]  # Remove current prefix
        folders.append({
            'name': folder_name.rstrip('/'),
            'type': 'folder'
        })
    
    # Get files
    files = []
    for obj in objects_response.get('Contents', []):
        key = obj['Key']
        # Skip the prefix itself if it's a folder marker
        if key == prefix:
            continue
        # Remove current prefix from display
        display_key = key[len(prefix):] if prefix else key
        files.append({
            'key': key,
            'name': display_key,
            'size': obj['Size'],
            'lastModified': obj['LastModified'].isoformat(),
            'type': 'file'
        })
    
    can_write = permissions['canWrite'] and user_permission['permission'] == 'write'
    
    return response(200, {
        'folders': folders,
        'files': files,
        'canWrite': can_write,
        'currentPrefix': current_prefix,
        'restrictedPrefix': user_prefix
    })

def generate_upload_url(bucket, event):
    import base64
    
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    # Check if user has write permission for this bucket
    user_permission = get_user_permissions_for_bucket(bucket, user_groups)
    if not user_permission or user_permission['permission'] != 'write':
        return response(403, {'error': 'Write access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canWrite']:
        return response(403, {'error': 'No write access'})
    
    body = json.loads(event.get('body', '{}'))
    file_name = body.get('fileName')
    file_type = body.get('fileType', 'application/octet-stream')
    file_content = body.get('fileContent')
    
    # Check prefix restriction
    prefix = user_permission.get('prefix', '')
    if prefix and not file_name.startswith(prefix):
        return response(403, {'error': f'Can only upload to {prefix}'})
    
    if file_content:
        file_data = base64.b64decode(file_content)
        s3_client.put_object(
            Bucket=bucket,
            Key=file_name,
            Body=file_data,
            ContentType=file_type
        )
        log_audit('UPLOAD', user_email, bucket, file_name, {'size': len(file_data), 'type': file_type})
        return response(200, {'success': True})

def create_folder(bucket, event):
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    # Check if user has write permission for this bucket
    user_permission = get_user_permissions_for_bucket(bucket, user_groups)
    if not user_permission or user_permission['permission'] != 'write':
        return response(403, {'error': 'Write access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    
    body = json.loads(event.get('body', '{}'))
    key = body.get('key')
    
    if not key or not key.endswith('/'):
        return response(400, {'error': 'Invalid folder key'})
    
    # Check prefix restriction
    prefix = user_permission.get('prefix', '')
    if prefix and not key.startswith(prefix):
        return response(403, {'error': f'Can only create folders in {prefix}'})
    
    # Create folder by putting empty object with trailing slash
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=b''
    )
    
    log_audit('CREATE_FOLDER', user_email, bucket, key)
    return response(200, {'success': True, 'key': key})

def delete_object(bucket, event):
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    user_permission = get_user_permissions_for_bucket(bucket, user_groups)
    if not user_permission:
        return response(403, {'error': 'Access denied to this bucket'})
    
    if user_permission['permission'] != 'write':
        return response(403, {'error': 'Write access required to delete files'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canWrite']:
        return response(403, {'error': 'No write access'})
    
    body = json.loads(event.get('body', '{}'))
    key = body.get('key')
    
    if not key:
        return response(400, {'error': 'Key is required'})
    
    # Check prefix restriction
    prefix = user_permission.get('prefix', '')
    if prefix and not key.startswith(prefix):
        return response(403, {'error': f'Can only delete from {prefix}'})
    
    s3_client.delete_object(Bucket=bucket, Key=key)
    log_audit('DELETE', user_email, bucket, key)
    
    return response(200, {'success': True})

def copy_object(source_bucket, event):
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    body = json.loads(event.get('body', '{}'))
    source_key = body.get('sourceKey')
    dest_bucket = body.get('destBucket')
    dest_prefix = body.get('destPrefix', '')
    
    if not source_key or not dest_bucket:
        return response(400, {'error': 'sourceKey and destBucket are required'})
    
    # Check source permissions
    source_permission = get_user_permissions_for_bucket(source_bucket, user_groups)
    if not source_permission:
        return response(403, {'error': 'Access denied to source bucket'})
    
    # Check destination permissions
    dest_permission = get_user_permissions_for_bucket(dest_bucket, user_groups)
    if not dest_permission or dest_permission['permission'] != 'write':
        return response(403, {'error': 'Write access required to destination bucket'})
    
    # Get clients
    source_client = get_client_for_bucket(source_bucket)
    dest_client = get_client_for_bucket(dest_bucket)
    
    # Copy object
    file_name = source_key.split('/')[-1]
    dest_key = dest_prefix + file_name
    
    copy_source = {'Bucket': source_bucket, 'Key': source_key}
    dest_client.copy_object(CopySource=copy_source, Bucket=dest_bucket, Key=dest_key)
    
    log_audit('COPY', user_email, source_bucket, source_key, {'dest_bucket': dest_bucket, 'dest_key': dest_key})
    return response(200, {'success': True})

def move_object(source_bucket, event):
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    body = json.loads(event.get('body', '{}'))
    source_key = body.get('sourceKey')
    dest_bucket = body.get('destBucket')
    dest_prefix = body.get('destPrefix', '')
    
    if not source_key or not dest_bucket:
        return response(400, {'error': 'sourceKey and destBucket are required'})
    
    # Check source permissions (need write to delete)
    source_permission = get_user_permissions_for_bucket(source_bucket, user_groups)
    if not source_permission or source_permission['permission'] != 'write':
        return response(403, {'error': 'Write access required to source bucket'})
    
    # Check destination permissions
    dest_permission = get_user_permissions_for_bucket(dest_bucket, user_groups)
    if not dest_permission or dest_permission['permission'] != 'write':
        return response(403, {'error': 'Write access required to destination bucket'})
    
    # Get clients
    source_client = get_client_for_bucket(source_bucket)
    dest_client = get_client_for_bucket(dest_bucket)
    
    # Copy then delete
    file_name = source_key.split('/')[-1]
    dest_key = dest_prefix + file_name
    
    copy_source = {'Bucket': source_bucket, 'Key': source_key}
    dest_client.copy_object(CopySource=copy_source, Bucket=dest_bucket, Key=dest_key)
    source_client.delete_object(Bucket=source_bucket, Key=source_key)
    
    log_audit('MOVE', user_email, source_bucket, source_key, {'dest_bucket': dest_bucket, 'dest_key': dest_key})
    return response(200, {'success': True})

def generate_download_url(bucket, event):
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    user_permission = get_user_permissions_for_bucket(bucket, user_groups)
    if not user_permission:
        return response(403, {'error': 'Access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canRead']:
        return response(403, {'error': 'No read access'})
    
    key = event.get('queryStringParameters', {}).get('key')
    
    # Check prefix restriction
    prefix = user_permission.get('prefix', '')
    if prefix and not key.startswith(prefix):
        return response(403, {'error': f'Can only access files in {prefix}'})
    
    presigned_url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket, 
            'Key': key,
            'ResponseContentDisposition': f'attachment; filename="{key.split("/")[-1]}"'
        },
        ExpiresIn=3600
    )
    
    log_audit('DOWNLOAD', user_email, bucket, key)
    return response(200, {'downloadUrl': presigned_url})

def generate_zip_download(bucket, event):
    import zipfile
    import io
    from datetime import datetime
    
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    user_permission = get_user_permissions_for_bucket(bucket, user_groups)
    if not user_permission:
        return response(403, {'error': 'Access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canRead']:
        return response(403, {'error': 'No read access'})
    
    body = json.loads(event.get('body', '{}'))
    keys = body.get('keys', [])
    prefix = body.get('prefix', '')
    
    # If prefix is provided, list all files in that folder
    if prefix and not keys:
        try:
            list_response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)
            if 'Contents' in list_response:
                keys = [obj['Key'] for obj in list_response['Contents'] if not obj['Key'].endswith('/')]
        except Exception as e:
            logger.error(f'Failed to list objects for prefix {prefix}: {str(e)}')
            return response(500, {'error': 'Failed to list folder contents'})
    
    if not keys:
        return response(400, {'error': 'No files specified'})
    
    # Check prefix restriction
    user_prefix = user_permission.get('prefix', '')
    for key in keys:
        if user_prefix and not key.startswith(user_prefix):
            return response(403, {'error': f'Can only access files in {user_prefix}'})
    
    # Create zip in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for key in keys:
            try:
                obj = s3_client.get_object(Bucket=bucket, Key=key)
                file_content = obj['Body'].read()
                # Use just the filename, not the full path
                filename = key.split('/')[-1]
                zip_file.writestr(filename, file_content)
            except Exception as e:
                logger.error(f"Error adding {key} to zip: {str(e)}")
    
    # Upload zip to temp bucket (not user bucket)
    zip_buffer.seek(0)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    temp_bucket = 'palawanpay-s3browser-temp'
    zip_key = f'{user_email}/{timestamp}.zip'
    
    # Use default S3 client for temp bucket
    # Set expiration to 1 hour from now
    from datetime import timedelta
    expiration_time = datetime.now() + timedelta(hours=1)
    
    s3.put_object(
        Bucket=temp_bucket,
        Key=zip_key,
        Body=zip_buffer.getvalue(),
        ContentType='application/zip',
        Expires=expiration_time
    )
    
    # Generate presigned URL for the zip
    presigned_url = s3.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': temp_bucket,
            'Key': zip_key,
            'ResponseContentDisposition': f'attachment; filename="download_{timestamp}.zip"'
        },
        ExpiresIn=3600
    )
    
    log_audit('DOWNLOAD_ZIP', user_email, bucket, '', {'file_count': len(keys), 'zip_key': zip_key})
    return response(200, {'downloadUrl': presigned_url})

def check_permissions(bucket, s3_client=None):
    if s3_client is None:
        s3_client = s3
    
    can_read = False
    can_write = False
    
    try:
        s3_client.list_objects_v2(Bucket=bucket, MaxKeys=1)
        can_read = True
    except Exception as e:
        # Access denied or bucket doesn't exist
        return {'canRead': False, 'canWrite': False}
    
    try:
        s3_client.put_object(Bucket=bucket, Key='.permission-test', Body=b'')
        s3_client.delete_object(Bucket=bucket, Key='.permission-test')
        can_write = True
    except:
        can_write = False
    
    return {'canRead': can_read, 'canWrite': can_write}

def get_recent_activities(bucket, event):
    """Get recent activities for a bucket from audit logs"""
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_token(event)
    
    # Check if user has access to this bucket
    user_permission = get_user_permissions_for_bucket(bucket, user_groups)
    if not user_permission:
        return response(403, {'error': 'Access denied to this bucket'})
    
    try:
        # Get today's and yesterday's logs
        from datetime import timedelta
        activities = []
        
        for days_ago in range(2):  # Today and yesterday
            date = datetime.utcnow() - timedelta(days=days_ago)
            date_prefix = date.strftime('%Y/%m/%d')
            
            # List all hour files for this date
            try:
                result = s3.list_objects_v2(
                    Bucket=AUDIT_BUCKET,
                    Prefix=date_prefix + '/'
                )
                
                for obj in result.get('Contents', []):
                    # Download and parse each hour file
                    log_obj = s3.get_object(Bucket=AUDIT_BUCKET, Key=obj['Key'])
                    log_content = log_obj['Body'].read().decode('utf-8')
                    
                    # Parse JSONL (one JSON per line)
                    for line in log_content.strip().split('\n'):
                        if line:
                            entry = json.loads(line)
                            # Filter by bucket
                            if entry.get('bucket') == bucket:
                                activities.append(entry)
            except:
                pass  # No logs for this date
        
        # Sort by timestamp (newest first) and limit to 20
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        activities = activities[:20]
        
        return response(200, {'activities': activities})
    except Exception as e:
        logger.error(f'Failed to get activities: {str(e)}')
        return response(500, {'error': 'Failed to load activities'})

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*'
        },
        'body': json.dumps(body)
    }
