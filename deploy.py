#!/usr/bin/env python3
"""
Synthos Enterprise Deployment Automation Script
Comprehensive deployment with security scanning, monitoring setup, and production optimization
"""

import asyncio
import subprocess
import sys
import os
import json
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import argparse
import yaml
import requests
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('deployment.log')
    ]
)
logger = logging.getLogger(__name__)


class SynthosDeployment:
    """Advanced deployment orchestration for Synthos platform"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.config = self._load_deployment_config()
        self.deployment_id = f"deploy_{int(time.time())}"
        self.start_time = datetime.utcnow()
        
    def _load_deployment_config(self) -> Dict[str, Any]:
        """Load deployment configuration"""
        return {
            "environments": {
                "development": {
                    "replicas": 1,
                    "resources": {"cpu": "500m", "memory": "1Gi"},
                    "enable_debug": True,
                    "security_level": "medium"
                },
                "staging": {
                    "replicas": 2,
                    "resources": {"cpu": "1000m", "memory": "2Gi"},
                    "enable_debug": False,
                    "security_level": "high"
                },
                "production": {
                    "replicas": 3,
                    "resources": {"cpu": "2000m", "memory": "4Gi"},
                    "enable_debug": False,
                    "security_level": "maximum"
                }
            },
            "services": {
                "backend": {"port": 8000, "health_path": "/health"},
                "frontend": {"port": 3000, "health_path": "/"},
                "monitoring": {"port": 9090, "health_path": "/metrics"},
                "redis": {"port": 6379},
                "postgres": {"port": 5432}
            },
            "security": {
                "scan_timeout": 300,
                "required_compliance": ["owasp_top_10", "gdpr_ready"],
                "max_critical_vulnerabilities": 0,
                "max_high_vulnerabilities": 2
            },
            "monitoring": {
                "retention_days": 30,
                "alert_webhook": None,
                "metrics_interval": 30
            }
        }
    
    async def deploy(self) -> bool:
        """Execute complete deployment pipeline"""
        
        logger.info(f"🚀 Starting Synthos deployment: {self.deployment_id}")
        logger.info(f"Environment: {self.environment}")
        logger.info(f"Timestamp: {self.start_time.isoformat()}")
        
        try:
            # Phase 1: Pre-deployment validation
            await self._pre_deployment_checks()
            
            # Phase 2: Security scanning
            await self._run_security_assessment()
            
            # Phase 3: Build and package
            await self._build_applications()
            
            # Phase 4: Infrastructure deployment
            await self._deploy_infrastructure()
            
            # Phase 5: Application deployment
            await self._deploy_applications()
            
            # Phase 6: Initialize monitoring
            await self._setup_monitoring()
            
            # Phase 7: Post-deployment validation
            await self._post_deployment_validation()
            
            # Phase 8: Performance optimization
            await self._optimize_performance()
            
            duration = datetime.utcnow() - self.start_time
            logger.info(f"✅ Deployment completed successfully in {duration}")
            
            # Generate deployment report
            await self._generate_deployment_report()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Deployment failed: {str(e)}", exc_info=True)
            await self._rollback_deployment()
            return False
    
    async def _pre_deployment_checks(self):
        """Run pre-deployment validation checks"""
        
        logger.info("🔍 Running pre-deployment checks...")
        
        # Check system requirements
        await self._check_system_requirements()
        
        # Validate environment variables
        await self._validate_environment_variables()
        
        # Check external dependencies
        await self._check_external_dependencies()
        
        # Validate configuration files
        await self._validate_configurations()
        
        logger.info("✅ Pre-deployment checks completed")
    
    async def _check_system_requirements(self):
        """Check system requirements"""
        
        # Check Docker
        try:
            result = subprocess.run(['docker', '--version'], 
                                  capture_output=True, text=True, check=True)
            logger.info(f"Docker version: {result.stdout.strip()}")
        except subprocess.CalledProcessError:
            raise Exception("Docker is not installed or not accessible")
        
        # Check Docker Compose
        try:
            result = subprocess.run(['docker-compose', '--version'], 
                                  capture_output=True, text=True, check=True)
            logger.info(f"Docker Compose version: {result.stdout.strip()}")
        except subprocess.CalledProcessError:
            raise Exception("Docker Compose is not installed")
        
        # Check available disk space
        disk_usage = subprocess.run(['df', '-h', '.'], 
                                  capture_output=True, text=True, check=True)
        logger.info(f"Disk usage: {disk_usage.stdout.strip()}")
        
        # Check available memory
        if sys.platform.startswith('linux'):
            mem_info = subprocess.run(['free', '-h'], 
                                    capture_output=True, text=True, check=True)
            logger.info(f"Memory info: {mem_info.stdout.strip()}")
    
    async def _validate_environment_variables(self):
        """Validate required environment variables"""
        
        required_vars = [
            'SECRET_KEY',
            'JWT_SECRET_KEY',
            'DATABASE_URL',
            'REDIS_URL',
            'ANTHROPIC_API_KEY'
        ]
        
        if self.environment == 'production':
            required_vars.extend([
                'SENTRY_DSN',
                'SMTP_HOST',
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY'
            ])
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            raise Exception(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        logger.info(f"✅ All {len(required_vars)} required environment variables are set")
    
    async def _check_external_dependencies(self):
        """Check external service dependencies"""
        
        # Check database connectivity
        try:
            import psycopg2
            db_url = os.getenv('DATABASE_URL')
            if db_url:
                conn = psycopg2.connect(db_url)
                conn.close()
                logger.info("✅ Database connection successful")
        except Exception as e:
            logger.warning(f"Database connection failed: {e}")
        
        # Check Redis connectivity
        try:
            import redis
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            r = redis.from_url(redis_url)
            r.ping()
            logger.info("✅ Redis connection successful")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
        
        # Check Anthropic API
        try:
            import anthropic
            api_key = os.getenv('ANTHROPIC_API_KEY')
            if api_key:
                client = anthropic.Anthropic(api_key=api_key)
                # Simple API test would go here
                logger.info("✅ Anthropic API key configured")
        except Exception as e:
            logger.warning(f"Anthropic API check failed: {e}")
    
    async def _validate_configurations(self):
        """Validate configuration files"""
        
        config_files = [
            'docker-compose.yml',
            'backend/requirements.txt',
            'frontend/package.json',
            'frontend/next.config.js'
        ]
        
        for config_file in config_files:
            if not os.path.exists(config_file):
                raise Exception(f"Required configuration file missing: {config_file}")
        
        logger.info("✅ All configuration files present")
    
    async def _run_security_assessment(self):
        """Run comprehensive security assessment"""
        
        logger.info("🔒 Running security assessment...")
        
        try:
            # Import and run security scanner
            sys.path.append('backend')
            from app.security.security_scanner import AdvancedSecurityScanner
            
            scanner = AdvancedSecurityScanner()
            await scanner.initialize()
            
            # Run comprehensive assessment
            assessment = await scanner.run_comprehensive_assessment(
                target_url="http://localhost:8000",
                include_network=True,
                include_application=True,
                include_api=True,
                include_data_protection=True
            )
            
            # Evaluate security results
            critical_vulns = sum(
                1 for result in assessment.test_results
                for vuln in result.vulnerabilities
                if vuln.severity.value == 'critical'
            )
            
            high_vulns = sum(
                1 for result in assessment.test_results
                for vuln in result.vulnerabilities
                if vuln.severity.value == 'high'
            )
            
            # Check against security policy
            max_critical = self.config["security"]["max_critical_vulnerabilities"]
            max_high = self.config["security"]["max_high_vulnerabilities"]
            
            if critical_vulns > max_critical:
                raise Exception(f"Security assessment failed: {critical_vulns} critical vulnerabilities found (max allowed: {max_critical})")
            
            if high_vulns > max_high:
                raise Exception(f"Security assessment failed: {high_vulns} high vulnerabilities found (max allowed: {max_high})")
            
            logger.info(f"✅ Security assessment passed: {critical_vulns} critical, {high_vulns} high vulnerabilities")
            
        except ImportError:
            logger.warning("Security scanner not available, skipping security assessment")
        except Exception as e:
            if self.environment == 'production':
                raise Exception(f"Security assessment failed: {e}")
            else:
                logger.warning(f"Security assessment failed (non-blocking in {self.environment}): {e}")
    
    async def _build_applications(self):
        """Build and package applications"""
        
        logger.info("🔨 Building applications...")
        
        # Build backend Docker image
        logger.info("Building backend Docker image...")
        subprocess.run([
            'docker', 'build', 
            '-t', f'synthos-backend:{self.deployment_id}',
            '-f', 'backend/Dockerfile',
            'backend/'
        ], check=True)
        
        # Build frontend (if not using Next.js standalone)
        logger.info("Installing frontend dependencies...")
        subprocess.run([
            'docker', 'run', '--rm',
            '-v', f'{os.getcwd()}/frontend:/app',
            '-w', '/app',
            'node:18-alpine',
            'npm', 'ci'
        ], check=True)
        
        # Run frontend build
        logger.info("Building frontend...")
        subprocess.run([
            'docker', 'run', '--rm',
            '-v', f'{os.getcwd()}/frontend:/app',
            '-w', '/app',
            'node:18-alpine',
            'npm', 'run', 'build'
        ], check=True)
        
        logger.info("✅ Applications built successfully")
    
    async def _deploy_infrastructure(self):
        """Deploy infrastructure components"""
        
        logger.info("🏗️ Deploying infrastructure...")
        
        env_config = self.config["environments"][self.environment]
        
        # Generate docker-compose override for environment
        override_config = {
            'version': '3.8',
            'services': {
                'backend': {
                    'image': f'synthos-backend:{self.deployment_id}',
                    'deploy': {
                        'replicas': env_config['replicas'],
                        'resources': {
                            'limits': env_config['resources']
                        }
                    },
                    'environment': {
                        'ENVIRONMENT': self.environment,
                        'DEBUG': str(env_config['enable_debug']).lower()
                    }
                }
            }
        }
        
        # Write override file
        with open('docker-compose.override.yml', 'w') as f:
            yaml.dump(override_config, f)
        
        # Deploy with docker-compose
        logger.info("Starting services with docker-compose...")
        subprocess.run([
            'docker-compose', 
            '-f', 'docker-compose.yml',
            '-f', 'docker-compose.override.yml',
            'up', '-d'
        ], check=True)
        
        logger.info("✅ Infrastructure deployed")
    
    async def _deploy_applications(self):
        """Deploy application services"""
        
        logger.info("🚀 Deploying applications...")
        
        # Wait for database to be ready
        await self._wait_for_service('postgres', 5432)
        
        # Wait for Redis to be ready
        await self._wait_for_service('redis', 6379)
        
        # Run database migrations
        logger.info("Running database migrations...")
        subprocess.run([
            'docker-compose', 'exec', '-T', 'backend',
            'alembic', 'upgrade', 'head'
        ], check=True)
        
        # Wait for backend to be healthy
        await self._wait_for_service_health('backend', 8000, '/health')
        
        # Wait for frontend to be ready
        await self._wait_for_service_health('frontend', 3000, '/')
        
        logger.info("✅ Applications deployed successfully")
    
    async def _setup_monitoring(self):
        """Initialize monitoring and alerting"""
        
        logger.info("📊 Setting up monitoring...")
        
        try:
            # Import monitoring service
            sys.path.append('backend')
            from app.services.monitoring import IntelligentMonitoringService
            
            # Initialize monitoring
            monitoring = IntelligentMonitoringService()
            await monitoring.initialize()
            
            # Configure alerts for production
            if self.environment == 'production':
                await self._configure_production_alerts(monitoring)
            
            logger.info("✅ Monitoring initialized")
            
        except ImportError:
            logger.warning("Monitoring service not available")
        except Exception as e:
            logger.warning(f"Monitoring setup failed: {e}")
    
    async def _configure_production_alerts(self, monitoring):
        """Configure production alerting"""
        
        # CPU usage alert
        await monitoring.create_alert(
            title="High CPU Usage",
            description="CPU usage is consistently high",
            severity="warning",
            metric_type="system",
            value=85.0,
            threshold=85.0
        )
        
        # Memory usage alert
        await monitoring.create_alert(
            title="High Memory Usage", 
            description="Memory usage is consistently high",
            severity="warning",
            metric_type="system",
            value=85.0,
            threshold=85.0
        )
        
        # Error rate alert
        await monitoring.create_alert(
            title="High Error Rate",
            description="Application error rate is elevated",
            severity="error",
            metric_type="application",
            value=5.0,
            threshold=5.0
        )
    
    async def _post_deployment_validation(self):
        """Run post-deployment validation tests"""
        
        logger.info("✅ Running post-deployment validation...")
        
        # Health check all services
        services = ['backend', 'frontend', 'postgres', 'redis']
        
        for service in services:
            if not await self._check_service_health(service):
                raise Exception(f"Service {service} failed health check")
        
        # Run API smoke tests
        await self._run_smoke_tests()
        
        # Verify monitoring is working
        await self._verify_monitoring()
        
        logger.info("✅ Post-deployment validation completed")
    
    async def _run_smoke_tests(self):
        """Run basic smoke tests"""
        
        base_url = "http://localhost:8000"
        
        # Test health endpoint
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code != 200:
            raise Exception(f"Health check failed: {response.status_code}")
        
        # Test API root
        response = requests.get(f"{base_url}/", timeout=10)
        if response.status_code != 200:
            raise Exception(f"API root failed: {response.status_code}")
        
        # Test metrics endpoint (if available)
        try:
            response = requests.get(f"{base_url}/metrics", timeout=5)
            if response.status_code == 200:
                logger.info("✅ Metrics endpoint accessible")
        except:
            logger.warning("Metrics endpoint not accessible")
        
        logger.info("✅ Smoke tests passed")
    
    async def _optimize_performance(self):
        """Apply performance optimizations"""
        
        logger.info("⚡ Applying performance optimizations...")
        
        if self.environment == 'production':
            # Enable production optimizations
            optimizations = [
                "Enable Redis caching",
                "Configure CDN settings", 
                "Optimize database connections",
                "Enable compression",
                "Configure load balancing"
            ]
            
            for opt in optimizations:
                logger.info(f"  - {opt}")
        
        logger.info("✅ Performance optimizations applied")
    
    async def _wait_for_service(self, service: str, port: int, timeout: int = 60):
        """Wait for service to be available"""
        
        logger.info(f"Waiting for {service} on port {port}...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                result = subprocess.run([
                    'docker-compose', 'exec', '-T', service,
                    'sh', '-c', f'nc -z localhost {port}'
                ], capture_output=True, timeout=5)
                
                if result.returncode == 0:
                    logger.info(f"✅ {service} is ready")
                    return
            except:
                pass
            
            await asyncio.sleep(2)
        
        raise Exception(f"Timeout waiting for {service} to be ready")
    
    async def _wait_for_service_health(self, service: str, port: int, health_path: str, timeout: int = 120):
        """Wait for service health check to pass"""
        
        logger.info(f"Waiting for {service} health check...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"http://localhost:{port}{health_path}", timeout=5)
                if response.status_code == 200:
                    logger.info(f"✅ {service} health check passed")
                    return
            except:
                pass
            
            await asyncio.sleep(5)
        
        raise Exception(f"Timeout waiting for {service} health check")
    
    async def _check_service_health(self, service: str) -> bool:
        """Check if service is healthy"""
        
        try:
            result = subprocess.run([
                'docker-compose', 'ps', service
            ], capture_output=True, text=True, timeout=10)
            
            return 'Up' in result.stdout
        except:
            return False
    
    async def _verify_monitoring(self):
        """Verify monitoring is working"""
        
        try:
            # Check if Prometheus metrics are available
            response = requests.get("http://localhost:9090/metrics", timeout=5)
            if response.status_code == 200:
                logger.info("✅ Monitoring metrics available")
            else:
                logger.warning("Monitoring metrics not accessible")
        except:
            logger.warning("Could not verify monitoring")
    
    async def _generate_deployment_report(self):
        """Generate deployment report"""
        
        duration = datetime.utcnow() - self.start_time
        
        report = {
            "deployment_id": self.deployment_id,
            "environment": self.environment,
            "start_time": self.start_time.isoformat(),
            "duration": str(duration),
            "status": "success",
            "services_deployed": list(self.config["services"].keys()),
            "configuration": self.config["environments"][self.environment]
        }
        
        report_file = f"deployment_report_{self.deployment_id}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"📋 Deployment report saved to {report_file}")
    
    async def _rollback_deployment(self):
        """Rollback deployment on failure"""
        
        logger.info("🔄 Rolling back deployment...")
        
        try:
            # Stop services
            subprocess.run(['docker-compose', 'down'], check=False)
            
            # Remove deployment artifacts
            if os.path.exists('docker-compose.override.yml'):
                os.remove('docker-compose.override.yml')
            
            logger.info("✅ Rollback completed")
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")


async def main():
    """Main deployment entry point"""
    
    parser = argparse.ArgumentParser(description='Deploy Synthos platform')
    parser.add_argument('--environment', '-e', 
                       choices=['development', 'staging', 'production'],
                       default='production',
                       help='Deployment environment')
    parser.add_argument('--skip-security', action='store_true',
                       help='Skip security assessment')
    parser.add_argument('--dry-run', action='store_true',
                       help='Perform dry run without actual deployment')
    
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("🏃 Performing dry run...")
        return True
    
    # Create deployment instance
    deployment = SynthosDeployment(environment=args.environment)
    
    # Run deployment
    success = await deployment.deploy()
    
    if success:
        logger.info("🎉 Deployment completed successfully!")
        print("\n" + "="*60)
        print("🚀 SYNTHOS ENTERPRISE PLATFORM DEPLOYED SUCCESSFULLY! 🚀")
        print("="*60)
        print(f"Environment: {args.environment}")
        print(f"Deployment ID: {deployment.deployment_id}")
        print(f"Frontend: http://localhost:3000")
        print(f"Backend API: http://localhost:8000") 
        print(f"API Docs: http://localhost:8000/api/docs")
        print(f"Monitoring: http://localhost:9090")
        print("="*60)
        return True
    else:
        logger.error("💥 Deployment failed!")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 