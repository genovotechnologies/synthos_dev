"""
Synthos Database Configuration
Enterprise-grade database setup with connection pooling and migrations
"""

from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from contextlib import asynccontextmanager
from fastapi import HTTPException
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Cloud SQL Connector (optional)
try:
    from google.cloud.sql.connector import Connector, IPTypes  # type: ignore
except ImportError:  # pragma: no cover
    Connector = None
    IPTypes = None

# Update the database URL to use psycopg2 sync dialect
def get_sync_database_url(url: str) -> str:
    """Convert database URL to use psycopg2 sync dialect"""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://")
    return url


def get_async_database_url(url: str) -> str:
    """Convert database URL to use asyncpg dialect"""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://")
    elif url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
    elif url.startswith("sqlite://"):
        # Use aiosqlite driver for async SQLite connections
        return url.replace("sqlite://", "sqlite+aiosqlite://")
    return url


def _make_connector_sync_creator():
    """Returns a connection creator for SQLAlchemy using Cloud SQL Connector (pg8000)."""
    if not Connector or not settings.CLOUDSQL_INSTANCE:
        return None

    connector = Connector()

    def getconn():
        # Ensure password is properly encoded for Cloud SQL Connector
        password = settings.DB_PASSWORD
        if password:
            # Handle special characters in password
            import urllib.parse
            password = urllib.parse.quote_plus(password)
        
        try:
            return connector.connect(
                settings.CLOUDSQL_INSTANCE,
                "pg8000",
                user=settings.DB_USER,
                password=password,
                db=settings.DB_NAME,
                ip_type=IPTypes.PUBLIC,
            )
        except Exception as e:
            logger.error("Cloud SQL Connector connection failed", error=str(e))
            raise

    return getconn


def _make_connector_async_creator():
    """Return SQLAlchemy async creator using Cloud SQL Connector (asyncpg)."""
    if not Connector or not settings.CLOUDSQL_INSTANCE:
        return None

    connector = Connector()

    async def getconn():
        # Ensure password is properly encoded for Cloud SQL Connector
        password = settings.DB_PASSWORD
        if password:
            # Handle special characters in password
            import urllib.parse
            password = urllib.parse.quote_plus(password)
        
        try:
            return await connector.connect_async(
                settings.CLOUDSQL_INSTANCE,
                "asyncpg",
                user=settings.DB_USER,
                password=password,
                db=settings.DB_NAME,
                ip_type=IPTypes.PUBLIC,
            )
        except Exception as e:
            logger.error("Cloud SQL Connector async connection failed", error=str(e))
            raise

    return getconn


