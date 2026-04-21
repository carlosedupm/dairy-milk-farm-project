import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30

def test_post_api_auth_login_returns_tokens():
    url = BASE_URL + LOGIN_ENDPOINT
    payload = {
        "email": "admin@ceialmilk.com",
        "password": "password"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        body = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "data" in body, "Response JSON does not contain 'data' key"
    data = body["data"]

    assert isinstance(data, dict), "'data' is not a dictionary"
    assert "access_token" in data, "'access_token' not found in the response data"
    assert "refresh_token" in data, "'refresh_token' not found in the response data"

    assert isinstance(data["access_token"], str) and len(data["access_token"]) > 0, "access_token is empty or not a string"
    assert isinstance(data["refresh_token"], str) and len(data["refresh_token"]) > 0, "refresh_token is empty or not a string"

    # Ensure tokens are not at root level keys
    root_keys_forbidden = ["access_token", "refresh_token", "access", "refresh"]
    for key in root_keys_forbidden:
        assert key not in body, f"Token key '{key}' found at root level, should be inside data"

test_post_api_auth_login_returns_tokens()