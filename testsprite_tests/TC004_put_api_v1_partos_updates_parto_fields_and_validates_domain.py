import time

from testsprite_api_helpers_stdlib import api_request, login_seed_admin


def put_api_v1_partos_updates_parto_fields_and_validates_domain():
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
            "data": "2026-05-07T12:00:00Z",
            "tipo": "NORMAL",
            "numero_crias": 1,
        },
    )
    assert status == 201, body
    parto_id = body["data"]["id"]

    status, body = api_request(
        "PUT",
        f"/api/v1/partos/{parto_id}",
        token=token,
        payload={
            "animal_id": animal_id,
            "fazenda_id": fazenda_id,
            "data": "2026-05-07T12:30:00Z",
            "tipo": "NORMAL",
            "numero_crias": 2,
            "observacoes": "update tc004",
        },
    )
    assert status == 200 and body.get("data", {}).get("numero_crias") == 2, body

    status, body = api_request(
        "PUT",
        f"/api/v1/partos/{parto_id}",
        token=token,
        payload={
            "animal_id": animal_id,
            "fazenda_id": fazenda_id,
            "data": "2026-05-07T13:00:00Z",
            "tipo": "NORMAL",
            "numero_crias": 0,
        },
    )
    assert status == 200 and body.get("data", {}).get("numero_crias") == 1, body


put_api_v1_partos_updates_parto_fields_and_validates_domain()
