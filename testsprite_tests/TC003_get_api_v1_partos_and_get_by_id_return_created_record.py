import time

from testsprite_api_helpers_stdlib import api_request, login_seed_admin


def test_get_api_v1_partos_and_get_by_id_return_created_record():
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
            "data": "2026-05-07T11:00:00Z",
            "tipo": "NORMAL",
            "numero_crias": 1,
            "crias": [{"sexo": "F", "condicao": "VIVO"}],
        },
    )
    assert status == 201, body
    parto_id = body["data"]["id"]

    status, body = api_request("GET", "/api/v1/partos", token=token, query={"fazenda_id": fazenda_id})
    assert status == 200 and any(x.get("id") == parto_id for x in body.get("data", [])), body

    status, body = api_request("GET", f"/api/v1/partos/{parto_id}", token=token)
    assert status == 200 and body.get("data", {}).get("id") == parto_id, body


test_get_api_v1_partos_and_get_by_id_return_created_record()