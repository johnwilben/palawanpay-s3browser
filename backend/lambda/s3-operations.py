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

def process_account(account_config):
    """Process single account in parallel"""
    account_id = account_config['account']
    role_arn = account_config['role']
    buckets = []
    
    try:
        s3_client = get_s3_client(role_arn)
        buckets_response = s3_client.list_buckets()
        
        for bucket in buckets_response.get('Buckets', []):
            buckets.append({
                'name': bucket['Name'],
                'account': account_id,
                'canRead': True,
                'canWrite': True
            })
    except Exception as e:
        print(f"Error accessing account {account_id}: {str(e)}")
    
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
    all_buckets = []
    
    # Process all accounts in parallel
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(process_account, config) for config in CROSS_ACCOUNT_ROLES]
        
        for future in as_completed(futures):
            try:
                buckets = future.result()
                all_buckets.extend(buckets)
            except Exception as e:
                print(f"Error processing account: {str(e)}")
    
    return response(200, {'buckets': all_buckets})

def list_objects(bucket, event):
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
        
        try:
            s3_client.put_object(Bucket=bucket, Key='.permission-test', Body=b'')
            s3_client.delete_object(Bucket=bucket, Key='.permission-test')
            can_write = True
        except:
            can_write = False
    except:
        can_read = False
    
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
