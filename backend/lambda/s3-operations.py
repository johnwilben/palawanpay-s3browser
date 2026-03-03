import json
import boto3
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor, as_completed

s3 = boto3.client('s3')
sts = boto3.client('sts')

# Cross-account configuration
# TODO: Update PRIMARY_ACCOUNT_ID before production deployment
CROSS_ACCOUNT_ROLES = [
    {'account': 'PRIMARY_ACCOUNT_ID', 'role': None},  # Primary hosting account - UPDATE THIS
    {'account': '730335474290', 'role': 'arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole'},
    {'account': '684538810129', 'role': 'arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole'}
]

# Group-based bucket access control
# Map Cognito groups to allowed bucket patterns
BUCKET_ACCESS_RULES = {
    's3-browser-admin': {
        'patterns': ['*'],  # Admin can see all buckets
        'description': 'Full access to all buckets'
    },
    's3-browser-datalake': {
        'patterns': [
            'datalake-*',
            'pgcdatalake-*'
        ],
        'description': 'Access to data lake buckets'
    },
    's3-browser-test': {
        'patterns': [
            'test-*',
            'testing-*'
        ],
        'description': 'Access to test buckets'
    },
    's3-browser-report': {
        'patterns': [
            'report-portal-*',
            'ppay-report-*'
        ],
        'description': 'Access to report buckets'
    },
    's3-browser-readonly': {
        'patterns': ['*'],
        'readonly': True,
        'description': 'Read-only access to all buckets'
    }
}

def get_user_groups(event):
    """Extract user groups from Cognito token"""
    try:
        # Groups are in the JWT token claims
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        claims = authorizer.get('claims', {})
        
        # Cognito groups are in 'cognito:groups' claim
        groups_str = claims.get('cognito:groups', '')
        if groups_str:
            groups = groups_str.split(',') if isinstance(groups_str, str) else groups_str
            groups = [g.strip() for g in groups]
            
            # If user is authenticated via IAM Identity Center but no specific groups,
            # treat as admin for now (until SAML attribute mapping is configured)
            if len(groups) == 1 and 'IAMIdentityCenter' in groups[0]:
                print(f"User authenticated via IAM Identity Center, granting admin access")
                return ['s3-browser-admin']
            
            return groups
        
        # No groups found, check if authenticated via IAM Identity Center
        username = claims.get('cognito:username', '')
        if 'IAMIdentityCenter' in username:
            print(f"IAM Identity Center user without groups, granting admin access")
            return ['s3-browser-admin']
        
        return []
    except Exception as e:
        print(f"Error extracting user groups: {str(e)}")
        return []

def is_bucket_allowed(bucket_name, user_groups):
    """Check if user's groups allow access to this bucket"""
    if not user_groups:
        return False
    
    for group in user_groups:
        if group not in BUCKET_ACCESS_RULES:
            continue
        
        rules = BUCKET_ACCESS_RULES[group]
        patterns = rules.get('patterns', [])
        
        for pattern in patterns:
            if pattern == '*':
                return True
            
            # Simple wildcard matching
            if pattern.endswith('*'):
                prefix = pattern[:-1]
                if bucket_name.startswith(prefix):
                    return True
            elif bucket_name == pattern:
                return True
    
    return False

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
        print(f"User groups: {user_groups}")
        
        for bucket in buckets_response.get('Buckets', []):
            bucket_name = bucket['Name']
            
            # Check if user's groups allow access to this bucket
            if not is_bucket_allowed(bucket_name, user_groups):
                print(f"Bucket {bucket_name}: Access denied by group policy")
                continue
            
            # Check actual permissions
            permissions = check_permissions(bucket_name, s3_client)
            
            if permissions['canRead']:
                buckets.append({
                    'name': bucket_name,
                    'account': account_id,
                    'canRead': permissions['canRead'],
                    'canWrite': permissions['canWrite']
                })
                print(f"Bucket {bucket_name}: Allowed")
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
    # Get user groups from Cognito token
    user_groups = get_user_groups(event)
    print(f"User groups from token: {user_groups}")
    
    if not user_groups:
        return response(403, {'error': 'No groups assigned. Contact administrator.'})
    
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
    # Check if user has access to this bucket
    user_groups = get_user_groups(event)
    if not is_bucket_allowed(bucket, user_groups):
        return response(403, {'error': 'Access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canRead']:
        return response(403, {'error': 'No read access'})
    
    objects_response = s3_client.list_objects_v2(Bucket=bucket)
    objects = []
    
    for obj in objects_response.get('Contents', []):
        objects.append({
            'key': obj['Key'],
            'size': obj['Size'],
            'lastModified': obj['LastModified'].isoformat()
        })
    
    return response(200, {
        'objects': objects,
        'canWrite': permissions['canWrite']
    })

def generate_upload_url(bucket, event):
    import base64
    
    # Check if user has access to this bucket
    user_groups = get_user_groups(event)
    if not is_bucket_allowed(bucket, user_groups):
        return response(403, {'error': 'Access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canWrite']:
        return response(403, {'error': 'No write access'})
    
    body = json.loads(event.get('body', '{}'))
    file_name = body.get('fileName')
    file_type = body.get('fileType', 'application/octet-stream')
    file_content = body.get('fileContent')
    
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
    # Check if user has access to this bucket
    user_groups = get_user_groups(event)
    if not is_bucket_allowed(bucket, user_groups):
        return response(403, {'error': 'Access denied to this bucket'})
    
    s3_client = get_client_for_bucket(bucket)
    permissions = check_permissions(bucket, s3_client)
    
    if not permissions['canRead']:
        return response(403, {'error': 'No read access'})
    
    key = event.get('queryStringParameters', {}).get('key')
    
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
