
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** workspace
- **Date:** 2026-05-07
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 post_api_auth_login_returns_tokens_in_standard_envelope
- **Test Code:** [TC001_post_api_auth_login_returns_tokens_in_standard_envelope.py](./TC001_post_api_auth_login_returns_tokens_in_standard_envelope.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 35, in <module>
  File "<string>", line 21, in test_post_api_auth_login_returns_tokens_in_standard_envelope
AssertionError: Expected status 200 but got 401

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3361c3a1-779c-476f-bb03-f986ba7a12cc/a8a68e24-85c4-4eb3-8fe2-0a6eaebdb6d3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 post_api_v1_partos_creates_parto_with_crias_in_single_transaction
- **Test Code:** [TC002_post_api_v1_partos_creates_parto_with_crias_in_single_transaction.py](./TC002_post_api_v1_partos_creates_parto_with_crias_in_single_transaction.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 167, in <module>
  File "<string>", line 25, in test_post_api_v1_partos_creates_parto_with_crias_in_single_transaction
AssertionError: Login failed: {"error":{"code":"UNAUTHORIZED","message":"Credenciais inválidas"},"timestamp":"2026-05-07T14:51:31Z"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3361c3a1-779c-476f-bb03-f986ba7a12cc/f1405416-a700-49d2-91da-f58003b61e52
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 get_api_v1_partos_and_get_by_id_return_created_record
- **Test Code:** [TC003_get_api_v1_partos_and_get_by_id_return_created_record.py](./TC003_get_api_v1_partos_and_get_by_id_return_created_record.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 163, in <module>
  File "<string>", line 102, in test_get_api_v1_partos_and_get_by_id_return_created_record
  File "<string>", line 21, in login_as_admin
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:8080/api/auth/login

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3361c3a1-779c-476f-bb03-f986ba7a12cc/71e12480-6205-41c7-8120-9b3ec0b0ee5c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 put_api_v1_partos_updates_parto_fields_and_validates_domain
- **Test Code:** [TC004_put_api_v1_partos_updates_parto_fields_and_validates_domain.py](./TC004_put_api_v1_partos_updates_parto_fields_and_validates_domain.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 149, in <module>
  File "<string>", line 94, in put_api_v1_partos_updates_parto_fields_and_validates_domain
  File "<string>", line 18, in login
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:8080/api/auth/login

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3361c3a1-779c-476f-bb03-f986ba7a12cc/0bb0e687-eb00-4261-8c01-50f5fb8fd77b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 delete_api_v1_partos_removes_parto_and_generated_animais
- **Test Code:** [TC005_delete_api_v1_partos_removes_parto_and_generated_animais.py](./TC005_delete_api_v1_partos_removes_parto_and_generated_animais.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 145, in <module>
  File "<string>", line 90, in test_delete_api_v1_partos_removes_parto_and_generated_animais
  File "<string>", line 16, in login
AssertionError: Login failed

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3361c3a1-779c-476f-bb03-f986ba7a12cc/99e14eef-b5fd-45c1-8456-fc2595b208dd
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 post_api_v1_crias_on_existing_parto_supports_edit_flow_completion
- **Test Code:** [TC006_post_api_v1_crias_on_existing_parto_supports_edit_flow_completion.py](./TC006_post_api_v1_crias_on_existing_parto_supports_edit_flow_completion.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 150, in <module>
  File "<string>", line 109, in test_post_api_v1_crias_on_existing_parto_supports_edit_flow_completion
  File "<string>", line 18, in get_auth_tokens
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:8080/api/auth/login

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3361c3a1-779c-476f-bb03-f986ba7a12cc/b383a6d8-ebd2-41ad-8828-9922f94b64e1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---