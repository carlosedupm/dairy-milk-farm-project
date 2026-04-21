import requests
import uuid

BASE_URL = "http://localhost:8080"
REGISTER_ENDPOINT = "/api/auth/register"
TIMEOUT = 30


def test_post_api_auth_register_creates_new_user():
    nome = "Test User " + str(uuid.uuid4())
    email = f"{nome.replace(' ', '').lower()}@example.com"
    password = "password123"

    url = BASE_URL + REGISTER_ENDPOINT
    payload = {
        "nome": nome,
        "email": email,
        "password": password
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request exception occurred: {e}"

    assert response.status_code == 201, f"Expected status code 201, got {response.status_code}"

    try:
        body = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "data" in body, "Response JSON missing 'data' key"
    data = body["data"]
    assert isinstance(data, dict), "'data' is not a dict"
    assert "id" in data, "'id' missing in data"
    assert "nome" in data, "'nome' missing in data"
    assert "email" in data, "'email' missing in data"

    assert data["nome"] == nome, f"Returned nome differs from sent. Expected: {nome}, got: {data['nome']}"
    assert data["email"] == email, f"Returned email differs from sent. Expected: {email}, got: {data['email']}"

    # Confirm no JWT tokens present
    tokens_keys = {"access_token", "refresh_token", "access", "refresh"}
    root_keys = set(body.keys())
    assert not tokens_keys.intersection(root_keys), \
        "Tokens keys should not be present at root level in register response"


test_post_api_auth_register_creates_new_user()