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
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

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

# SQLAlchemy engine with connection pooling - use psycopg2
engine = create_engine(
    get_sync_database_url(settings.DATABASE_CONNECTION_URL),
    poolclass=QueuePool,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Validates connections before use
    echo=settings.DEBUG,  # Log SQL queries in debug mode
)

# Async engine for health checks
async_engine = create_async_engine(
    get_async_database_url(settings.DATABASE_CONNECTION_URL),
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

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
    """Database dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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