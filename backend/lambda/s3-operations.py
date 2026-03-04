import json
import boto3
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor, as_completed

s3 = boto3.client('s3')
sts = boto3.client('sts')
identitystore = boto3.client('identitystore')
sso_admin = boto3.client('sso-admin')

# IAM Identity Center configuration
IDENTITY_STORE_ID = 'd-96677c10e5'
IAM_IDENTITY_CENTER_INSTANCE_ARN = 'arn:aws:sso:::instance/ssoins-96677c10e5'

# Cross-account configuration
CROSS_ACCOUNT_ROLES = [
    {'account': 'PRIMARY_ACCOUNT_ID', 'role': None},
    {'account': '730335474290', 'role': 'arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole'},
    {'account': '684538810129', 'role': 'arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole'}
]

# Group-based bucket access with permissions
GROUP_BUCKET_ACCESS = {
    's3-browser-admin': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]
    },
    'AWS Super Administrators': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]
    },
    'AWS Administrators': {
        'buckets': [{'pattern': '*', 'permission': 'write'}]
    },
    's3-browser-datalake': {
        'buckets': [
            {'pattern': 'datalake-*', 'permission': 'write'}
        ]
    },
    's3-browser-finance': {
        'buckets': [
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-output-common',
                'permission': 'read'
            },
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-athena',
                'permission': 'write',
                'prefix': ''  # Full bucket access
            },
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-sandbox',
                'permission': 'write',
                'prefix': ''
            },
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-staging-common',
                'permission': 'write',
                'prefix': ''
            }
        ]
    },
    's3-browser-finance-GL': {
        'buckets': [
            {
                'pattern': 'datalake-uat-ap-southeast-1-502174880086-raw-megalink',
                'permission': 'read',
                'prefix': 'megalink-wkf01/transaction-gl/'  # Folder-level access
            }
        ]
    },
    's3-browser-archive-treasury': {
        'buckets': [
            {
                'pattern': 'operations-bucket-backup-sharepoint',
                'permission': 'write'
            }
        ]
    },
    's3-browser-visa': {
        'buckets': [
            {
                'pattern': 'finance-palawanpay-sharepoint-backup',
                'permission': 'write'
            }
        ]
    },
    's3-browser-pgc': {
        'buckets': [
            {'pattern': 'pgcdatalake-*', 'permission': 'write'}
        ]
    }
    },
    's3-browser-reports': {
        'patterns': ['report-*', 'ppay-report-*'],
        'permissions': 'read'  # Reports are read-only
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
        
        print(f"Extracted email: {email}")
        print(f"Event structure: {json.dumps(event.get('requestContext', {}))}")
        return email
    except Exception as e:
        print(f"Error extracting email: {str(e)}")
        print(f"Full event: {json.dumps(event)}")
        return None

def get_user_groups_from_token(event):
    """Get user's Cognito groups from JWT token"""
    try:
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        claims = authorizer.get('jwt', {}).get('claims', {})
        
        # Get cognito:groups from token
        groups_str = claims.get('cognito:groups', '[]')
        
        # Parse the groups string (it's a string representation of a list)
        if isinstance(groups_str, str):
            # Remove brackets and split by space
            groups_str = groups_str.strip('[]')
            groups = [g.strip() for g in groups_str.split() if g.strip()]
        else:
            groups = groups_str if isinstance(groups_str, list) else []
        
        # Filter out the IAM Identity Center federation group
        groups = [g for g in groups if not g.startswith('ap-southeast-1_')]
        
        print(f"User Cognito groups: {groups}")
        return groups
        
    except Exception as e:
        print(f"Error getting user groups from token: {str(e)}")
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
        
        print(f"Account {account_id}: Found {len(buckets_response.get('Buckets', []))} buckets")
        
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
        print(f"Error accessing account {account_id}: {str(e)}")
    
    print(f"Account {account_id}: Returning {len(buckets)} accessible buckets")
    return buckets

def lambda_handler(event, context):
    path = event.get('rawPath') or event.get('path', '')
    method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod', '')
    
    # Remove stage from path if present
    if path.startswith('/prod'):
        path = path[5:]
    
    if method == 'OPTIONS':
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
        elif path.startswith('/buckets/') and '/download' in path and method == 'GET':
            bucket = path.split('/')[2]
            return generate_download_url(bucket, event)
        else:
            return response(404, {'error': 'Not found'})
    except Exception as e:
        return response(500, {'error': str(e)})

def list_buckets(event):
    # Get user email
    user_email = get_user_email(event)
    if not user_email:
        return response(403, {'error': 'Unable to identify user'})
    
    # Get user's groups from Cognito token
    user_groups = get_user_groups_from_token(event)
    
    # Temporary: If no groups, grant admin access until groups are set up
    if not user_groups:
        print(f"User {user_email} has no groups, granting temporary admin access")
        user_groups = ['s3-browser-admin']
    
    all_buckets = []
    
    # Process all accounts in parallel
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(process_account, config, user_groups) for config in CROSS_ACCOUNT_ROLES]
        
        for future in as_completed(futures):
            try:
                buckets = future.result()
                all_buckets.extend(buckets)
            except Exception as e:
                print(f"Error processing account: {str(e)}")
    
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
    
    # Apply prefix filter if user has restricted access
    prefix = user_permission.get('prefix', '')
    list_params = {'Bucket': bucket}
    if prefix:
        list_params['Prefix'] = prefix
    
    objects_response = s3_client.list_objects_v2(**list_params)
    objects = []
    
    for obj in objects_response.get('Contents', []):
        objects.append({
            'key': obj['Key'],
            'size': obj['Size'],
            'lastModified': obj['LastModified'].isoformat()
        })
    
    can_write = permissions['canWrite'] and user_permission['permission'] == 'write'
    
    return response(200, {
        'objects': objects,
        'canWrite': can_write,
        'prefix': prefix  # Tell frontend about prefix restriction
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
        return response(200, {'success': True})
    
    return response(400, {'error': 'No file content'})

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
    return {'canRead': can_read, 'canWrite': can_write}

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
