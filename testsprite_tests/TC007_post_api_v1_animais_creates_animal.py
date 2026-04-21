import os
import sys
import uuid

import requests

_FILE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(_FILE_DIR) == "fixtures":
    _TESTS_DIR = os.path.normpath(os.path.join(_FILE_DIR, ".."))
else:
    _TESTS_DIR = _FILE_DIR
if _TESTS_DIR not in sys.path:
    sys.path.insert(0, _TESTS_DIR)

from testsprite_api_helpers import BASE_URL, TIMEOUT, auth_headers_elevated

ANIMAIS_URL = f"{BASE_URL}/api/v1/animais"
FAZENDAS_URL = f"{BASE_URL}/api/v1/fazendas"


def _first_fazenda_id(headers):
    r = requests.get(FAZENDAS_URL, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    farms = r.json().get("data") or []
    if farms:
        return farms[0]["id"]
    suffix = uuid.uuid4().hex[:8]
    cr = requests.post(
        FAZENDAS_URL,
        headers=headers,
        json={"nome": f"FazendaTestSprite-{suffix}", "localizacao": "TestSprite"},
        timeout=TIMEOUT,
    )
    assert cr.status_code == 201, cr.text
    return cr.json()["data"]["id"]


def test_post_api_v1_animais_creates_animal():
    headers = auth_headers_elevated()
    fazenda_id = _first_fazenda_id(headers)

    ident = f"TS-{uuid.uuid4().hex[:12]}"
    animal_payload = {
        "fazenda_id": fazenda_id,
        "identificacao": ident,
        "raca": "Holstein",
        "sexo": "F",
        "data_nascimento": "2020-06-01",
    }
    resp = requests.post(ANIMAIS_URL, json=animal_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert "data" in body, body
    animal_data = body["data"]
    assert animal_data.get("id"), animal_data
    assert animal_data.get("identificacao") == ident, animal_data

    created_id = animal_data["id"]
    try:
        delete_url = f"{ANIMAIS_URL}/{created_id}"
        delete_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
        assert delete_resp.status_code in (200, 204), delete_resp.text
    except Exception:
        pass


test_post_api_v1_animais_creates_animal()
