import requests
import uuid

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_post_api_auth_refresh_returns_new_tokens():
    register_url = f"{BASE_URL}/api/auth/register"
    login_url = f"{BASE_URL}/api/auth/login"
    refresh_url = f"{BASE_URL}/api/auth/refresh"

    unique_id = uuid.uuid4().hex
    nome = f"TestUser{unique_id}"
    email = f"{nome.lower()}@example.com"
    password = "strongpass"

    # Register user
    register_payload = {
        "nome": nome,
        "email": email,
        "password": password
    }
    register_resp = requests.post(register_url, json=register_payload, timeout=TIMEOUT)
    assert register_resp.status_code == 201, f"Register failed: {register_resp.text}"
    
    try:
        # Login user
        login_payload = {
            "email": email,
            "password": password
        }
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_body = login_resp.json()
        assert "data" in login_body, "Missing 'data' in login response"
        assert "access_token" in login_body["data"], "Missing 'access_token' in login response data"
        assert "refresh_token" in login_body["data"], "Missing 'refresh_token' in login response data"
        refresh_token = login_body["data"]["refresh_token"]

        # Refresh with refresh_token
        refresh_payload = {
            "refresh_token": refresh_token
        }
        refresh_resp = requests.post(refresh_url, json=refresh_payload, timeout=TIMEOUT)
        assert refresh_resp.status_code == 200, f"Refresh failed: {refresh_resp.text}"
        refresh_body = refresh_resp.json()
        assert "data" in refresh_body, "Missing 'data' in refresh response"
        assert "access_token" in refresh_body["data"], "Missing 'access_token' in refresh response data"
        # Optionally check refresh token exists in response as well
        assert isinstance(refresh_body["data"]["access_token"], str) and refresh_body["data"]["access_token"], "Invalid access_token in refresh response"
    finally:
        # Cleanup user (if API had delete user endpoint, we would call it here, but no such info given)
        # So no cleanup step possible for user as per provided API.
        pass

test_post_api_auth_refresh_returns_new_tokens()