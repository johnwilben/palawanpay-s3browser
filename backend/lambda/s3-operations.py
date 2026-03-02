import json
import boto3
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
sts = boto3.client('sts')

# Cross-account configuration
CROSS_ACCOUNT_ROLES = [
    {'account': '821276124335', 'role': None},  # Current account
    {'account': '730335474290', 'role': 'arn:aws:iam::730335474290:role/S3BrowserCrossAccountRole'},
    {'account': '684538810129', 'role': 'arn:aws:iam::684538810129:role/S3BrowserCrossAccountRole'}
]

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
    
    for account_config in CROSS_ACCOUNT_ROLES:
        account_id = account_config['account']
        role_arn = account_config['role']
        
        try:
            if role_arn:
                # Assume cross-account role
                assumed_role = sts.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName='S3BrowserSession'
                )
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=assumed_role['Credentials']['AccessKeyId'],
                    aws_secret_access_key=assumed_role['Credentials']['SecretAccessKey'],
                    aws_session_token=assumed_role['Credentials']['SessionToken']
                )
            else:
                # Use current account credentials
                s3_client = s3
            
            buckets_response = s3_client.list_buckets()
            
            for bucket in buckets_response.get('Buckets', []):
                bucket_name = bucket['Name']
                permissions = check_permissions(bucket_name, s3_client)
                
                if permissions['canRead'] or permissions['canWrite']:
                    all_buckets.append({
                        'name': bucket_name,
                        'account': account_id,
                        'canRead': permissions['canRead'],
                        'canWrite': permissions['canWrite']
                    })
        except Exception as e:
            print(f"Error accessing account {account_id}: {str(e)}")
            continue
    
    return response(200, {'buckets': all_buckets})

def list_objects(bucket, event):
    permissions = check_permissions(bucket)
    
    if not permissions['canRead']:
        return response(403, {'error': 'No read access'})
    
    objects_response = s3.list_objects_v2(Bucket=bucket)
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
    permissions = check_permissions(bucket)
    
    if not permissions['canWrite']:
        return response(403, {'error': 'No write access'})
    
    body = json.loads(event.get('body', '{}'))
    file_name = body.get('fileName')
    file_type = body.get('fileType', 'application/octet-stream')
    
    presigned_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': bucket, 'Key': file_name, 'ContentType': file_type},
        ExpiresIn=3600
    )
    
    return response(200, {'uploadUrl': presigned_url})

def generate_download_url(bucket, event):
    permissions = check_permissions(bucket)
    
    if not permissions['canRead']:
        return response(403, {'error': 'No read access'})
    
    key = event.get('queryStringParameters', {}).get('key')
    
    presigned_url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
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
