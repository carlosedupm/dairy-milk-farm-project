# TestSprite neste repositório

## Âmbito

- Os casos planeados para execução MCP/TestSprite estão em [testsprite_backend_test_plan.json](testsprite_backend_test_plan.json) e cobrem a **API Go** (`backend/`), não o frontend Next.js.
- [testsprite_frontend_test_plan.json](testsprite_frontend_test_plan.json) está intencionalmente vazio (`[]`): não há plano de testes TestSprite para UI neste momento. Para adicionar cenários de frontend, usar a ferramenta MCP `testsprite_generate_frontend_test_plan` e atualizar esse ficheiro.

## Execução local

Variáveis opcionais: ver [testsprite_api_helpers.py](testsprite_api_helpers.py) e [.env.example](../.env.example) (`TESTSPRITE_BASE_URL`, `TESTSPRITE_ADMIN_*`, etc.).

```bash
cd testsprite_tests && for f in TC*.py; do python3 "$f" || exit 1; done
```

## Aviso

`testsprite_generate_code_and_execute` pode **sobrescrever** ficheiros `TC*.py` gerados na cloud. Após cada run MCP, rever `git diff testsprite_tests/`.

## TC007 falha na cloud mas passa localmente — porquê e como resolver

**Causa:** o código Python gerado pelo TestSprite muitas vezes lê tokens de login na **raiz** (`access`, `access_token`) em vez de **`data.access_token`** / **`data.refresh_token`**, como a API CeialMilk realmente devolve (ver [`backend/internal/response/response.go`](../backend/internal/response/response.go)).

**Opções:**

1. **Restaurar o script canónico** (recomendado após cada `generateCodeAndExecute`):

   ```bash
   bash /workspace/scripts/testsprite-restore-tc007.sh
   ```

   O fixture está em [fixtures/TC007_post_api_v1_animais_creates_animal.canonical.py](fixtures/TC007_post_api_v1_animais_creates_animal.canonical.py). Se alterares a lógica do TC007, actualiza também esse ficheiro.

2. **Excluir TC007 da run MCP** e correr só localmente: na ferramenta `testsprite_generate_code_and_execute`, usa `testIds` com `["TC001","TC002","TC003","TC004","TC005","TC006","TC008","TC009"]` (sem `TC007`), depois `python3 testsprite_tests/TC007_post_api_v1_animais_creates_animal.py`.

3. **`git restore`** do `TC007` se a última versão boa já estiver commitada no Git.

O plano [testsprite_backend_test_plan.json](testsprite_backend_test_plan.json) para TC007 foi reforçado com o contrato explícito de JSON para orientar o gerador (ainda assim a opção 1 ou 2 é a mais fiável).
