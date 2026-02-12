"""
Quick test to verify all imports work correctly
"""

def test_imports():
    """Test that all required modules can be imported."""
    print("Testing imports...")
    print("-" * 60)
    
    tests = []
    
    # Test 1: Config
    try:
        from config import settings
        print("[OK] config.settings imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] config.settings failed: {e}")
        tests.append(False)
    
    # Test 2: Main modules
    try:
        from drift.code_index import load_code_index
        print("[OK] drift.code_index imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.code_index failed: {e}")
        tests.append(False)
    
    try:
        from drift.doc_index import extract_symbols_from_markdown
        print("[OK] drift.doc_index imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.doc_index failed: {e}")
        tests.append(False)
    
    try:
        from drift.severity import assign_severity
        print("[OK] drift.severity imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.severity failed: {e}")
        tests.append(False)
    
    try:
        from drift.report import build_drift_report
        print("[OK] drift.report imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.report failed: {e}")
        tests.append(False)
    
    try:
        from drift.storage import R2StorageClient
        print("[OK] drift.storage imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.storage failed: {e}")
        tests.append(False)
    
    # Test 3: Comparators
    try:
        from drift.comparators.symbol_drift import detect_symbol_drift
        print("[OK] drift.comparators.symbol_drift imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.comparators.symbol_drift failed: {e}")
        tests.append(False)
    
    try:
        from drift.comparators.api_drift import detect_api_drift
        print("[OK] drift.comparators.api_drift imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.comparators.api_drift failed: {e}")
        tests.append(False)
    
    try:
        from drift.comparators.schema_drift import detect_schema_drift
        print("[OK] drift.comparators.schema_drift imported")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] drift.comparators.schema_drift failed: {e}")
        tests.append(False)
    
    # Test 4: FastAPI (if available)
    try:
        import fastapi
        print("[OK] fastapi available")
        tests.append(True)
    except Exception as e:
        print(f"[FAIL] fastapi not installed: {e}")
        print("  -> Run: pip install -r requirements.txt")
        tests.append(False)
    
    print("-" * 60)
    passed = sum(tests)
    total = len(tests)
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("[SUCCESS] ALL IMPORTS WORKING! You can now run: python main.py")
        return True
    else:
        print("[ERROR] SOME IMPORTS FAILED - See errors above")
        return False


if __name__ == "__main__":
    success = test_imports()
    exit(0 if success else 1)