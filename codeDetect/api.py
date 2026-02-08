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
from flasgger import Swagger
import subprocess
import sys

app = Flask(__name__)
swagger = Swagger(app, config={
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec_1',
            "route": '/apispec_1.json',
            "rule_filter": lambda rule: True,  # all in
            "model_filter": lambda tag: True,  # all in
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/docs/"
})

# Configuration
REPORTS_DIR = Path('/tmp/code-detector-reports')
REPORTS_DIR.mkdir(exist_ok=True)

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    ---
    tags:
      - System
    responses:
      200:
        description: API is healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: healthy
            service:
              type: string
              example: Code Change Detector API
            timestamp:
              type: string
    """
    return jsonify({
        "status": "healthy",
        "service": "Code Change Detector API",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze a repository
    ---
    tags:
      - Analysis
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - repo_url
          properties:
            repo_url:
              type: string
              description: URL of the git repository to analyze
              example: https://github.com/owner/repo
            github_token:
              type: string
              description: GitHub Personal Access Token (optional)
            branch:
              type: string
              description: Branch to analyze
              default: main
            new_user:
              type: boolean
              description: If true, perform a full-repo baseline scan
    responses:
      200:
        description: Analysis successful
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            report:
              type: object
              description: Detailed analysis report
      400:
        description: Invalid input
      500:
        description: Internal server error
      504:
        description: Analysis timeout
    """
    try:
        # Validate request
        data = request.json or {}
        repo_url = data.get('repo_url')

        if not repo_url:
            return jsonify({"error": "repo_url is required"}), 400

        github_token = data.get('github_token', os.environ.get('GITHUB_TOKEN'))
        branch = data.get('branch', 'main')
        new_user = bool(data.get('new_user', False))

        # Build command
        cmd = ['python', 'main.py', repo_url]
        if github_token:
            cmd.append(github_token)
        cmd.append(branch)
        if new_user:
            cmd.append('--new-user')

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
    ---
    tags:
      - Analysis
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - repo_path
          properties:
            repo_path:
              type: string
              description: Local path to the repository
              example: /path/to/local/repo
            new_user:
              type: boolean
              description: If true, perform a full-repo baseline scan
    responses:
      200:
        description: Analysis successful
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            report:
              type: object
      400:
        description: Invalid input
      404:
        description: Path not found
      500:
        description: Internal server error
    """
    try:
        data = request.json or {}
        repo_path = data.get('repo_path')
        new_user = bool(data.get('new_user', False))

        if not repo_path:
            return jsonify({"error": "repo_path is required"}), 400

        if not os.path.exists(repo_path):
            return jsonify({"error": "Repository path does not exist"}), 404

        # Build command
        cmd = ['python', 'main.py', repo_path]
        if new_user:
            cmd.append('--new-user')

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
