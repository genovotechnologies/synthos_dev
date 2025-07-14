"""
Synthos Redis Configuration
High-performance caching and session management
"""

import json
import pickle
from typing import Any, Optional, Union
import redis.asyncio as redis
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Redis connection pool
redis_pool = None
redis_client = None


async def init_redis():
    """Initialize Redis/Valkey connection pool"""
    global redis_pool, redis_client
    
    try:
        cache_url = settings.CACHE_URL
        cache_type = "Valkey" if "valkey://" in cache_url or settings.VALKEY_URL else "Redis"
        
        logger.info(f"Initializing {cache_type} connection...", url=cache_url.split('@')[-1] if '@' in cache_url else cache_url)
        
        redis_pool = redis.ConnectionPool.from_url(
            cache_url,
            max_connections=20,
            retry_on_timeout=True,
            decode_responses=True,
            # Additional settings for AWS ElastiCache
            socket_connect_timeout=5,
            socket_timeout=5,
            health_check_interval=30,
        )
        
        redis_client = redis.Redis(connection_pool=redis_pool)
        
        # Test connection
        await redis_client.ping()
        
        # Log cache backend info
        info = await redis_client.info()
        server_version = info.get('redis_version', 'unknown')
        
        logger.info(
            f"{cache_type} connection initialized successfully",
            server_version=server_version,
            cache_backend=settings.CACHE_BACKEND
        )
    except Exception as e:
        logger.error(f"Failed to initialize cache connection", error=str(e))
        raise


async def get_redis() -> redis.Redis:
    """Get Redis/Valkey client instance"""
    if redis_client is None:
        await init_redis()
    
    if redis_client is None:
        raise RuntimeError("Failed to initialize cache client")
    
    return redis_client

# Alias for clarity
get_cache_client = get_redis
get_redis_client = get_redis


class CacheManager:
    """Advanced caching with Redis"""
    
    def __init__(self):
        self.client = None
        self.default_ttl = settings.REDIS_CACHE_TTL
    
    async def _get_client(self) -> redis.Redis:
        """Get Redis client with lazy initialization"""
        if self.client is None:
            self.client = await get_redis()
        return self.client
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            client = await self._get_client()
            value = await client.get(key)
            
            if value is None:
                return None
            
            # Try to deserialize as JSON first, then pickle
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                try:
                    return pickle.loads(value.encode('latin1'))
                except (pickle.PickleError, UnicodeDecodeError):
                    return value
                    
        except Exception as e:
            logger.error("Cache get failed", key=key, error=str(e))
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache"""
        try:
            client = await self._get_client()
            
            # Serialize value
            if isinstance(value, (dict, list, tuple)):
                serialized_value = json.dumps(value)
            elif isinstance(value, (str, int, float, bool)):
                serialized_value = value
            else:
                serialized_value = pickle.dumps(value).decode('latin1')
            
            ttl = ttl or self.default_ttl
            await client.setex(key, ttl, serialized_value)
            
            return True
            
        except Exception as e:
            logger.error("Cache set failed", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            client = await self._get_client()
            result = await client.delete(key)
            return bool(result)
        except Exception as e:
            logger.error("Cache delete failed", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            client = await self._get_client()
            result = await client.exists(key)
            return bool(result)
        except Exception as e:
            logger.error("Cache exists check failed", key=key, error=str(e))
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter in cache"""
        try:
            client = await self._get_client()
            result = await client.incrby(key, amount)
            return result
        except Exception as e:
            logger.error("Cache increment failed", key=key, error=str(e))
            return None
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration time for key"""
        try:
            client = await self._get_client()
            result = await client.expire(key, ttl)
            return bool(result)
        except Exception as e:
            logger.error("Cache expire failed", key=key, error=str(e))
            return False
    
    async def get_pattern(self, pattern: str) -> list:
        """Get all keys matching pattern"""
        try:
            client = await self._get_client()
            keys = await client.keys(pattern)
            return keys
        except Exception as e:
            logger.error("Cache pattern search failed", pattern=pattern, error=str(e))
            return []
    
    async def clear_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            client = await self._get_client()
            keys = await client.keys(pattern)
            if keys:
                result = await client.delete(*keys)
                return result
            return 0
        except Exception as e:
            logger.error("Cache pattern clear failed", pattern=pattern, error=str(e))
            return 0


class SessionManager:
    """Session management with Redis"""
    
    def __init__(self):
        self.cache = CacheManager()
        self.session_ttl = 24 * 60 * 60  # 24 hours
    
    def _session_key(self, session_id: str) -> str:
        """Generate session key"""
        return f"session:{session_id}"
    
    async def create_session(self, session_id: str, data: dict) -> bool:
        """Create new session"""
        key = self._session_key(session_id)
        return await self.cache.set(key, data, ttl=self.session_ttl)
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data"""
        key = self._session_key(session_id)
        return await self.cache.get(key)
    
    async def update_session(self, session_id: str, data: dict) -> bool:
        """Update session data"""
        key = self._session_key(session_id)
        return await self.cache.set(key, data, ttl=self.session_ttl)
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session"""
        key = self._session_key(session_id)
        return await self.cache.delete(key)
    
    async def extend_session(self, session_id: str) -> bool:
        """Extend session expiration"""
        key = self._session_key(session_id)
        return await self.cache.expire(key, self.session_ttl)


# Global instances
cache_manager = CacheManager()
session_manager = SessionManager() 