import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_get_health_endpoint_returns_service_status():
    url = f"{BASE_URL}/health"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        body = response.json()
        # Validate fields presence and types
        assert "status" in body, "Missing 'status' in response"
        assert "service" in body, "Missing 'service' in response"
        assert "timestamp" in body, "Missing 'timestamp' in response"
        assert isinstance(body["status"], str), "'status' should be a string"
        assert isinstance(body["service"], str), "'service' should be a string"
        assert isinstance(body["timestamp"], str), "'timestamp' should be a string"
        # Optionally check that status indicates healthy (e.g. "ok" / "healthy")
        assert body["status"].lower() in ["ok", "healthy", "running"], f"Unexpected status value: {body['status']}"
        # Service name non empty
        assert len(body["service"].strip()) > 0, "Service name is empty"
        # Timestamp non empty and reasonable length (not empty string)
        assert len(body["timestamp"].strip()) > 0, "Timestamp is empty"
    except requests.exceptions.RequestException as e:
        assert False, f"Request to /health endpoint failed: {e}"

test_get_health_endpoint_returns_service_status()