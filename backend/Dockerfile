# Synthos Backend Dockerfile - Optimized for Google Cloud Run
# Multi-stage build for production optimization

# =============================================================================
# STAGE 1: Build stage with dependencies
# =============================================================================
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# =============================================================================
# STAGE 2: Production stage optimized for Cloud Run
# =============================================================================
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"
ENV PORT=8080

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Create non-root user for security
RUN groupadd --gid 1000 synthos && \
    useradd --uid 1000 --gid synthos --shell /bin/bash --create-home synthos

# Set work directory
WORKDIR /app

# Copy application code
COPY --chown=synthos:synthos . .

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/exports && \
    chown -R synthos:synthos /app

# Switch to non-root user
USER synthos

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Cloud Run optimized command
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --access-log"]

# =============================================================================
# DEVELOPMENT STAGE (optional)
# =============================================================================
FROM production as development

USER root

# Install development dependencies
RUN pip install pytest pytest-asyncio pytest-cov black isort flake8 mypy

# Install debugging tools
RUN pip install debugpy ipdb

USER synthos

# Development command with auto-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"] 