FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt flask gunicorn

# Copy application files
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1

# Expose port for Flask API
EXPOSE 5000

# Default command - run Flask API
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "300", "api:app"]
