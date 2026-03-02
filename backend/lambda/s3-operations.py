import json
import boto3
from botocore.exceptions import ClientError

s3 = boto3.client('s3')

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
    buckets_response = s3.list_buckets()
    buckets_with_permissions = []
    
    for bucket in buckets_response.get('Buckets', []):
        bucket_name = bucket['Name']
        permissions = check_permissions(bucket_name)
        
        if permissions['canRead'] or permissions['canWrite']:
            buckets_with_permissions.append({
                'name': bucket_name,
                'canRead': permissions['canRead'],
                'canWrite': permissions['canWrite']
            })
    
    return response(200, {'buckets': buckets_with_permissions})

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

def check_permissions(bucket):
    can_read = False
    can_write = False
    
    try:
        s3.list_objects_v2(Bucket=bucket, MaxKeys=1)
        can_read = True
        
        try:
            s3.put_object(Bucket=bucket, Key='.permission-test', Body=b'')
            s3.delete_object(Bucket=bucket, Key='.permission-test')
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
