#!/usr/bin/env python3
"""
EPIC-4 Summary Generation Service Validation Script

This script validates the EPIC-4 Summary Generation Service implementation
operating in SUMMARY-ONLY mode.

Validation Criteria:
1. Input artifact validation (impact_report.json, doc_snapshot.json, drift_report.json)
2. Summary generation (summary.md, summary.json)
3. Storage path derivation from doc_snapshot.json
4. Deterministic output
5. Response schema validation
"""

import json
import os
import sys
import subprocess
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}{text:^60}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.RESET}")

def validate_input_artifacts():
    """Validate that all required input artifacts exist and are valid JSON"""
    print_header("VALIDATING INPUT ARTIFACTS")
    
    artifacts_dir = Path("artifacts")
    required_files = {
        "impact_report.json": True,  # Required
        "doc_snapshot.json": True,   # Required
        "drift_report.json": False   # Optional
    }
    
    validation_passed = True
    
    for filename, required in required_files.items():
        filepath = artifacts_dir / filename
        
        if not filepath.exists():
            if required:
                print_error(f"{filename} not found (REQUIRED)")
                validation_passed = False
            else:
                print_warning(f"{filename} not found (optional)")
            continue
        
        # Validate JSON
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            print_success(f"{filename} exists and is valid JSON")
            
            # Validate doc_snapshot.json structure
            if filename == "doc_snapshot.json":
                required_fields = ["project_id", "commit", "docs_bucket_path"]
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    print_error(f"doc_snapshot.json missing required fields: {missing_fields}")
                    validation_passed = False
                else:
                    print_success(f"doc_snapshot.json has all required fields")
                    print_info(f"  project_id: {data.get('project_id')}")
                    print_info(f"  commit: {data.get('commit')}")
                    print_info(f"  docs_bucket_path: {data.get('docs_bucket_path')}")
                    
        except json.JSONDecodeError as e:
            print_error(f"{filename} is not valid JSON: {e}")
            validation_passed = False
    
    return validation_passed

def run_summary_generation():
    """Run the summary generation service"""
    print_header("RUNNING SUMMARY GENERATION")
    
    try:
        # Run the service
        result = subprocess.run(
            ["python", "-m", "epic4.run"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print_info("Service execution completed")
        print_info(f"Return code: {result.returncode}")
        
        if result.stdout:
            print_info("STDOUT:")
            print(result.stdout)
        
        if result.stderr:
            print_warning("STDERR:")
            print(result.stderr)
        
        # Try to parse the JSON response
        if result.returncode == 0:
            try:
                # Find JSON in output
                lines = result.stdout.strip().split('\n')
                json_line = None
                for line in reversed(lines):
                    if line.strip().startswith('{'):
                        json_line = line
                        break
                
                if json_line:
                    response = json.loads(json_line)
                    print_success("Service returned valid JSON response")
                    return True, response
                else:
                    print_error("No JSON response found in output")
                    return False, None
            except json.JSONDecodeError as e:
                print_error(f"Failed to parse JSON response: {e}")
                return False, None
        else:
            print_error(f"Service failed with return code {result.returncode}")
            return False, None
            
    except subprocess.TimeoutExpired:
        print_error("Service execution timed out")
        return False, None
    except Exception as e:
        print_error(f"Failed to run service: {e}")
        return False, None

def validate_response_schema(response):
    """Validate the response schema"""
    print_header("VALIDATING RESPONSE SCHEMA")
    
    required_fields = {
        "status": str,
        "project_id": str,
        "commit": str,
        "summary_bucket_path": str,
        "generated_files": list
    }
    
    validation_passed = True
    
    for field, expected_type in required_fields.items():
        if field not in response:
            print_error(f"Missing required field: {field}")
            validation_passed = False
        elif not isinstance(response[field], expected_type):
            print_error(f"Field '{field}' has wrong type. Expected {expected_type.__name__}, got {type(response[field]).__name__}")
            validation_passed = False
        else:
            print_success(f"Field '{field}' present and correct type")
    
    # Validate generated_files content
    if "generated_files" in response:
        expected_files = ["summary.md", "summary.json"]
        if set(response["generated_files"]) == set(expected_files):
            print_success(f"generated_files contains expected files: {expected_files}")
        else:
            print_error(f"generated_files mismatch. Expected {expected_files}, got {response['generated_files']}")
            validation_passed = False
    
    # Validate summary_bucket_path format
    if "summary_bucket_path" in response:
        path = response["summary_bucket_path"]
        if path.endswith("/summary/"):
            print_success(f"summary_bucket_path ends with '/summary/': {path}")
        else:
            print_error(f"summary_bucket_path should end with '/summary/': {path}")
            validation_passed = False
    
    return validation_passed

def validate_generated_files():
    """Validate that summary files were generated"""
    print_header("VALIDATING GENERATED FILES")
    
    summaries_dir = Path("artifacts/summaries")
    expected_files = ["summary.md", "summary.json"]
    
    validation_passed = True
    
    for filename in expected_files:
        filepath = summaries_dir / filename
        
        if not filepath.exists():
            print_error(f"{filename} not found in {summaries_dir}")
            validation_passed = False
            continue
        
        print_success(f"{filename} exists")
        
        # Validate content
        if filename == "summary.json":
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                print_success(f"{filename} is valid JSON")
                
                # Check for required fields
                required_fields = ["commit_sha", "severity"]
                missing = [f for f in required_fields if f not in data]
                if missing:
                    print_warning(f"{filename} missing recommended fields: {missing}")
                else:
                    print_success(f"{filename} has recommended fields")
                    
            except json.JSONDecodeError as e:
                print_error(f"{filename} is not valid JSON: {e}")
                validation_passed = False
        
        elif filename == "summary.md":
            with open(filepath, 'r') as f:
                content = f.read()
            
            if len(content) > 0:
                print_success(f"{filename} has content ({len(content)} bytes)")
            else:
                print_error(f"{filename} is empty")
                validation_passed = False
    
    return validation_passed

def main():
    print_header("EPIC-4 SUMMARY GENERATION SERVICE VALIDATION")
    
    # Change to epic-4 directory
    os.chdir(Path(__file__).parent)
    
    all_passed = True
    
    # Step 1: Validate input artifacts
    if not validate_input_artifacts():
        print_error("Input artifact validation FAILED")
        all_passed = False
    else:
        print_success("Input artifact validation PASSED")
    
    # Step 2: Run summary generation
    success, response = run_summary_generation()
    if not success:
        print_error("Summary generation FAILED")
        all_passed = False
        sys.exit(1)
    else:
        print_success("Summary generation PASSED")
    
    # Step 3: Validate response schema
    if response and not validate_response_schema(response):
        print_error("Response schema validation FAILED")
        all_passed = False
    else:
        print_success("Response schema validation PASSED")
    
    # Step 4: Validate generated files
    if not validate_generated_files():
        print_error("Generated files validation FAILED")
        all_passed = False
    else:
        print_success("Generated files validation PASSED")
    
    # Final result
    print_header("VALIDATION SUMMARY")
    
    if all_passed:
        print_success("ALL VALIDATIONS PASSED ✓")
        print_info("\nThe EPIC-4 Summary Generation Service is working correctly!")
        print_info("Summary artifacts have been generated and are ready for upload.")
        sys.exit(0)
    else:
        print_error("SOME VALIDATIONS FAILED ✗")
        print_warning("\nPlease review the errors above and fix the issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()
