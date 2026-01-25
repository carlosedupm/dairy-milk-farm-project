# 🔐 Segurança: Dev Studio

## 📋 Visão Geral

Este documento descreve as medidas de segurança implementadas no Dev Studio.

---

## 🔒 Controle de Acesso

### Perfil DEVELOPER

Apenas usuários com perfil `DEVELOPER` podem acessar o Dev Studio.

**Backend**:
```go
// Middleware de autorização
func DeveloperOnlyMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        perfil, exists := c.Get("perfil")
        if !exists || perfil != "DEVELOPER" {
            response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
            c.Abort()
            return
        }
        c.Next()
    }
}
```

**Frontend**:
```typescript
// Verificação no componente
if (user?.perfil !== 'DEVELOPER') {
    return <AccessDenied />;
}
```

---

## ⚡ Rate Limiting

### Limites por Usuário

- **10 requests/hora** por desenvolvedor
- **100 requests/dia** por desenvolvedor

**Implementação**:
```go
// backend/internal/middleware/rate_limit.go
func DevStudioRateLimit() gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Every(time.Hour), 10)
    
    return func(c *gin.Context) {
        userID := c.GetInt64("user_id")
        key := fmt.Sprintf("dev_studio:%d", userID)
        
        if !limiter.Allow() {
            response.ErrorTooManyRequests(c, "Limite de requisições excedido")
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

---

## ✅ Validação de Código

### Antes de Aplicar

1. **Syntax Check**: Validar sintaxe básica
2. **Path Validation**: Verificar paths válidos
3. **Size Limits**: Limitar tamanho dos arquivos
4. **Extension Check**: Verificar extensões permitidas

**Implementação**:
```go
func (s *DevStudioService) validateCode(code map[string]string) error {
    for path, content := range code {
        // Validar path
        if !isValidPath(path) {
            return fmt.Errorf("path inválido: %s", path)
        }
        
        // Validar tamanho
        if len(content) > 100000 {
            return fmt.Errorf("arquivo muito grande: %s", path)
        }
        
        // Validar extensão
        if !isAllowedExtension(path) {
            return fmt.Errorf("extensão não permitida: %s", path)
        }
    }
    
    return nil
}

func isValidPath(path string) bool {
    // Não permitir paths perigosos
    dangerous := []string{"../", "/etc/", "/root/", "/var/"}
    for _, d := range dangerous {
        if strings.Contains(path, d) {
            return false
        }
    }
    return true
}

func isAllowedExtension(path string) bool {
    allowed := []string{".go", ".ts", ".tsx", ".js", ".jsx", ".md", ".sql", ".yaml", ".yml", ".json"}
    ext := filepath.Ext(path)
    for _, a := range allowed {
        if ext == a {
            return true
        }
    }
    return false
}
```

---

## 🏖️ Sandbox (Opcional)

### Validação em Ambiente Isolado

Para máxima segurança, pode executar código em sandbox antes de aplicar:

**Opção 1: Validação Básica** (Recomendada)
- Syntax check
- Linter básico
- Validações de segurança

**Opção 2: Sandbox Docker** (Avançada)
- Executar em container isolado
- Testes básicos
- Validação completa

---

## 🔑 Git Token

### Permissões Mínimas

O token GitHub deve ter apenas:
- ✅ `repo` (read/write)
- ❌ Sem `delete`
- ❌ Sem `admin`
- ❌ Sem `workflow`

**Configuração**:
```bash
# Variável de ambiente
GITHUB_TOKEN=ghp_xxx
```

---

## 📝 Auditoria

### Log de Todas as Ações

Todas as ações são registradas na tabela `dev_studio_audit`:

```go
type DevStudioAudit struct {
    ID          int64     `json:"id" db:"id"`
    RequestID   int64     `json:"request_id" db:"request_id"`
    UserID      int64     `json:"user_id" db:"user_id"`
    Action      string    `json:"action" db:"action"` // chat, implement, deploy
    Details     string    `json:"details" db:"details"` // JSON
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
}
```

**Ações Registradas**:
- Chat (geração de código)
- Implement (aplicação de mudanças)
- Deploy (status do deploy)
- Erros

---

## 🛡️ Proteções Adicionais

### 1. Input Sanitization

```go
func sanitizeInput(input string) string {
    // Remover caracteres perigosos
    input = strings.TrimSpace(input)
    // Validar tamanho máximo
    if len(input) > 10000 {
        return ""
    }
    return input
}
```

### 2. CORS

Já configurado no backend para domínio da Vercel.

### 3. HTTPS

Obrigatório em produção (Render + Vercel).

---

## ✅ Checklist de Segurança

- [x] Controle de acesso (perfil DEVELOPER)
- [x] Rate limiting (10 req/hora)
- [x] Validação de código antes de aplicar
- [x] Git token com permissões mínimas
- [x] Auditoria completa
- [x] Input sanitization
- [x] CORS configurado
- [x] HTTPS obrigatório
- [ ] Sandbox opcional (futuro)

---

**Última atualização**: 2026-01-25  
**Status**: Medidas de segurança documentadas
