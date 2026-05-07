import time

from testsprite_api_helpers_stdlib import api_request, login_seed_admin


def test_delete_api_v1_partos_removes_parto_and_generated_animais():
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

    cria_ident = f"CRIA-{int(time.time())}"
    status, body = api_request(
        "POST",
        "/api/v1/partos",
        token=token,
        payload={
            "animal_id": animal_id,
            "fazenda_id": fazenda_id,
            "data": "2026-05-07T13:00:00Z",
            "tipo": "NORMAL",
            "numero_crias": 1,
            "crias": [{"sexo": "F", "condicao": "VIVO", "animal_identificacao": cria_ident}],
        },
    )
    assert status == 201, body
    parto_id = body["data"]["id"]

    status, body = api_request("GET", "/api/v1/animais", token=token, query={"fazenda_id": fazenda_id})
    assert status == 200, body
    assert any(a.get("identificacao") == cria_ident for a in body.get("data", [])), body

    status, body = api_request("DELETE", f"/api/v1/partos/{parto_id}", token=token)
    assert status == 200, body

    status, body = api_request("GET", f"/api/v1/partos/{parto_id}", token=token)
    assert status == 404, body

    status, body = api_request("GET", "/api/v1/animais", token=token, query={"fazenda_id": fazenda_id})
    assert status == 200, body
    assert not any(a.get("identificacao") == cria_ident for a in body.get("data", [])), body


test_delete_api_v1_partos_removes_parto_and_generated_animais()
