import time

from testsprite_api_helpers_stdlib import api_request, login_seed_admin


def test_post_api_v1_partos_creates_parto_with_crias_in_single_transaction():
    token = login_seed_admin()

    status, body = api_request("GET", "/api/v1/me/fazendas", token=token)
    assert status == 200 and body.get("data"), body
    fazenda_id = body["data"][0]["id"]

    status, body = api_request(
        "POST",
        "/api/v1/animais",
        token=token,
        payload={
            "fazenda_id": fazenda_id,
            "identificacao": f"MATRIZ-{int(time.time() * 1000)}",
            "sexo": "F",
            "categoria": "NOVILHA",
            "data_nascimento": "2020-01-01",
        },
    )
    assert status == 201, body
    animal_id = body["data"]["id"]

    status, body = api_request(
        "POST",
        "/api/v1/partos",
        token=token,
        payload={
            "animal_id": animal_id,
            "fazenda_id": fazenda_id,
            "data": "2026-05-07T10:00:00Z",
            "tipo": "NORMAL",
            "numero_crias": 2,
            "crias": [
                {"sexo": "F", "condicao": "VIVO"},
                {"sexo": "M", "condicao": "NATIMORTO"},
            ],
        },
    )
    assert status == 201, body
    assert body.get("data", {}).get("id"), body
    assert body.get("data", {}).get("numero_crias") == 2, body


test_post_api_v1_partos_creates_parto_with_crias_in_single_transaction()