# Database connection strategy with multiple fallbacks
def create_database_engines():
    """Create database engines with multiple fallback strategies"""
    engines_created = False
    
    # Log current configuration
    logger.info("=== Database Connection Strategy ===")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Use Cloud SQL Connector: {settings.USE_CLOUD_SQL_CONNECTOR}")
    logger.info(f"Cloud SQL Instance: {settings.CLOUDSQL_INSTANCE}")
    logger.info(f"DB User: {settings.DB_USER}")
    logger.info(f"DB Name: {settings.DB_NAME}")
    logger.info(f"Database URL configured: {bool(settings.DATABASE_CONNECTION_URL)}")
    
    # Strategy 1: Try Cloud SQL Connector if configured
    if (settings.USE_CLOUD_SQL_CONNECTOR and 
        settings.CLOUDSQL_INSTANCE and 
        settings.DB_USER and 
        settings.DB_PASSWORD and 
        settings.DB_NAME and 
        Connector):
        
        try:
            logger.info("🔄 Attempting Cloud SQL Connector connection...")
            
            # Test the connector first with timeout
            test_connector = Connector()
            test_conn = test_connector.connect(
                settings.CLOUDSQL_INSTANCE,
                "pg8000",
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                db=settings.DB_NAME,
                ip_type=IPTypes.PUBLIC,
            )
            test_conn.close()
            test_connector.close()
            
            # If test successful, create engines
            engine = create_engine(
                "postgresql+pg8000://",
                creator=_make_connector_sync_creator(),
                poolclass=QueuePool,
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
                pool_pre_ping=True,
                echo=settings.DEBUG,
            )

            async_engine = create_async_engine(
                "postgresql+asyncpg://",
                creator=_make_connector_async_creator(),
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
                pool_pre_ping=True,
                echo=settings.DEBUG,
            )
            
            logger.info("✅ Cloud SQL Connector engines created successfully")
            engines_created = True
            
        except Exception as e:
            logger.warning(f"❌ Cloud SQL Connector failed: {str(e)}")
            logger.warning("Falling back to direct connection...")
    
    # Strategy 2: Try direct DATABASE_URL connection
    if not engines_created and settings.DATABASE_CONNECTION_URL:
        try:
            logger.info("🔄 Attempting direct DATABASE_URL connection...")
            db_url = settings.DATABASE_CONNECTION_URL
            logger.info(f"Database URL: {db_url[:50]}...")  # Log first 50 chars for security
            
            # Test the connection first
            test_engine = create_engine(
                get_sync_database_url(db_url),
                pool_pre_ping=True,
                echo=False
            )
            with test_engine.connect() as test_conn:
                test_conn.execute(text("SELECT 1"))
            test_engine.dispose()
            
            # If test successful, create production engines
            engine = create_engine(
                get_sync_database_url(db_url),
                poolclass=QueuePool,
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
                pool_pre_ping=True,
                echo=settings.DEBUG,
            )

            async_engine = create_async_engine(
                get_async_database_url(db_url),
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
                pool_pre_ping=True,
                echo=settings.DEBUG,
            )
            
            logger.info("✅ Direct connection engines created successfully")
            engines_created = True
            
        except Exception as e:
            logger.error(f"❌ Direct connection failed: {str(e)}")
    
    # Strategy 3: Try environment-specific fallbacks
    if not engines_created:
        logger.warning("⚠️ All database connection strategies failed")
        logger.warning("Using SQLite fallback database for development")
        
        # Create engines anyway for graceful degradation
        engine = create_engine(
            "sqlite:///./synthos_fallback.db",  # SQLite fallback
            echo=settings.DEBUG,
        )
        async_engine = create_async_engine(
            "sqlite+aiosqlite:///././synthos_fallback.db",
            echo=settings.DEBUG,
        )
        logger.warning("⚠️ Using SQLite fallback database")
    
    logger.info("=== Database Connection Complete ===")
    return engine, async_engine

# Create engines with fallback strategy
engine, async_engine = create_database_engines()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


async def create_tables():
    """Create all database tables"""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error("Failed to create database tables", error=str(e))
        raise


def get_db():
    """Database dependency for FastAPI with retry logic"""
    db = None
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            db = SessionLocal()
            # Test the connection with a simple query
            db.execute(text("SELECT 1"))
            yield db
            return  # Success, exit the function
            
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {str(e)}")
            if db:
                try:
                    db.close()
                except:
                    pass
                db = None
            
            if attempt < max_retries - 1:
                import time
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                # All retries failed
                logger.error("All database connection attempts failed", error=str(e))
                raise HTTPException(
                    status_code=503,
                    detail="Database temporarily unavailable. Please try again later."
                )
        finally:
            if db:
                try:
                    db.close()
                except:
                    pass


@asynccontextmanager
async def get_db_session():
    """Async database session context manager for health checks"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


class DatabaseManager:
    """Database management utilities"""
    
    @staticmethod
    def check_connection() -> bool:
        """Check database connectivity"""
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error("Database connection failed", error=str(e))
            return False
    
    @staticmethod
    def get_db_info() -> dict:
        """Get database information"""
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT version() as version, current_database() as database")
                )
                row = result.fetchone()
                return {
                    "status": "connected",
                    "version": row.version if row else "unknown",
                    "database": row.database if row else "unknown",
                    "pool_size": getattr(engine.pool, 'size', lambda: 'unknown')() if hasattr(engine.pool, 'size') else 'unknown',
                    "checked_out": getattr(engine.pool, 'checkedout', lambda: 'unknown')() if hasattr(engine.pool, 'checkedout') else 'unknown',
                }
        except Exception as e:
            logger.error("Failed to get database info", error=str(e))
            return {"status": "error", "error": str(e)}


# Global database manager instance
db_manager = DatabaseManager() 