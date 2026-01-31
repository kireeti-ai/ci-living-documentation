"""
Code Change Detector - REST API
Flask web service for analyzing code changes
"""

import json
import os
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify
import subprocess
import sys

app = Flask(__name__)

# Configuration
REPORTS_DIR = Path('/tmp/code-detector-reports')
REPORTS_DIR.mkdir(exist_ok=True)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Code Change Detector API",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze a repository

    Request Body:
    {
        "repo_url": "https://github.com/owner/repo",
        "github_token": "optional_token",
        "branch": "main"
    }
    """
    try:
        # Validate request
        data = request.json or {}
        repo_url = data.get('repo_url')

        if not repo_url:
            return jsonify({"error": "repo_url is required"}), 400

        github_token = data.get('github_token', os.environ.get('GITHUB_TOKEN'))
        branch = data.get('branch', 'main')

        # Build command
        cmd = ['python', 'main.py', repo_url]
        if github_token:
            cmd.append(github_token)
        cmd.append(branch)

        # Run analysis with timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )

        if result.returncode != 0:
            return jsonify({
                "error": "Analysis failed",
                "details": result.stderr
            }), 500

        # Parse JSON output (prefer full stdout, fallback to impact_report.json)
        report = None

        stdout_text = result.stdout.strip()
        if stdout_text:
            try:
                report = json.loads(stdout_text)
            except json.JSONDecodeError:
                report = None

        if not report:
            output_path = os.path.join(os.path.dirname(__file__), 'impact_report.json')
            if os.path.exists(output_path):
                try:
                    with open(output_path, 'r') as f:
                        report = json.load(f)
                except json.JSONDecodeError:
                    report = None

        if not report:
            return jsonify({"error": "Failed to parse analysis output"}), 500

        return jsonify({
            "status": "success",
            "report": report
        })

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Analysis timeout (> 5 minutes)"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze/local', methods=['POST'])
def analyze_local():
    """
    Analyze a local repository path

    Request Body:
    {
        "repo_path": "/path/to/local/repo"
    }
    """
    try:
        data = request.json or {}
        repo_path = data.get('repo_path')

        if not repo_path:
            return jsonify({"error": "repo_path is required"}), 400

        if not os.path.exists(repo_path):
            return jsonify({"error": "Repository path does not exist"}), 404

        # Build command
        cmd = ['python', 'main.py', repo_path]

        # Run analysis
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )

        if result.returncode != 0:
            return jsonify({
                "error": "Analysis failed",
                "details": result.stderr
            }), 500

        # Parse JSON output (prefer full stdout, fallback to impact_report.json)
        report = None

        stdout_text = result.stdout.strip()
        if stdout_text:
            try:
                report = json.loads(stdout_text)
            except json.JSONDecodeError:
                report = None

        if not report:
            output_path = os.path.join(os.path.dirname(__file__), 'impact_report.json')
            if os.path.exists(output_path):
                try:
                    with open(output_path, 'r') as f:
                        report = json.load(f)
                except json.JSONDecodeError:
                    report = None

        if not report:
            return jsonify({"error": "Failed to parse analysis output"}), 500

        return jsonify({
            "status": "success",
            "report": report
        })

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Analysis timeout (> 5 minutes)"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
