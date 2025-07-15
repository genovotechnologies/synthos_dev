"""
AWS Lambda Handler for Synthos FastAPI Backend
Adapts FastAPI for serverless deployment using Mangum
"""

import os
import logging
from mangum import Mangum
from app.main import app

# Configure logging for Lambda
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the Lambda handler
lambda_handler = Mangum(
    app,
    lifespan="off",  # Disable lifespan for Lambda
    api_gateway_base_path="/prod",  # API Gateway stage
)

def handler(event, context):
    """
    AWS Lambda entry point
    """
    try:
        # Log the incoming event for debugging
        logger.info(f"Received event: {event}")
        
        # Handle the request using Mangum
        response = lambda_handler(event, context)
        
        logger.info(f"Response status: {response.get('statusCode', 'unknown')}")
        return response
        
    except Exception as e:
        logger.error(f"Lambda handler error: {e}")
        return {
            "statusCode": 500,
            "body": f"Internal server error: {str(e)}",
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }
        } 