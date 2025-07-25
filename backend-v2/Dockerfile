# Multi-stage build for BookedBarber V2 Backend
FROM python:3.11-slim as base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    libmagic1 \
    libmagic-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with retry logic
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --retries 3 --timeout 30 -r requirements.txt

# Development stage
FROM base as development

# Copy application code
COPY . .

# Create directories for development
RUN mkdir -p /app/logs /app/uploads /app/shared

# Don't create user for development (easier debugging)
# USER root

# Expose port
EXPOSE 8000

# Development command with reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base as production

# Create non-root user for security
RUN groupadd -r bookedbarber && useradd -r -g bookedbarber bookedbarber

# Copy application code
COPY . .

# Create directories and set permissions
RUN mkdir -p /app/logs /app/uploads \
    && chown -R bookedbarber:bookedbarber /app

# Switch to non-root user
USER bookedbarber

# Expose port
EXPOSE 8000

# Health check with better error handling
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -f http://localhost:8000/health --max-time 5 || exit 1

# Default command for Kubernetes
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]