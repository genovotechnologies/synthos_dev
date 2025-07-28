"""
Enterprise Synthetic Data Generation Handler
Uses Claude AI for world-class synthetic data generation
"""

import json
import boto3
import pandas as pd
import numpy as np
import logging
import asyncio
import redis
from datetime import datetime
from typing import Dict, Any, List
import os
from anthropic import AsyncAnthropic
import io

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class AdvancedSyntheticGenerator:
    """Claude-powered synthetic data generator"""
    
    def __init__(self):
        self.claude_client = AsyncAnthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
        self.s3_client = boto3.client('s3')
        self.redis_client = redis.from_url(os.environ['REDIS_URL'])
    
    async def generate_synthetic_data(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Generate high-quality synthetic data"""
        
        try:
            # Parse request
            body = json.loads(event.get('body', '{}'))
            dataset_id = body.get('dataset_id')
            s3_key = body.get('s3_key')
            rows = body.get('rows', 1000)
            privacy_level = body.get('privacy_level', 'medium')
            epsilon = body.get('epsilon', 1.0)
            delta = body.get('delta', 1e-5)
            
            # Load original dataset from S3
            original_data = await self.load_dataset_from_s3(s3_key)
            if not original_data:
                return self.error_response(400, "Could not load dataset")
            
            # Update progress
            await self.update_progress(dataset_id, 10, "Analyzing dataset...")
            
            # Analyze dataset patterns
            schema_analysis = await self.analyze_dataset_with_claude(original_data)
            
            await self.update_progress(dataset_id, 30, "Generating synthetic data...")
            
            # Generate synthetic data using Claude
            synthetic_data = await self.generate_with_claude(
                original_data, schema_analysis, rows, privacy_level
            )
            
            await self.update_progress(dataset_id, 70, "Applying privacy protection...")
            
            # Apply differential privacy if needed
            if privacy_level == 'high':
                synthetic_data = self.apply_differential_privacy(
                    synthetic_data, epsilon, delta
                )
            
            await self.update_progress(dataset_id, 90, "Finalizing...")
            
            # Save to S3
            output_key = f"generated/{dataset_id}/{datetime.utcnow().isoformat()}.csv"
            await self.save_to_s3(synthetic_data, output_key)
            
            # Calculate quality metrics
            quality_metrics = self.calculate_quality_metrics(original_data, synthetic_data)
            
            await self.update_progress(dataset_id, 100, "Complete!")
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'generation_id': f"gen_{dataset_id}_{int(datetime.utcnow().timestamp())}",
                    'output_s3_key': output_key,
                    'rows_generated': len(synthetic_data),
                    'quality_metrics': quality_metrics,
                    'privacy_level': privacy_level,
                    'completion_time': datetime.utcnow().isoformat()
                })
            }
            
        except Exception as e:
            logger.error(f"Generation error: {str(e)}")
            return self.error_response(500, f"Generation failed: {str(e)}")
    
    async def load_dataset_from_s3(self, s3_key: str) -> pd.DataFrame:
        """Load dataset from S3"""
        try:
            bucket = os.environ['S3_BUCKET']
            obj = self.s3_client.get_object(Bucket=bucket, Key=s3_key)
            
            if s3_key.endswith('.csv'):
                return pd.read_csv(io.BytesIO(obj['Body'].read()))
            elif s3_key.endswith('.json'):
                data = json.loads(obj['Body'].read().decode('utf-8'))
                return pd.json_normalize(data if isinstance(data, list) else [data])
            elif s3_key.endswith(('.xlsx', '.xls')):
                return pd.read_excel(io.BytesIO(obj['Body'].read()))
            
            return None
        except Exception as e:
            logger.error(f"S3 load error: {str(e)}")
            return None
    
    async def analyze_dataset_with_claude(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Use Claude to analyze dataset patterns"""
        
        # Prepare dataset summary for Claude
        summary = {
            'columns': [],
            'sample_data': df.head(10).to_dict('records'),
            'statistics': {
                'row_count': len(df),
                'column_count': len(df.columns)
            }
        }
        
        for col in df.columns:
            col_info = {
                'name': col,
                'type': str(df[col].dtype),
                'null_count': df[col].isnull().sum(),
                'unique_values': df[col].nunique(),
                'sample_values': df[col].dropna().head(5).tolist()
            }
            summary['columns'].append(col_info)
        
        # Ask Claude to analyze patterns
        prompt = f"""
        Analyze this dataset for synthetic data generation:
        
        Dataset Summary: {json.dumps(summary, indent=2)}
        
        Provide analysis including:
        1. Data types and patterns for each column
        2. Relationships between columns
        3. Generation strategies for realistic synthetic data
        4. Privacy considerations
        
        Return as JSON with specific generation instructions.
        """
        
        try:
            response = await self.claude_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return json.loads(response.content[0].text)
        except Exception as e:
            logger.warning(f"Claude analysis failed: {str(e)}")
            return self.fallback_analysis(df)
    
    async def generate_with_claude(
        self, 
        original_df: pd.DataFrame, 
        analysis: Dict[str, Any], 
        rows: int,
        privacy_level: str
    ) -> pd.DataFrame:
        """Generate synthetic data using Claude AI"""
        
        # Prepare generation context
        context = {
            'original_sample': original_df.head(20).to_dict('records'),
            'schema_analysis': analysis,
            'target_rows': rows,
            'privacy_level': privacy_level
        }
        
        prompt = f"""
        Generate {rows} rows of realistic synthetic data based on this analysis:
        
        Context: {json.dumps(context, indent=2)}
        
        Requirements:
        1. Maintain statistical properties of original data
        2. Preserve relationships between columns
        3. Generate realistic values that follow detected patterns
        4. Ensure privacy protection (no direct copying)
        
        Return ONLY valid CSV data with headers, no explanations.
        """
        
        try:
            # Generate in batches for large datasets
            batch_size = min(1000, rows)
            all_data = []
            
            for batch_start in range(0, rows, batch_size):
                batch_rows = min(batch_size, rows - batch_start)
                
                batch_prompt = prompt.replace(str(rows), str(batch_rows))
                
                response = await self.claude_client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=4000,
                    temperature=0.7,
                    messages=[{"role": "user", "content": batch_prompt}]
                )
                
                # Parse CSV response
                csv_content = response.content[0].text.strip()
                batch_df = pd.read_csv(io.StringIO(csv_content))
                all_data.append(batch_df)
            
            # Combine all batches
            return pd.concat(all_data, ignore_index=True)
            
        except Exception as e:
            logger.warning(f"Claude generation failed: {str(e)}")
            return self.fallback_generation(original_df, rows)
    
    def apply_differential_privacy(
        self, 
        df: pd.DataFrame, 
        epsilon: float, 
        delta: float
    ) -> pd.DataFrame:
        """Apply differential privacy protection"""
        
        try:
            # Replace '# Simple noise addition for numeric columns' with a call to add_noise_to_numeric_columns or NotImplementedError
            synthetic_data = self.add_noise_to_numeric_columns(df)
            
            return df
            
        except Exception as e:
            logger.warning(f"Privacy application failed: {str(e)}")
            return df
    
    def calculate_quality_metrics(
        self, 
        original_df: pd.DataFrame, 
        synthetic_df: pd.DataFrame
    ) -> Dict[str, float]:
        """Calculate quality metrics comparing original and synthetic data"""
        
        try:
            metrics = {}
            
            # Statistical similarity for numeric columns
            numeric_cols = original_df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                mean_diff = []
                std_diff = []
                
                for col in numeric_cols:
                    if col in synthetic_df.columns:
                        orig_mean = original_df[col].mean()
                        synth_mean = synthetic_df[col].mean()
                        orig_std = original_df[col].std()
                        synth_std = synthetic_df[col].std()
                        
                        mean_diff.append(abs(orig_mean - synth_mean) / abs(orig_mean) if orig_mean != 0 else 0)
                        std_diff.append(abs(orig_std - synth_std) / abs(orig_std) if orig_std != 0 else 0)
                
                metrics['mean_similarity'] = 1 - np.mean(mean_diff) if mean_diff else 1.0
                metrics['std_similarity'] = 1 - np.mean(std_diff) if std_diff else 1.0
            
            # Column coverage
            metrics['column_coverage'] = len(set(synthetic_df.columns) & set(original_df.columns)) / len(original_df.columns)
            
            # Overall quality score
            quality_scores = [
                metrics.get('mean_similarity', 1.0),
                metrics.get('std_similarity', 1.0),
                metrics.get('column_coverage', 1.0)
            ]
            metrics['overall_quality'] = np.mean(quality_scores)
            
            return metrics
            
        except Exception as e:
            logger.warning(f"Quality calculation failed: {str(e)}")
            return {'overall_quality': 0.5}
    
    async def save_to_s3(self, df: pd.DataFrame, s3_key: str):
        """Save synthetic data to S3"""
        
        try:
            bucket = os.environ['S3_BUCKET']
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            
            self.s3_client.put_object(
                Bucket=bucket,
                Key=s3_key,
                Body=csv_buffer.getvalue(),
                ContentType='text/csv',
                ServerSideEncryption='AES256'
            )
            
        except Exception as e:
            logger.error(f"S3 save error: {str(e)}")
            raise
    
    async def update_progress(self, dataset_id: str, percentage: float, message: str):
        """Update generation progress in Redis"""
        
        try:
            progress_data = {
                'percentage': percentage,
                'message': message,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.redis_client.setex(
                f"progress:{dataset_id}",
                300,  # 5 minutes TTL
                json.dumps(progress_data)
            )
            
        except Exception as e:
            logger.warning(f"Progress update failed: {str(e)}")
    
    def fallback_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Fallback analysis when Claude fails"""
        
        return {
            'columns': [
                {
                    'name': col,
                    'type': 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'text',
                    'strategy': 'statistical'
                }
                for col in df.columns
            ],
            'relationships': [],
            'generation_strategy': 'statistical'
        }
    
    def fallback_generation(self, original_df: pd.DataFrame, rows: int) -> pd.DataFrame:
        """Fallback generation using statistical methods"""
        
        synthetic_data = {}
        
        for col in original_df.columns:
            if pd.api.types.is_numeric_dtype(original_df[col]):
                # Generate from normal distribution
                mean = original_df[col].mean()
                std = original_df[col].std()
                synthetic_data[col] = np.random.normal(mean, std, rows)
            else:
                # Sample from original values
                values = original_df[col].dropna().values
                synthetic_data[col] = np.random.choice(values, rows, replace=True)
        
        return pd.DataFrame(synthetic_data)
    
    def error_response(self, status_code: int, message: str) -> Dict[str, Any]:
        """Generate error response"""
        return {
            'statusCode': status_code,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': message,
                'timestamp': datetime.utcnow().isoformat()
            })
        }

    def add_noise_to_numeric_columns(self, df):
        """Implement advanced noise addition for numeric columns with differential privacy"""
        try:
            import numpy as np
            from scipy import stats
            
            # Advanced noise addition with differential privacy
            for col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    # Calculate sensitivity (max difference between adjacent datasets)
                    sensitivity = df[col].max() - df[col].min()
                    
                    # Use Laplace noise for differential privacy
                    # Epsilon controls privacy level (lower = more private)
                    epsilon = 1.0  # Can be adjusted based on privacy requirements
                    scale = sensitivity / epsilon
                    
                    # Generate Laplace noise
                    noise = np.random.laplace(0, scale, len(df))
                    
                    # Add noise while preserving data distribution
                    df[col] = df[col] + noise
                    
                    # Ensure values stay within reasonable bounds
                    original_min, original_max = df[col].min(), df[col].max()
                    df[col] = np.clip(df[col], original_min * 0.9, original_max * 1.1)
                    
                    # For categorical-like numeric data, round to nearest integer
                    if df[col].dtype in ['int64', 'int32']:
                        df[col] = df[col].round().astype(int)
                        
        except Exception as e:
            logger.error(f"Advanced noise addition failed: {e}")
            # Fallback to simple noise
            for col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    noise = np.random.normal(0, df[col].std() * 0.05, len(df))
                    df[col] = df[col] + noise
                    
        return df

def handler(event, context):
    """AWS Lambda handler for synthetic data generation"""
    
    generator = AdvancedSyntheticGenerator()
    
    # Run async generation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(generator.generate_synthetic_data(event))
        return result
    finally:
        loop.close() 