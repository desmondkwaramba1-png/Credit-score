import requests
import json

BASE_URL = "http://localhost:8000/v1"

def test_auth_flow():
    print("Testing Auth Flow...")
    
    # 1. Register a new user
    user_data = {
        "name": "Test Lender",
        "email": "test.lender@example.com",
        "password": "securepassword123",
        "user_type": "lender"
    }
    
    print(f"Registering user: {user_data['email']}")
    reg_res = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    
    if reg_res.status_code == 201:
        print("✅ Registration Successful")
        print(reg_res.json())
    elif reg_res.status_code == 400 and "already registered" in reg_res.text:
         print("ℹ️ User already registered, proceeding to login.")
    else:
        print(f"❌ Registration Failed: {reg_res.status_code} - {reg_res.text}")
        return

    print("\n-------------------\n")
    
    # 2. Login the user (OAuth2 uses form data)
    login_data = {
        "username": "test.lender@example.com",
        "password": "securepassword123"
    }
    
    print(f"Logging in user: {login_data['username']}")
    login_res = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    
    if login_res.status_code == 200:
        print("✅ Login Successful")
        token_data = login_res.json()
        print(f"Access Token generated: {token_data['access_token'][:20]}...")
        
        print("\n-------------------\n")
        
        # 3. Rotate API Key
        print(f"Rotating API Key for: {login_data['username']}")
        rotate_res = requests.post(f"{BASE_URL}/auth/api-key/rotate", params={"email": login_data['username']})
        
        if rotate_res.status_code == 200:
             print("✅ API Key Rotated Successfully")
             print(f"New Key: {rotate_res.json()['new_api_key']}")
        else:
             print(f"❌ API Key Rotation Failed: {rotate_res.status_code} - {rotate_res.text}")
             
    else:
        print(f"❌ Login Failed: {login_res.status_code} - {login_res.text}")

if __name__ == "__main__":
    try:
        # Check health first
        health = requests.get(f"http://localhost:8000/health")
        if health.status_code == 200:
            test_auth_flow()
        else:
            print("API is not healthy:", health.text)
    except requests.exceptions.ConnectionError:
        print("FastAPI server is not running on port 8000. Start it with uvicorn app.api.main:app --reload")

