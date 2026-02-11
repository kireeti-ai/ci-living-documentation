"""
EPIC-3 Drift Detection Validation Script
Validates the implementation against all requirements.
"""
import json
import os
from typing import Dict, Any, List
from datetime import datetime


def validate_input_artifacts() -> Dict[str, Any]:
    """Validate that input artifacts exist and have required fields."""
    findings = []
    
    # Check impact_report.json
    impact_path = "inputs/impact_report.json"
    if not os.path.exists(impact_path):
        findings.append({
            "severity": "CRITICAL",
            "finding": "impact_report.json not found",
            "location": impact_path
        })
    else:
        try:
            with open(impact_path, 'r') as f:
                impact_data = json.load(f)
            
            # Check for API endpoints
            if "api_contract" in impact_data and "endpoints" in impact_data["api_contract"]:
                endpoint_count = len(impact_data["api_contract"]["endpoints"])
                findings.append({
                    "severity": "INFO",
                    "finding": f"Found {endpoint_count} API endpoints in impact_report.json",
                    "location": "api_contract.endpoints"
                })
            else:
                findings.append({
                    "severity": "WARNING",
                    "finding": "No api_contract.endpoints found in impact_report.json",
                    "location": impact_path
                })
                
        except Exception as e:
            findings.append({
                "severity": "CRITICAL",
                "finding": f"Failed to parse impact_report.json: {str(e)}",
                "location": impact_path
            })
    
    # Check doc_snapshot.json
    doc_snapshot_path = "inputs/doc_snapshot.json"
    if not os.path.exists(doc_snapshot_path):
        findings.append({
            "severity": "CRITICAL",
            "finding": "doc_snapshot.json not found",
            "location": doc_snapshot_path
        })
    else:
        try:
            with open(doc_snapshot_path, 'r') as f:
                doc_data = json.load(f)
            
            required_fields = ['snapshot_id', 'commit', 'docs_bucket_path', 'generated_files']
            missing = [f for f in required_fields if f not in doc_data]
            
            if missing:
                findings.append({
                    "severity": "MAJOR",
                    "finding": f"Missing required fields in doc_snapshot.json: {missing}",
                    "location": doc_snapshot_path
                })
            else:
                findings.append({
                    "severity": "INFO",
                    "finding": f"doc_snapshot.json has all required fields. Bucket path: {doc_data['docs_bucket_path']}",
                    "location": doc_snapshot_path
                })
                
        except Exception as e:
            findings.append({
                "severity": "CRITICAL",
                "finding": f"Failed to parse doc_snapshot.json: {str(e)}",
                "location": doc_snapshot_path
            })
    
    return findings


def validate_drift_detection_logic() -> Dict[str, Any]:
    """Validate drift detection implementation."""
    findings = []
    
    # Check if code_index properly extracts API endpoints
    from drift.code_index import load_code_index
    
    code_data = load_code_index("inputs/impact_report.json")
    api_count = len(code_data["api_symbols"])
    all_count = len(code_data["all_symbols"])
    
    if api_count == 0 and all_count == 0:
        findings.append({
            "severity": "CRITICAL",
            "finding": "code_index.py is not extracting any symbols from impact_report.json",
            "location": "drift/code_index.py",
            "detail": "The code_index expects 'files' array with 'symbols', but impact_report.json has 'api_contract.endpoints'"
        })
    else:
        findings.append({
            "severity": "INFO",
            "finding": f"Extracted {all_count} total symbols, {api_count} API symbols",
            "location": "drift/code_index.py"
        })
    
    return findings


def validate_output_schema() -> Dict[str, Any]:
    """Validate drift_report.json schema compliance."""
    findings = []
    
    report_path = "outputs/drift_report.json"
    if not os.path.exists(report_path):
        findings.append({
            "severity": "CRITICAL",
            "finding": "drift_report.json not generated",
            "location": report_path
        })
        return findings
    
    try:
        with open(report_path, 'r') as f:
            report = json.load(f)
        
        # Check required fields per spec
        required_fields = [
            "report_id", "generated_at", "drift_detected", 
            "overall_severity", "issues", "statistics"
        ]
        
        missing = [f for f in required_fields if f not in report]
        if missing:
            findings.append({
                "severity": "MAJOR",
                "finding": f"Missing required fields in drift_report.json: {missing}",
                "location": report_path
            })
        else:
            findings.append({
                "severity": "INFO",
                "finding": "drift_report.json has all required fields",
                "location": report_path
            })
        
        # Validate issue types
        valid_issue_types = ["API_DRIFT", "SCHEMA_DRIFT", "MISSING_DOC", "VERSION_MISMATCH", 
                            "API_UNDOCUMENTED", "SCHEMA_UNDOCUMENTED", "SYMBOL_UNDOCUMENTED", 
                            "DOCUMENTATION_OBSOLETE"]
        
        if "issues" in report:
            for issue in report["issues"]:
                if "type" in issue and issue["type"] not in valid_issue_types:
                    findings.append({
                        "severity": "WARNING",
                        "finding": f"Non-standard issue type: {issue['type']}",
                        "location": "drift_report.json.issues"
                    })
        
        # Check severity classification
        if "overall_severity" in report:
            valid_severities = ["CRITICAL", "MAJOR", "MINOR", "NONE"]
            if report["overall_severity"] not in valid_severities:
                findings.append({
                    "severity": "MAJOR",
                    "finding": f"Invalid severity: {report['overall_severity']}",
                    "location": "drift_report.json.overall_severity"
                })
        
    except Exception as e:
        findings.append({
            "severity": "CRITICAL",
            "finding": f"Failed to validate drift_report.json: {str(e)}",
            "location": report_path
        })
    
    return findings


