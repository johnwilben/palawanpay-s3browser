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

# Load bucket access configuration
import os
config_path = os.path.join(os.path.dirname(__file__), 'bucket-access-config.json')
with open(config_path, 'r') as f:
    BUCKET_ACCESS_CONFIG = json.load(f)

def get_user_email(event):
    """Extract user email from Cognito token"""
    try:
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        claims = authorizer.get('claims', {})
        
        # Try different email fields
        email = claims.get('email') or claims.get('cognito:username', '')
        
        # Remove IAMIdentityCenter_ prefix if present
        if email.startswith('IAMIdentityCenter_'):
            email = email.replace('IAMIdentityCenter_', '')
        
        print(f"User email: {email}")
        return email
    except Exception as e:
        print(f"Error extracting user email: {str(e)}")
        return None

def is_bucket_allowed_for_user(bucket_name, user_email):
    """Check if user is allowed to see this bucket"""
    if not user_email:
        return False
    
    # Get user's allowed buckets
    user_config = BUCKET_ACCESS_CONFIG.get('users', {}).get(user_email)
    if not user_config:
        print(f"User {user_email} not found in config")
        return False
    
    allowed_patterns = user_config.get('allowedBuckets', [])
    
    for pattern in allowed_patterns:
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

def process_account(account_config, user_email):
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
            
            # Check if user is allowed to see this bucket
            if not is_bucket_allowed_for_user(bucket_name, user_email):
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
                print(f"Bucket {bucket_name}: Allowed for {user_email}")
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
    # Get user email from Cognito token
    user_email = get_user_email(event)
    
    if not user_email:
        return response(403, {'error': 'Unable to identify user'})
    
    # Check if user is in config
    if user_email not in BUCKET_ACCESS_CONFIG.get('users', {}):
        return response(403, {'error': f'User {user_email} not authorized. Contact administrator.'})
    
    all_buckets = []
    
    # Process all accounts in parallel
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(process_account, config, user_email) for config in CROSS_ACCOUNT_ROLES]
        
        for future in as_completed(futures):
            try:
                buckets = future.result()
                all_buckets.extend(buckets)
            except Exception as e:
                print(f"Error processing account: {str(e)}")
    
    return response(200, {'buckets': all_buckets})

def list_objects(bucket, event):
    # Check if user has access to this bucket
    user_email = get_user_email(event)
    if not is_bucket_allowed_for_user(bucket, user_email):
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
    user_email = get_user_email(event)
    if not is_bucket_allowed_for_user(bucket, user_email):
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
    user_email = get_user_email(event)
    if not is_bucket_allowed_for_user(bucket, user_email):
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
