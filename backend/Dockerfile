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

# Verify model files are copied
RUN echo "=== Model files in container ===" && ls -la outputs/all_models/ && echo "=== Preprocessor ===" && ls -la src/preprocessing/*.pkl

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Health check using curl (more reliable)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start command with logging
CMD ["sh", "-c", "echo 'Starting API server...' && uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT} --log-level info"]
