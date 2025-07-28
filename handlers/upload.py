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
        'quality_score': compute_quality_score(df),
        'sample_data': df.head(5).to_dict('records')
    }

def compute_quality_score(df):
    """Calculate comprehensive data quality score 0-100 with advanced metrics"""
    try:
        import numpy as np
        from scipy import stats
        
        quality_metrics = {}
        total_score = 0
        max_possible_score = 0
        
        # 1. Completeness (20 points)
        completeness_score = 0
        for col in df.columns:
            null_percentage = df[col].isnull().sum() / len(df) * 100
            col_completeness = max(0, 100 - null_percentage)
            completeness_score += col_completeness
        completeness_score = completeness_score / len(df.columns)
        quality_metrics['completeness'] = completeness_score
        total_score += completeness_score * 0.2
        max_possible_score += 100 * 0.2
        
        # 2. Consistency (20 points)
        consistency_score = 0
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                # Check for outliers using IQR method
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                outlier_percentage = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum() / len(df) * 100
                col_consistency = max(0, 100 - outlier_percentage)
            else:
                # For categorical data, check for unusual patterns
                value_counts = df[col].value_counts()
                if len(value_counts) > 0:
                    # Check if distribution is too skewed
                    max_freq = value_counts.max() / len(df) * 100
                    col_consistency = max(0, 100 - max_freq * 0.5)  # Penalize if one value dominates
                else:
                    col_consistency = 0
            consistency_score += col_consistency
        consistency_score = consistency_score / len(df.columns)
        quality_metrics['consistency'] = consistency_score
        total_score += consistency_score * 0.2
        max_possible_score += 100 * 0.2
        
        # 3. Accuracy (20 points)
        accuracy_score = 0
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                # Check for reasonable ranges
                if col.lower() in ['age', 'years']:
                    valid_range = (0, 120)
                elif col.lower() in ['salary', 'income', 'price']:
                    valid_range = (0, 1000000)
                elif col.lower() in ['percentage', 'rate']:
                    valid_range = (0, 100)
                else:
                    # Use statistical bounds
                    mean_val = df[col].mean()
                    std_val = df[col].std()
                    valid_range = (mean_val - 3*std_val, mean_val + 3*std_val)
                
                within_range = ((df[col] >= valid_range[0]) & (df[col] <= valid_range[1])).sum() / len(df) * 100
                accuracy_score += within_range
            else:
                # For categorical data, check for valid formats
                if col.lower() in ['email']:
                    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                    valid_emails = df[col].str.match(email_pattern, na=False).sum() / len(df) * 100
                    accuracy_score += valid_emails
                elif col.lower() in ['phone', 'telephone']:
                    phone_pattern = r'^[\+]?[1-9][\d]{0,15}$'
                    valid_phones = df[col].str.match(phone_pattern, na=False).sum() / len(df) * 100
                    accuracy_score += valid_phones
                else:
                    # Generic string validation
                    non_empty = (df[col].notna() & (df[col] != '')).sum() / len(df) * 100
                    accuracy_score += non_empty
        accuracy_score = accuracy_score / len(df.columns)
        quality_metrics['accuracy'] = accuracy_score
        total_score += accuracy_score * 0.2
        max_possible_score += 100 * 0.2
        
        # 4. Timeliness (15 points)
        timeliness_score = 0
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                # Check if dates are recent
                current_date = pd.Timestamp.now()
                date_diffs = (current_date - df[col]).dt.days
                recent_dates = (date_diffs >= 0) & (date_diffs <= 365*5)  # Within 5 years
                timeliness_score += recent_dates.sum() / len(df) * 100
            else:
                # For non-date columns, assume good timeliness
                timeliness_score += 100
        timeliness_score = timeliness_score / len(df.columns)
        quality_metrics['timeliness'] = timeliness_score
        total_score += timeliness_score * 0.15
        max_possible_score += 100 * 0.15
        
        # 5. Validity (15 points)
        validity_score = 0
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                # Check for reasonable data types
                if df[col].dtype in ['int64', 'int32']:
                    # Should be integers
                    is_integer = (df[col] == df[col].astype(int)).sum() / len(df) * 100
                    validity_score += is_integer
                else:
                    # Should be floats
                    validity_score += 100
            else:
                # For categorical data, check for reasonable string lengths
                if df[col].dtype == 'object':
                    reasonable_length = (df[col].str.len() <= 255).sum() / len(df) * 100
                    validity_score += reasonable_length
                else:
                    validity_score += 100
        validity_score = validity_score / len(df.columns)
        quality_metrics['validity'] = validity_score
        total_score += validity_score * 0.15
        max_possible_score += 100 * 0.15
        
        # 6. Uniqueness (10 points)
        uniqueness_score = 0
        for col in df.columns:
            unique_ratio = df[col].nunique() / len(df)
            # Balance between too few unique values and too many
            if unique_ratio < 0.01:  # Too few unique values
                uniqueness_score += 50
            elif unique_ratio > 0.95:  # Too many unique values (might be noise)
                uniqueness_score += 80
            else:
                uniqueness_score += 100
        uniqueness_score = uniqueness_score / len(df.columns)
        quality_metrics['uniqueness'] = uniqueness_score
        total_score += uniqueness_score * 0.1
        max_possible_score += 100 * 0.1
        
        # Calculate final score
        final_score = (total_score / max_possible_score) * 100 if max_possible_score > 0 else 0
        quality_metrics['overall_score'] = final_score
        
        return final_score
        
    except Exception as e:
        logger.error(f"Quality score calculation failed: {e}")
        return 50  # Return neutral score on error

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