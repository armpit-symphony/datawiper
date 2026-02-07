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

def test_broker_pack_get_latest_empty():
    """Test GET /api/broker-packs/latest when no packs exist (expect 404)"""
    print("\nTesting GET /api/broker-packs/latest (empty state) ...")
    try:
        response = requests.get(f"{API_BASE}/broker-packs/latest", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ GET /api/broker-packs/latest correctly returns 404 when no packs exist")
            return True
        else:
            print(f"Response: {response.text}")
            print(f"❌ Expected 404, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ GET /api/broker-packs/latest request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ GET /api/broker-packs/latest test error: {e}")
        return False

def test_broker_pack_post_unauthorized():
    """Test POST /api/broker-packs without authorization (expect 401)"""
    print("\nTesting POST /api/broker-packs without auth ...")
    try:
        test_data = {
            "version": "1.0.1",
            "brokers": [
                {
                    "id": "test-broker-1",
                    "name": "Test Broker",
                    "opt_out_url": "https://example.com/opt-out",
                    "form_type": "web",
                    "required_fields": ["name", "email"],
                    "verification_steps": "Email verification required",
                    "response_time": "7-14 days",
                    "follow_up_guidance": "Check email for confirmation"
                }
            ],
            "notes": "Test broker pack for API testing"
        }
        
        response = requests.post(
            f"{API_BASE}/broker-packs",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ POST /api/broker-packs correctly returns 401 without authorization")
            return True
        else:
            print(f"Response: {response.text}")
            print(f"❌ Expected 401, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ POST /api/broker-packs request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ POST /api/broker-packs test error: {e}")
        return False

def test_broker_pack_post_authorized():
    """Test POST /api/broker-packs with authorization (expect 200)"""
    print("\nTesting POST /api/broker-packs with auth ...")
    try:
        test_data = {
            "version": "1.0.1",
            "brokers": [
                {
                    "id": "acxiom-test",
                    "name": "Acxiom Test",
                    "opt_out_url": "https://isapps.acxiom.com/optout/optout.aspx",
                    "form_type": "web",
                    "required_fields": ["name", "email", "address"],
                    "verification_steps": "Email verification required within 24 hours",
                    "response_time": "7-14 business days",
                    "follow_up_guidance": "Check email for confirmation link and follow instructions"
                }
            ],
            "notes": "Test broker pack for Phase 2.1b API testing"
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer moiF9fNxbcTS7IIDlSHEaDwbGx8dJnaXb8RcN97v9Z8"
        }
        
        response = requests.post(
            f"{API_BASE}/broker-packs",
            json=test_data,
            headers=headers,
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            required_fields = ["version", "created_at", "updated_at", "brokers"]
            if all(field in data for field in required_fields):
                if data["version"] == "1.0.1" and len(data["brokers"]) == 1:
                    print("✅ POST /api/broker-packs working correctly")
                    return True
                else:
                    print("❌ POST /api/broker-packs returned incorrect data")
                    return False
            else:
                print("❌ POST /api/broker-packs response missing required fields")
                return False
        else:
            print(f"Response: {response.text}")
            print(f"❌ POST /api/broker-packs failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ POST /api/broker-packs request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ POST /api/broker-packs test error: {e}")
        return False

def test_broker_pack_get_latest_populated():
    """Test GET /api/broker-packs/latest after creating a pack (expect version 1.0.1)"""
    print("\nTesting GET /api/broker-packs/latest (after creation) ...")
    try:
        response = requests.get(f"{API_BASE}/broker-packs/latest", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("version") == "1.0.1":
                print("✅ GET /api/broker-packs/latest returns correct version 1.0.1")
                return True
            else:
                print(f"❌ Expected version 1.0.1, got {data.get('version')}")
                return False
        else:
            print(f"Response: {response.text}")
            print(f"❌ GET /api/broker-packs/latest failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ GET /api/broker-packs/latest request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ GET /api/broker-packs/latest test error: {e}")
        return False

def test_broker_pack_get_specific_version():
    """Test GET /api/broker-packs/1.0.1 (expect same content as latest)"""
    print("\nTesting GET /api/broker-packs/1.0.1 ...")
    try:
        response = requests.get(f"{API_BASE}/broker-packs/1.0.1", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("version") == "1.0.1" and len(data.get("brokers", [])) == 1:
                print("✅ GET /api/broker-packs/1.0.1 returns correct content")
                return True
            else:
                print("❌ GET /api/broker-packs/1.0.1 returned incorrect content")
                return False
        else:
            print(f"Response: {response.text}")
            print(f"❌ GET /api/broker-packs/1.0.1 failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ GET /api/broker-packs/1.0.1 request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ GET /api/broker-packs/1.0.1 test error: {e}")
        return False

def test_broker_pack_post_duplicate():
    """Test POST /api/broker-packs with same version again (expect 409)"""
    print("\nTesting POST /api/broker-packs duplicate version ...")
    try:
        test_data = {
            "version": "1.0.1",
            "brokers": [
                {
                    "id": "duplicate-test",
                    "name": "Duplicate Test Broker",
                    "opt_out_url": "https://example.com/duplicate",
                    "form_type": "web"
                }
            ]
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer moiF9fNxbcTS7IIDlSHEaDwbGx8dJnaXb8RcN97v9Z8"
        }
        
        response = requests.post(
            f"{API_BASE}/broker-packs",
            json=test_data,
            headers=headers,
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 409:
            print("✅ POST /api/broker-packs correctly returns 409 for duplicate version")
            return True
        else:
            print(f"Response: {response.text}")
            print(f"❌ Expected 409, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ POST /api/broker-packs request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ POST /api/broker-packs test error: {e}")
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

def run_broker_pack_api_tests():
    """Run broker pack API tests as requested in Phase 2.1b"""
    print("=" * 60)
    print("BROKER PACK API TEST SUITE (Phase 2.1b)")
    print("=" * 60)
    print(f"Testing backend at: {API_BASE}")
    print(f"Timestamp: {datetime.now()}")
    print("=" * 60)
    
    results = []
    
    # Test sequence as requested:
    # 1) GET /api/broker-packs/latest (expect 404 if no packs yet)
    results.append(("GET latest (empty)", test_broker_pack_get_latest_empty()))
    
    # Test unauthorized access
    results.append(("POST unauthorized", test_broker_pack_post_unauthorized()))
    
    # 2) POST /api/broker-packs with sample pack (version 1.0.1)
    results.append(("POST authorized", test_broker_pack_post_authorized()))
    
    # 3) GET /api/broker-packs/latest (expect version 1.0.1)
    results.append(("GET latest (populated)", test_broker_pack_get_latest_populated()))
    
    # 4) GET /api/broker-packs/1.0.1 (expect same content)
    results.append(("GET specific version", test_broker_pack_get_specific_version()))
    
    # 5) POST same version again (expect 409)
    results.append(("POST duplicate", test_broker_pack_post_duplicate()))
    
    print("\n" + "=" * 60)
    print("BROKER PACK API TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} broker pack API tests passed")
    
    if passed == total:
        print("🎉 All broker pack API tests PASSED!")
        return True
    else:
        print("⚠️  Some broker pack API tests FAILED!")
        return False

if __name__ == "__main__":
    success = run_backend_smoke_test()
    sys.exit(0 if success else 1)