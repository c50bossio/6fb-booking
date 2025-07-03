# BookedBarber V2 Celery Worker (Production)
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    C_FORCE_ROOT=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -r celeryuser && useradd -r -g celeryuser celeryuser

# Set work directory
WORKDIR /app

# Copy and install Python dependencies
COPY backend-v2/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=celeryuser:celeryuser backend-v2/ .

# Create necessary directories
RUN mkdir -p logs temp && \
    chown -R celeryuser:celeryuser logs temp && \
    chmod 755 logs temp

# Health check script
COPY --chown=celeryuser:celeryuser docker/worker/healthcheck.py /app/worker_healthcheck.py
RUN chmod +x /app/worker_healthcheck.py

# Health check for worker processes
HEALTHCHECK --interval=60s --timeout=20s --start-period=60s --retries=3 \
    CMD python /app/worker_healthcheck.py || exit 1

# Switch to non-root user
USER celeryuser

# Default command - can be overridden
CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info", "--concurrency=2", "--max-tasks-per-child=1000"]