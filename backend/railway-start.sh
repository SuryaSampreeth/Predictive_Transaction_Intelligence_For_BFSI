#!/bin/bash
# Railway Start Script for FastAPI Backend
# This script is used as an alternative start command

# Print environment info
echo "Starting Predictive Transaction Intelligence API..."
echo "Python version: $(python --version)"
echo "Port: $PORT"

# Run database migrations or setup if needed
# python -m src.scripts.setup_db

# Start the FastAPI application with uvicorn
exec uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}
