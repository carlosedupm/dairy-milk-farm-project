import requests
import datetime

BASE_URL = "http://localhost:8080"
ADMIN_EMAIL = "admin@ceialmilk.com"
ADMIN_PASSWORD = "password"
TIMEOUT = 30

def test_post_api_v1_producao_creates_production_record():
    session = requests.Session()

    # 1. Authenticate as admin user to get tokens
    login_resp = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=TIMEOUT,
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_body = login_resp.json()
    access_token = login_body['data']['access_token']
    refresh_token = login_body['data']['refresh_token']
    assert access_token and refresh_token

    headers = {"Authorization": f"Bearer {access_token}"}

    farm_id = None
    animal_id = None
    production_id = None

    try:
        # 2. Get list of farms for current user to reuse farm if exists
        farms_resp = session.get(f"{BASE_URL}/api/v1/me/fazendas", headers=headers, timeout=TIMEOUT)
        assert farms_resp.status_code == 200
        farms_body = farms_resp.json()
        farms = farms_body.get("data", [])
        if farms and isinstance(farms, list):
            farm_id = farms[0].get("id")
        else:
            # No farms, must create one - creating a farm requires admin endpoint but not detailed here
            # Because no endpoint for creating farm provided, we assume at least one exists per TC007 instructions.
            raise AssertionError("No farm available to reuse")

        # 3. Create animal with valid schema
        animal_payload = {
            "fazenda_id": farm_id,
            "identificacao": f"test-animal-{datetime.datetime.utcnow().isoformat()}",
            "data_nascimento": datetime.datetime.utcnow().date().isoformat()
        }
        animal_resp = session.post(f"{BASE_URL}/api/v1/animais", headers=headers, json=animal_payload, timeout=TIMEOUT)
        assert animal_resp.status_code == 201, f"Animal creation failed: {animal_resp.text}"
        animal_body = animal_resp.json()
        animal_id = animal_body["data"]["id"]
        assert animal_id is not None

        # 4. POST /api/v1/producao with required fields: animal_id, quantidade (optional data_hora ISO)
        quantidade = 123.45
        now_iso = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        producao_payload = {
            "animal_id": animal_id,
            "quantidade": quantidade,
            "data_hora": now_iso
        }
        producao_resp = session.post(f"{BASE_URL}/api/v1/producao", headers=headers, json=producao_payload, timeout=TIMEOUT)
        assert producao_resp.status_code == 201, f"Production record creation failed: {producao_resp.text}"
        producao_body = producao_resp.json()
        producao_data = producao_body.get("data", {})
        production_id = producao_data.get("id")
        assert production_id is not None, "Production record id missing"
        # Verify that production record uses 'quantidade' field with the correct value, not 'liters'
        assert "quantidade" in producao_data, "Production record missing quantidade field"
        assert producao_data["quantidade"] == quantidade, f"Expected quantidade {quantidade}, got {producao_data['quantidade']}"

    finally:
        # Cleanup created production record if possible (no DELETE prod endpoint given, skip)
        # Cleanup created animal
        if animal_id:
            try:
                del_resp = session.delete(f"{BASE_URL}/api/v1/animais/{animal_id}", headers=headers, timeout=TIMEOUT)
                # Not required to assert delete response, might not be supported in PRD
            except Exception:
                pass

test_post_api_v1_producao_creates_production_record()