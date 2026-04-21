import requests

BASE_URL = "http://localhost:8080"
ADMIN_EMAIL = "admin@ceialmilk.com"
ADMIN_PASSWORD = "password"
TIMEOUT = 30


def test_get_api_v1_admin_usuarios_lists_users_for_admin():
    login_url = f"{BASE_URL}/api/auth/login"
    admin_users_url = f"{BASE_URL}/api/v1/admin/usuarios"

    # Login as admin
    login_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }

    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_body = login_resp.json()
        assert "data" in login_body, "Login response missing 'data'"
        assert "access_token" in login_body["data"] and "refresh_token" in login_body["data"], "Tokens missing in login response data"
        access_token = login_body["data"]["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # GET /api/v1/admin/usuarios
        users_resp = requests.get(admin_users_url, headers=headers, timeout=TIMEOUT)
        assert users_resp.status_code == 200, f"Admin users list request failed with status {users_resp.status_code}"
        users_body = users_resp.json()
        assert "data" in users_body, "Response missing 'data'"
        data = users_body["data"]
        assert isinstance(data, dict), "'data' is not a dictionary"
        assert "usuarios" in data and "total" in data, "'data' missing 'usuarios' or 'total'"
        assert isinstance(data["usuarios"], list), "'usuarios' is not a list"
        assert isinstance(data["total"], int), "'total' is not an integer"
    except requests.RequestException as e:
        assert False, f"RequestException occurred: {e}"


test_get_api_v1_admin_usuarios_lists_users_for_admin()