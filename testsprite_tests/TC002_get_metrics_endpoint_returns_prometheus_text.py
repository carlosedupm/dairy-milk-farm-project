import requests

def test_get_metrics_endpoint_returns_prometheus_text():
    url = "http://localhost:8080/metrics"
    try:
        response = requests.get(url, timeout=30)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        # Prometheus exposition format typically uses text/plain; version=0.0.4 or similar
        assert "text/plain" in content_type, f"Expected Content-Type to include 'text/plain', got '{content_type}'"
        text = response.text
        # Basic check: prometheus metrics should contain # HELP and # TYPE lines or metric samples
        assert text.startswith("#") or "\n" in text, "Response text does not appear to be Prometheus metrics format"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_metrics_endpoint_returns_prometheus_text()