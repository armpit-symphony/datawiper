#!/usr/bin/env python3
"""
Backend API Testing Suite
Tests the FastAPI backend endpoints for basic functionality
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env file
BACKEND_URL = "https://wipefix.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_api_root():
    """Test the root API endpoint"""
    print("Testing GET /api/ ...")
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ Root endpoint working correctly")
                return True
            else:
                print("❌ Root endpoint returned unexpected response")
                return False
        else:
            print(f"❌ Root endpoint failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Root endpoint request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Root endpoint test error: {e}")
        return False

def test_status_get():
    """Test GET /api/status endpoint"""
    print("\nTesting GET /api/status ...")
    try:
        response = requests.get(f"{API_BASE}/status", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            print("✅ GET /api/status working correctly")
            return True
        else:
            print(f"Response: {response.text}")
            print(f"❌ GET /api/status failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ GET /api/status request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ GET /api/status test error: {e}")
        return False

def test_status_post():
    """Test POST /api/status endpoint"""
    print("\nTesting POST /api/status ...")
    try:
        test_data = {
            "client_name": "test_client_smoke_test"
        }
        
        response = requests.post(
            f"{API_BASE}/status", 
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            # Validate response structure
            if all(key in data for key in ["id", "client_name", "timestamp"]):
                if data["client_name"] == test_data["client_name"]:
                    print("✅ POST /api/status working correctly")
                    return True
                else:
                    print("❌ POST /api/status returned incorrect client_name")
                    return False
            else:
                print("❌ POST /api/status response missing required fields")
                return False
        else:
            print(f"Response: {response.text}")
            print(f"❌ POST /api/status failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ POST /api/status request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ POST /api/status test error: {e}")
        return False

def run_backend_smoke_test():
    """Run all backend smoke tests"""
    print("=" * 60)
    print("BACKEND SMOKE TEST SUITE")
    print("=" * 60)
    print(f"Testing backend at: {API_BASE}")
    print(f"Timestamp: {datetime.now()}")
    print("=" * 60)
    
    results = []
    
    # Test root endpoint
    results.append(("Root API", test_api_root()))
    
    # Test status endpoints
    results.append(("GET Status", test_status_get()))
    results.append(("POST Status", test_status_post()))
    
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend smoke tests PASSED!")
        return True
    else:
        print("⚠️  Some backend smoke tests FAILED!")
        return False

if __name__ == "__main__":
    success = run_backend_smoke_test()
    sys.exit(0 if success else 1)