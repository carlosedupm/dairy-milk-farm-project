"""Helpers para scripts TC* alinhados ao envelope da API CeialMilk (data / message / timestamp).

Credenciais E2E (perfil com API completa): utilizador criado pela migração
`backend/migrations/3_seed_admin.up.sql` (senha documentada em docs/postman e memory-bank).
Após `6_update_admin_to_developer.up.sql` o perfil passa a DEVELOPER; continua com acesso total à API.

Variáveis de ambiente opcionais:
- TESTSPRITE_BASE_URL (default http://localhost:8080)
- TESTSPRITE_TIMEOUT (default 30)
- TESTSPRITE_ADMIN_EMAIL (default admin@ceialmilk.com)
- TESTSPRITE_ADMIN_PASSWORD (default password)
"""

import os

import requests

BASE_URL = os.environ.get("TESTSPRITE_BASE_URL", "http://localhost:8080").rstrip("/")
TIMEOUT = int(os.environ.get("TESTSPRITE_TIMEOUT", "30"))

SEED_ADMIN_EMAIL = os.environ.get("TESTSPRITE_ADMIN_EMAIL", "admin@ceialmilk.com")
SEED_ADMIN_PASSWORD = os.environ.get("TESTSPRITE_ADMIN_PASSWORD", "password")


def success_data(resp):
    resp.raise_for_status()
    body = resp.json()
    assert isinstance(body, dict), body
    return body.get("data")


def access_token(resp):
    d = success_data(resp)
    assert d is not None, resp.text
    t = d.get("access_token")
    assert t, d
    return t


def refresh_token(resp):
    d = success_data(resp)
    assert d is not None
    t = d.get("refresh_token")
    assert t, d
    return t


def login_response(email: str, password: str) -> requests.Response:
    return requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=TIMEOUT,
    )


def tokens_from_login(email: str, password: str):
    r = login_response(email, password)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "data" in body, body
    d = body["data"]
    assert isinstance(d, dict), d
    return d["access_token"], d["refresh_token"]


def auth_headers_elevated():
    """Authorization para rotas que exigem perfil com API completa (não FUNCIONARIO)."""
    access, _ = tokens_from_login(SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD)
    return {"Authorization": f"Bearer {access}"}