def validate_api_drift_detection() -> Dict[str, Any]:
    """Validate API drift detection specifically."""
    findings = []
    
    try:
        # Load impact report to get actual API endpoints
        with open("inputs/impact_report.json", 'r') as f:
            impact_data = json.load(f)
        
        actual_endpoints = []
        if "api_contract" in impact_data and "endpoints" in impact_data["api_contract"]:
            for endpoint in impact_data["api_contract"]["endpoints"]:
                if "normalized_key" in endpoint:
                    actual_endpoints.append(endpoint["normalized_key"])
                elif "method" in endpoint and "path" in endpoint:
                    actual_endpoints.append(f"{endpoint['method']} {endpoint['path']}")
        
        findings.append({
            "severity": "INFO",
            "finding": f"Found {len(actual_endpoints)} API endpoints in impact_report.json",
            "location": "impact_report.json.api_contract.endpoints",
            "detail": f"Sample endpoints: {actual_endpoints[:5]}"
        })
        
        # Check if drift report detected these
        with open("outputs/drift_report.json", 'r') as f:
            drift_report = json.load(f)
        
        api_drift_issues = [i for i in drift_report.get("issues", []) 
                           if i.get("type") in ["API_DRIFT", "API_UNDOCUMENTED"]]
        
        findings.append({
            "severity": "INFO" if len(api_drift_issues) > 0 else "WARNING",
            "finding": f"Drift report contains {len(api_drift_issues)} API drift issues",
            "location": "drift_report.json.issues"
        })
        
    except Exception as e:
        findings.append({
            "severity": "CRITICAL",
            "finding": f"Failed to validate API drift detection: {str(e)}",
            "location": "validate_api_drift_detection"
        })
    
    return findings


def generate_validation_report():
    """Generate comprehensive validation report."""
    print("=" * 80)
    print("EPIC-3 DRIFT DETECTION VALIDATION REPORT")
    print("=" * 80)
    print(f"Generated: {datetime.utcnow().isoformat()}Z\n")
    
    all_findings = []
    
    # Run all validations
    print("1. Validating Input Artifacts...")
    input_findings = validate_input_artifacts()
    all_findings.extend(input_findings)
    
    print("2. Validating Drift Detection Logic...")
    logic_findings = validate_drift_detection_logic()
    all_findings.extend(logic_findings)
    
    print("3. Validating Output Schema...")
    output_findings = validate_output_schema()
    all_findings.extend(output_findings)
    
    print("4. Validating API Drift Detection...")
    api_findings = validate_api_drift_detection()
    all_findings.extend(api_findings)
    
    # Categorize findings
    critical = [f for f in all_findings if f.get("severity") == "CRITICAL"]
    major = [f for f in all_findings if f.get("severity") == "MAJOR"]
    warnings = [f for f in all_findings if f.get("severity") == "WARNING"]
    info = [f for f in all_findings if f.get("severity") == "INFO"]
    
    # Print summary
    print("\n" + "=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print(f"CRITICAL Issues: {len(critical)}")
    print(f"MAJOR Issues: {len(major)}")
    print(f"WARNINGS: {len(warnings)}")
    print(f"INFO: {len(info)}")
    
    # Print detailed findings
    if critical:
        print("\n🔴 CRITICAL ISSUES:")
        for f in critical:
            print(f"  - {f['finding']}")
            print(f"    Location: {f['location']}")
            if 'detail' in f:
                print(f"    Detail: {f['detail']}")
    
    if major:
        print("\n🟠 MAJOR ISSUES:")
        for f in major:
            print(f"  - {f['finding']}")
            print(f"    Location: {f['location']}")
            if 'detail' in f:
                print(f"    Detail: {f['detail']}")
    
    if warnings:
        print("\n🟡 WARNINGS:")
        for f in warnings:
            print(f"  - {f['finding']}")
            print(f"    Location: {f['location']}")
    
    if info:
        print("\n🔵 INFO:")
        for f in info:
            print(f"  - {f['finding']}")
            if 'detail' in f:
                print(f"    Detail: {f['detail']}")
    
    # Overall status
    print("\n" + "=" * 80)
    if critical:
        overall_status = "CRITICAL_ISSUES"
        print("⛔ OVERALL STATUS: CRITICAL_ISSUES - Immediate fixes required")
    elif major:
        overall_status = "NEEDS_FIXES"
        print("⚠️  OVERALL STATUS: NEEDS_FIXES - Important issues to address")
    else:
        overall_status = "WORKING"
        print("✅ OVERALL STATUS: WORKING - Minor improvements possible")
    print("=" * 80)
    
    # Generate JSON report
    validation_result = {
        "overall_status": overall_status,
        "validation_coverage_findings": input_findings + logic_findings,
        "drift_detection_accuracy_findings": api_findings,
        "artifact_contract_findings": output_findings,
        "recommended_fixes": []
    }
    
    # Add recommended fixes
    if critical or major:
        validation_result["recommended_fixes"].append({
            "priority": "HIGH",
            "issue": "code_index.py not extracting API endpoints from impact_report.json",
            "fix": "Update code_index.py to extract endpoints from api_contract.endpoints array",
            "file": "drift/code_index.py"
        })
    
    # Save JSON report
    with open("outputs/validation_report.json", 'w') as f:
        json.dump(validation_result, f, indent=2)
    
    print(f"\n📄 Detailed validation report saved to: outputs/validation_report.json")
    
    return validation_result


if __name__ == "__main__":
    generate_validation_report()
