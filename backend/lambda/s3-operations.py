import json
import boto3
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor, as_completed

s3 = boto3.client('s3')
sts = boto3.client('sts')
identitystore = boto3.client('identitystore')
sso_admin = boto3.client('sso-admin')

# IAM Identity Center configuration
# TODO: Update these values
IDENTITY_STORE_ID = 'd-XXXXXXXXXX'  # Your Identity Store ID
IAM_IDENTITY_CENTER_INSTANCE_ARN = 'arn:aws:sso:::instance/ssoins-XXXXXXXXXX'

# Cross-account configuration
CROSS_ACCOUNT_ROLES = [
    {'account': 'PRIMARY_ACCOUNT_ID', 'role': None},
    {'account': '730335474290', 'role': 'arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole'},
    {'account': '684538810129', 'role': 'arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole'}
]

# Group-based bucket access
GROUP_BUCKET_ACCESS = {
    's3-browser-admin': ['*'],
    's3-browser-datalake': ['datalake-*', 'pgcdatalake-*'],
    's3-browser-test': ['test-*', 'testing-*'],
    's3-browser-finance': ['finance-*', 'accounting-*'],
    's3-browser-reports': ['report-*', 'ppay-report-*']
}

def get_user_email(event):
    """Extract user email from Cognito token"""
    try:
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        claims = authorizer.get('claims', {})
        email = claims.get('email') or claims.get('cognito:username', '')
        if email.startswith('IAMIdentityCenter_'):
            email = email.replace('IAMIdentityCenter_', '')
        return email
    except Exception as e:
        print(f"Error extracting email: {str(e)}")
        return None

def get_user_groups_from_identity_center(email):
    """Get user's groups from IAM Identity Center"""
    try:
        # Find user by email
        users = identitystore.list_users(
            IdentityStoreId=IDENTITY_STORE_ID,
            Filters=[{'AttributePath': 'UserName', 'AttributeValue': email}]
        )
        
        if not users.get('Users'):
            print(f"User {email} not found in Identity Center")
            return []
        
        user_id = users['Users'][0]['UserId']
        
        # Get user's group memberships
        memberships = identitystore.list_group_memberships_for_member(
            IdentityStoreId=IDENTITY_STORE_ID,
            MemberId={'UserId': user_id}
        )
        
        groups = []
        for membership in memberships.get('GroupMemberships', []):
            group_id = membership['GroupId']
            group = identitystore.describe_group(
                IdentityStoreId=IDENTITY_STORE_ID,
                GroupId=group_id
            )
            groups.append(group['DisplayName'])
        
        print(f"User {email} groups: {groups}")
        return groups
        
    except Exception as e:
        print(f"Error getting groups from Identity Center: {str(e)}")
        return []

def is_bucket_allowed_for_user(bucket_name, user_groups):
    """Check if user's groups allow access to bucket"""
    for group in user_groups:
        if group not in GROUP_BUCKET_ACCESS:
            continue
        
        patterns = GROUP_BUCKET_ACCESS[group]
        for pattern in patterns:
            if pattern == '*':
                return True
            if pattern.endswith('*') and bucket_name.startswith(pattern[:-1]):
                return True
            if bucket_name == pattern:
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
        
        for bucket in buckets_response.get('Buckets', []):
            bucket_name = bucket['Name']
            
            # Check if user's groups allow this bucket
            if not is_bucket_allowed_for_user(bucket_name, user_groups):
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
    
    # Get user's groups from IAM Identity Center
    user_groups = get_user_groups_from_identity_center(user_email)
    if not user_groups:
        return response(403, {'error': f'User {user_email} has no groups assigned. Contact administrator.'})
    
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
    user_groups = get_user_groups_from_identity_center(user_email)
    
    if not is_bucket_allowed_for_user(bucket, user_groups):
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
    
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_identity_center(user_email)
    
    if not is_bucket_allowed_for_user(bucket, user_groups):
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
    # Get user's groups
    user_email = get_user_email(event)
    user_groups = get_user_groups_from_identity_center(user_email)
    
    if not is_bucket_allowed_for_user(bucket, user_groups):
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
