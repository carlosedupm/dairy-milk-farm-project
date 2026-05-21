# CeialMilk Postman Collection

This directory contains Postman files for testing the CeialMilk API.

## Files

- `CeialMilk-Postman-Collection.json` - Complete API collection with all endpoints
- `CeialMilk-Postman-Environment.json` - Environment variables for local development

## How to Use

### 1. Import the Collection
1. Open Postman
2. Click "Import" in the top left corner
3. Select the `CeialMilk-Postman-Collection.json` file
4. The collection will appear in your workspace

### 2. Import the Environment
1. In Postman, click the "Environments" tab on the left
2. Click "Import"
3. Select the `CeialMilk-Postman-Environment.json` file
4. Select the "CeialMilk Local" environment from the dropdown

### 3. Set Up the Application
Make sure the CeialMilk application is running:

**Devcontainer**: O backend sobe dentro do container. O Postgres (`db`) sobe com o compose.

```bash
cd backend && go run ./cmd/api
```

- **Base URL**: `http://localhost:8080` (porta encaminhada pelo devcontainer)
- **Database**: `DATABASE_URL` já configurada no devcontainer (`db:5432`)
- **JWT**: Em desenvolvimento, chaves embutidas são usadas se `JWT_*` não estiverem definidas

Se o banco estiver indisponível, o backend sobe apenas com `GET /health`; após corrigir o Postgres, reinicie o backend.

### 4. Test the API

#### Authentication
1. Open the "Authentication" folder in the collection
2. Run the "Login" request first
   - This will automatically save the JWT token to the environment variable
   - Credentials: admin@ceialmilk.com / password

#### Farms Management
1. After successful login, you can test all farm endpoints
2. The token will be automatically included in all requests

## Endpoints Included

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/validate` - Validate JWT token

### Farms (Fazendas)
- `GET /api/v1/fazendas` - List all farms
- `GET /api/v1/fazendas/{id}` - Get farm by ID
- `POST /api/v1/fazendas` - Create new farm
- `PUT /api/v1/fazendas/{id}` - Update farm
- `DELETE /api/v1/fazendas/{id}` - Delete farm
- `GET /api/v1/fazendas/search/by-nome` - Search by name
- `GET /api/v1/fazendas/search/by-localizacao` - Search by location
- `GET /api/v1/fazendas/search/by-vacas-min` - Search by minimum cows
- `GET /api/v1/fazendas/search/by-vacas-range` - Search by cows range
- `GET /api/v1/fazendas/count` - Get total farms count
- `GET /api/v1/fazendas/exists` - Check if farm exists

## Integrações M2M (API key)

### Importar via OpenAPI (recomendado)

1. Postman → **Import** → **Link**
2. URL: `http://localhost:8080/api/v1/integracoes/openapi.yaml` (com o backend a correr)
3. Ou importe o ficheiro local: `docs/openapi/integracoes-v1.openapi.yaml`
4. Na UI: `/admin/integracoes` → criar cliente → copiar `cmk_live_...` para `integration_api_key`
5. Na collection importada, configure **Authorization** → Bearer `{{integration_api_key}}`

**Swagger UI (navegador):** `http://localhost:8080/api/v1/integracoes/docs` — documentação pública; Authorize com a chave para testar.

Ver `docs/integracoes/README.md` para fluxo veterinário (lote de toques).

### Endpoints principais

- `GET {{baseUrl}}/api/v1/integracoes/me`
- `GET {{baseUrl}}/api/v1/integracoes/animais/search?fazenda_id={{fazendaId}}&identificacao=BR-001` — parâmetros na **query**, não em headers
- `POST {{baseUrl}}/api/v1/integracoes/toques/lote` (header `Idempotency-Key` recomendado)

Admin (JWT): `GET/POST {{baseUrl}}/api/v1/admin/integracoes`

## Environment Variables

- `baseUrl`: http://localhost:8080
- `authToken`: Automatically set after login
- `adminEmail`: admin@ceialmilk.com
- `adminPassword`: password
- `integration_api_key`: Chave M2M (`cmk_live_...`) — criada em Admin → Integrações
- `fazendaId`: ID da fazenda para testes de integração

## Features

- **Automatic Token Management**: The login request automatically saves the JWT token
- **Bearer Authentication**: All requests include the token automatically
- **Test Scripts**: Basic response validation tests
- **Example Data**: Pre-configured request bodies for testing

## Troubleshooting

1. **401 Unauthorized**: Make sure to run the Login request first
2. **Connection Refused**: Verify the application is running on port 8080
3. **Invalid Token**: O token expira em 15 minutos - faça login novamente para obter um novo

## Notes

- The collection uses the Portuguese endpoint names (`fazendas`) as defined in the API
- All dates should be in ISO format: `YYYY-MM-DD`
- The application must be running for the tests to work
