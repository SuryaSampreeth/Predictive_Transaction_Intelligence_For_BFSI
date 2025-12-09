# Optimized Dockerfile for Railway deployment
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy and install Python dependencies first (for caching)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application code
COPY src/ ./src/
COPY configs/ ./configs/

# Copy model files explicitly
COPY outputs/all_models/*.pkl ./outputs/all_models/
COPY outputs/all_models/*.json ./outputs/all_models/
COPY outputs/all_models/*.txt ./outputs/all_models/

# Copy preprocessor
COPY src/preprocessing/preprocessor.pkl ./src/preprocessing/

# Verify model files are copied
RUN echo "=== Model files in container ===" && ls -la outputs/all_models/ && echo "=== Preprocessor ===" && ls -la src/preprocessing/

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port (Railway will inject the actual PORT)
EXPOSE 8080

# No HEALTHCHECK - let Railway handle health checks via healthcheckPath in railway.toml

# Start command - use shell form to expand $PORT (Railway injects this)
CMD sh -c "uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info"
