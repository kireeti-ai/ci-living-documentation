#!/usr/bin/env python3
"""
EPIC-2 Backend API
Integrates with EPIC-1 to fetch impact reports and trigger documentation generation
"""
import os
import json
import requests
import subprocess
from flask import Flask, request, jsonify
from pathlib import Path

app = Flask(__name__)

# Configuration
EPIC1_URL = os.getenv("EPIC1_URL", "https://code-detect.onrender.com/analyze")
ALLOW_EPIC1_FETCH = os.getenv("ALLOW_EPIC1_FETCH", "false").lower() == "true"
INPUT_DIR = "sprint1/input"
INPUT_FILE = f"{INPUT_DIR}/impact_report.json"
EPIC2_RUNNER = os.path.join(os.path.dirname(__file__), "..", "sprint1", "src", "run_epic2.py")

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "EPIC-2 Backend",
        "epic1_endpoint": EPIC1_URL
    })

@app.route("/generate-docs", methods=["POST"])
def generate_docs():
    """
    Main endpoint to generate documentation
    1. Calls EPIC-1 to get impact analysis
    2. Saves impact report
    3. Triggers EPIC-2 documentation generation
    
    Returns:
        {
            "status": "success",
            "doc_snapshot": <doc_snapshot.json contents>
        }
    """
    try:
        payload = request.json
        
        # Validate input
        if not payload:
            return jsonify({"error": "Missing JSON payload"}), 400
        
        project_id = str(payload.get("project_id", "")).strip()
        commit_hash = str(payload.get("commit_hash", "")).strip()
        if not project_id:
            return jsonify({"error": "Missing required field: project_id"}), 400
        if not commit_hash:
            return jsonify({"error": "Missing required field: commit_hash"}), 400

        repo_url = payload.get("repo_url")
        branch = payload.get("branch", "main")
        
        impact_report = payload.get("impact_report")
        if isinstance(impact_report, dict) and "report" in impact_report and "context" in impact_report.get("report", {}):
            impact_report = impact_report["report"]
        if not impact_report:
            # Call EPIC-1 backend only when enabled and repo_url is provided.
            if ALLOW_EPIC1_FETCH and repo_url:
                print(f"📡 Calling EPIC-1 API for repo: {repo_url}, branch: {branch}")
                try:
                    response = requests.post(
                        EPIC1_URL,
                        json={
                            "repo_url": repo_url,
                            "branch": branch
                        },
                        timeout=60
                    )
                    response.raise_for_status()
                    impact_report = response.json()
                except requests.exceptions.RequestException as e:
                    print(f"❌ EPIC-1 API error: {e}")
                    return jsonify({
                        "error": "Failed to fetch impact report from EPIC-1",
                        "details": str(e)
                    }), 502
            elif os.path.exists(INPUT_FILE):
                with open(INPUT_FILE, "r", encoding="utf-8") as f:
                    impact_report = json.load(f)
            else:
                # Fallback minimal impact report to preserve generation flow.
                impact_report = {
                    "context": {
                        "repository": "unknown",
                        "branch": branch,
                        "commit_sha": commit_hash,
                        "author": "unknown"
                    },
                    "changes": [],
                    "analysis_summary": {}
                }
        
        # Ensure input directory exists
        os.makedirs(INPUT_DIR, exist_ok=True)
        
        # Save impact report JSON for EPIC-2
        try:
            with open(INPUT_FILE, "w", encoding='utf-8') as f:
                json.dump(impact_report, f, indent=2)
            print(f"✅ Saved impact report to {INPUT_FILE}")
        except Exception as e:
            print(f"❌ Error saving impact report: {e}")
            return jsonify({
                "error": "Failed to save impact report",
                "details": str(e)
            }), 500
        
        # Trigger EPIC-2 documentation generator
        try:
            print(f"🚀 Running EPIC-2 documentation generator...")
            runner_env = os.environ.copy()
            runner_env["PYTHONPATH"] = str(Path(__file__).resolve().parent.parent)
            runner_env["PROJECT_ID"] = project_id
            runner_env["COMMIT_HASH"] = commit_hash
            result = subprocess.run(
                ["python", EPIC2_RUNNER],
                capture_output=True,
                text=True,
                timeout=120,
                env=runner_env
            )
            
            if result.returncode != 0:
                print(f"❌ EPIC-2 generator failed: {result.stderr}")
                return jsonify({
                    "error": "Documentation generation failed",
                    "details": result.stderr
                }), 500
            
            print(f"✅ Documentation generated successfully")
            print(result.stdout)
            
        except subprocess.TimeoutExpired:
            return jsonify({
                "error": "Documentation generation timed out"
            }), 504
        except Exception as e:
            print(f"❌ Error running EPIC-2 generator: {e}")
            return jsonify({
                "error": "Failed to run documentation generator",
                "details": str(e)
            }), 500
        
        # Load and return the generated doc_snapshot.json
        snapshot_path = "sprint1/artifacts/docs/doc_snapshot.json"
        try:
            with open(snapshot_path, "r", encoding='utf-8') as f:
                doc_snapshot = json.load(f)
        except Exception as e:
            print(f"❌ Error loading doc_snapshot: {e}")
            return jsonify({
                "error": "Failed to load generated snapshot",
                "details": str(e)
            }), 500
        
        # Return success response with doc_snapshot
        return jsonify({
            "status": "success",
            "doc_snapshot": doc_snapshot
        }), 200
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/impact-report", methods=["POST"])
def get_impact_report():
    """
    Endpoint to fetch impact report from EPIC-1 (for compatibility)
    """
    try:
        payload = request.json
        
        if not payload or "repo_url" not in payload:
            return jsonify({"error": "Missing required field: repo_url"}), 400
        
        # Call EPIC-1 API
        response = requests.post(
            EPIC1_URL,
            json={
                "repo_url": payload.get("repo_url"),
                "branch": payload.get("branch", "main")
            },
            timeout=60
        )
        response.raise_for_status()
        
        return jsonify(response.json()), 200
    
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Failed to fetch impact report",
            "details": str(e)
        }), 502
    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    # Development server
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    print("=" * 60)
    print("EPIC-2 Backend Server")
    print("=" * 60)
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"EPIC-1 URL: {EPIC1_URL}")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=port, debug=debug)
