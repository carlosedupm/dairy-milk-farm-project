import json
import os
import urllib.error
import urllib.parse
import urllib.request


BASE_URL = os.environ.get("TESTSPRITE_BASE_URL", "http://localhost:8080").rstrip("/")
SEED_ADMIN_EMAIL = os.environ.get("TESTSPRITE_ADMIN_EMAIL", "admin@ceialmilk.com")
SEED_ADMIN_PASSWORD = os.environ.get("TESTSPRITE_ADMIN_PASSWORD", "password")


def api_request(method, path, payload=None, token=None, query=None, timeout=30):
    url = f"{BASE_URL}{path}"
    if query:
        url = f"{url}?{urllib.parse.urlencode(query)}"

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8") or "{}"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8") or "{}"
        try:
            body = json.loads(raw)
        except Exception:
            body = {"raw": raw}
        return e.code, body


def login_seed_admin():
    status, body = api_request(
        "POST",
        "/api/auth/login",
        payload={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert status == 200, f"login failed status={status} body={body}"
    data = body.get("data") or {}
    token = data.get("access_token")
    assert token, f"missing access_token in response: {body}"
    return token
