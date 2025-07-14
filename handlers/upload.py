"""
Enterprise Upload Handler for Synthetic Data Generation
"""

import json
import boto3
import pandas as pd
from io import BytesIO, StringIO
import logging
import uuid
import time
from datetime import datetime
import base64
import magic

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """AWS Lambda handler for file uploads"""
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            }
        }
    
    try:
        # Parse request
        body = json.loads(event.get('body', '{}'))
        file_data = body.get('file_data')  # Base64 encoded
        filename = body.get('filename')
        user_id = body.get('user_id')
        
        if not all([file_data, filename, user_id]):
            return error_response(400, "Missing required fields")
        
        # Decode file
        file_bytes = base64.b64decode(file_data)
        
        # Validate file
        if len(file_bytes) > 100 * 1024 * 1024:  # 100MB limit
            return error_response(400, "File too large")
        
        # Process file
        if filename.endswith('.csv'):
            df = pd.read_csv(StringIO(file_bytes.decode('utf-8')))
        elif filename.endswith('.json'):
            data = json.loads(file_bytes.decode('utf-8'))
            df = pd.json_normalize(data if isinstance(data, list) else [data])
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(BytesIO(file_bytes))
        else:
            return error_response(400, "Unsupported file format")
        
        # Analyze dataset
        analysis = analyze_dataset(df)
        
        # Upload to S3
        upload_id = str(uuid.uuid4())
        s3_key = f"uploads/{user_id}/{upload_id}/{filename}"
        
        s3_client = boto3.client('s3')
        s3_client.put_object(
            Bucket=context.env.get('S3_BUCKET'),
            Key=s3_key,
            Body=file_bytes,
            ServerSideEncryption='AES256'
        )
        
        # Return response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'upload_id': upload_id,
                's3_key': s3_key,
                'dataset_info': analysis,
                'timestamp': datetime.utcnow().isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return error_response(500, f"Upload failed: {str(e)}")

def analyze_dataset(df):
    """Analyze uploaded dataset"""
    
    schema = []
    for col in df.columns:
        # Detect column type
        if pd.api.types.is_numeric_dtype(df[col]):
            col_type = 'numeric'
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            col_type = 'datetime'
        else:
            col_type = 'text'
        
        # Check for PII
        col_lower = col.lower()
        is_pii = any(keyword in col_lower for keyword in [
            'email', 'phone', 'ssn', 'name', 'address', 'birth'
        ])
        
        schema.append({
            'name': col,
            'type': col_type,
            'null_count': df[col].isnull().sum(),
            'unique_values': df[col].nunique(),
            'is_pii': is_pii,
            'sample_values': df[col].dropna().head(3).tolist()
        })
    
    # Privacy recommendations
    has_pii = any(col['is_pii'] for col in schema)
    
    return {
        'row_count': len(df),
        'column_count': len(df.columns),
        'schema': schema,
        'has_pii': has_pii,
        'recommended_privacy_level': 'high' if has_pii else 'medium',
        'recommended_epsilon': 0.1 if has_pii else 1.0,
        'quality_score': calculate_quality_score(df),
        'sample_data': df.head(5).to_dict('records')
    }

def calculate_quality_score(df):
    """Calculate data quality score 0-100"""
    
    # Completeness (no nulls)
    completeness = 1 - (df.isnull().sum().sum() / (len(df) * len(df.columns)))
    
    # Uniqueness (reasonable unique values)
    uniqueness = df.nunique().mean() / len(df) if len(df) > 0 else 0
    uniqueness = min(uniqueness, 1.0)  # Cap at 1.0
    
    # Simple quality score
    quality = (completeness * 0.7 + uniqueness * 0.3) * 100
    return int(max(0, min(100, quality)))

def error_response(status_code, message):
    """Generate error response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'error': message,
            'timestamp': datetime.utcnow().isoformat()
        })
    } 