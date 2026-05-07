import time

from testsprite_api_helpers_stdlib import api_request, login_seed_admin


def test_post_api_v1_crias_on_existing_parto_supports_edit_flow_completion():
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
            "data": "2026-05-07T14:00:00Z",
            "tipo": "NORMAL",
            "numero_crias": 3,
        },
    )
    assert status == 201, body
    parto_id = body["data"]["id"]

    status, body = api_request(
        "POST",
        "/api/v1/crias",
        token=token,
        payload={"parto_id": parto_id, "sexo": "F", "condicao": "VIVO"},
    )
    assert status == 201, body

    status, body = api_request("GET", "/api/v1/crias", token=token, query={"parto_id": parto_id})
    assert status == 200 and len(body.get("data", [])) >= 1, body


test_post_api_v1_crias_on_existing_parto_supports_edit_flow_completion()
