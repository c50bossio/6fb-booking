# Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.7.1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="${POETRY_HOME}/bin:${PATH}"

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Install dependencies
RUN poetry install --no-dev --no-root || \
    (pip install -r requirements.txt 2>/dev/null || \
    pip install \
        fastapi==0.104.1 \
        uvicorn==0.24.0 \
        sqlalchemy==2.0.23 \
        pydantic==2.5.0 \
        pydantic-settings==2.1.0 \
        python-jose==3.3.0 \
        passlib==1.7.4 \
        bcrypt==4.1.1 \
        python-multipart==0.0.6 \
        email-validator==2.1.0 \
        python-dotenv==1.0.0 \
        httpx==0.25.2 \
        pytest==7.4.3 \
        pytest-asyncio==0.21.1 \
        pytest-cov==4.1.0 \
        redis==5.0.1)

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]