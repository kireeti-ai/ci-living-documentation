#!/bin/bash

# EPIC-3 Drift Detection Engine - Quick Start Script

set -e

echo "=========================================="
echo "EPIC-3 Drift Detection Engine Setup"
echo "=========================================="

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Dependencies installed"

# Create necessary directories
mkdir -p inputs outputs logs
echo "✓ Directories created"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found"
    echo "Creating .env from example..."
    cp .env.example .env
    echo "✓ .env file created - please configure your R2 credentials"
    echo ""
    echo "Edit .env and add your R2 credentials:"
    echo "  - R2_ACCESS_KEY_ID"
    echo "  - R2_SECRET_ACCESS_KEY"
    echo "  - R2_ENDPOINT_URL"
    echo "  - R2_BUCKET_NAME"
else
    echo "✓ .env file found"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To start the server:"
echo "  python main.py"
echo ""
echo "Or use uvicorn directly:"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "To run standalone analysis:"
echo "  python run_drift.py"
echo ""
echo "API Documentation will be available at:"
echo "  http://localhost:8000/docs"
echo ""
