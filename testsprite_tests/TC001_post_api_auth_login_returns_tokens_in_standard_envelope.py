from testsprite_api_helpers_stdlib import (
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
    api_request,
)


def test_post_api_auth_login_returns_tokens_in_standard_envelope():
    status, body = api_request(
        "POST",
        "/api/auth/login",
        payload={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert status == 200, f"Expected HTTP 200, got {status}: {body}"
    assert "access_token" not in body and "refresh_token" not in body, body
    data = body.get("data")
    assert isinstance(data, dict), body
    assert data.get("access_token"), body
    assert data.get("refresh_token"), body


test_post_api_auth_login_returns_tokens_in_standard_envelope()
