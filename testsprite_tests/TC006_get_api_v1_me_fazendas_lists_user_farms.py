import requests

BASE_URL = "http://localhost:8080"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
ME_FAZENDAS_URL = f"{BASE_URL}/api/v1/me/fazendas"


def test_get_api_v1_me_fazendas_lists_user_farms():
    # Login as FUNCIONARIO (seed user)
    credentials = {
        "email": "admin@ceialmilk.com",
        "password": "password"
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=credentials, timeout=30)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_body = login_resp.json()
        access_token = login_body["data"]["access_token"]
        refresh_token = login_body["data"]["refresh_token"]
        assert isinstance(access_token, str) and access_token != "", "No access_token in login response"
        assert isinstance(refresh_token, str) and refresh_token != "", "No refresh_token in login response"

        headers = {"Authorization": f"Bearer {access_token}"}
        resp = requests.get(ME_FAZENDAS_URL, headers=headers, timeout=30)
        assert resp.status_code == 200, f"Expected 200 from GET /api/v1/me/fazendas but got {resp.status_code}"
        body = resp.json()
        # Validate that the farms list is in body['data'] and is a list
        assert "data" in body, "Response missing 'data' key"
        assert isinstance(body["data"], list), "'data' is not a list"
    except requests.exceptions.RequestException as e:
        assert False, f"HTTP request failed: {e}"


test_get_api_v1_me_fazendas_lists_user_farms()