# 🔗 Integração Completa: Dev Studio

## 📋 Visão Geral

Este guia descreve a integração completa do Dev Studio, incluindo Git operations, CI/CD trigger e deploy.

---

## 🔄 Fluxo Completo

```
1. Usuário descreve feature no chat
   ↓
2. Backend chama Gemini API
   ↓
3. Código gerado é retornado
   ↓
4. Usuário aprova código
   ↓
5. Backend aplica mudanças no Git
   ↓
6. CI/CD detecta push e faz deploy
   ↓
7. Status atualizado em tempo real
```

---

## 🔀 Git Operations: Fluxo Seguro de PR

Diferente do push direto na `main`, o Dev Studio utiliza branches efêmeras e Pull Requests para garantir a estabilidade.

### Implementação: Service de Git (Pull Request)

```go
func (s *GitService) CreatePullRequest(ctx context.Context, files map[string]string, title string) (string, string, error) {
    branchName := fmt.Sprintf("dev-studio/%d", time.Now().Unix())

    // 1. Criar branch efêmera
    if err := s.createBranch(ctx, branchName); err != nil {
        return "", "", err
    }

    // 2. Aplicar mudanças e Commit
    if err := s.commitChanges(ctx, branchName, files, title); err != nil {
        return "", "", err
    }

    // 3. Push para branch efêmera
    if err := s.pushBranch(ctx, branchName); err != nil {
        return "", "", err
    }

    // 4. Abrir Pull Request via GitHub API
    prURL, err := s.githubAPI.OpenPR(ctx, branchName, "main", title)

    // 5. Obter Diff Hash para Auditoria
    diffHash := s.getCommitHash(ctx, branchName)

    return prURL, diffHash, nil
}
```

## 🚀 CI/CD & Deploy via Staging

O deploy é segmentado para garantir segurança:

1. **Pull Request Aberto**: Dispara testes de CI no GitHub Actions.
2. **Preview Deploy**: Render/Vercel criam um ambiente de preview para o PR.
3. **Merge em Main**: Dispara o deploy final para produção após revisão humana.

## 📊 Status de PR e Deploy

O frontend monitora o estado do PR:

- `OPEN`: Aguardando revisão/CI
- `MERGED`: Deploy em produção iniciado
- `CLOSED`: Implementação rejeitada

### Alternativa: GitHub API

Se não quiser usar git command, pode usar GitHub API:

```go
// backend/internal/service/github_api_service.go
package service

import (
    "context"
    "encoding/base64"
    "fmt"
    "net/http"
    "bytes"
    "encoding/json"
)

type GitHubAPIService struct {
    token string
    baseURL string
}

func NewGitHubAPIService(token string) *GitHubAPIService {
    return &GitHubAPIService{
        token: token,
        baseURL: "https://api.github.com",
    }
}

func (s *GitHubAPIService) CreateOrUpdateFile(
    ctx context.Context,
    repo string,
    branch string,
    path string,
    content string,
    message string,
) error {
    // 1. Verificar se arquivo existe
    existingFile, err := s.getFile(ctx, repo, branch, path)

    url := fmt.Sprintf("%s/repos/%s/contents/%s", s.baseURL, repo, path)

    payload := map[string]interface{}{
        "message": message,
        "content": base64.StdEncoding.EncodeToString([]byte(content)),
        "branch": branch,
    }

    if existingFile != nil {
        payload["sha"] = existingFile.SHA
    }

    jsonData, _ := json.Marshal(payload)
    req, _ := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewBuffer(jsonData))
    req.Header.Set("Authorization", "token "+s.token)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
        return fmt.Errorf("erro ao criar/atualizar arquivo: %d", resp.StatusCode)
    }

    return nil
}

func (s *GitHubAPIService) getFile(ctx context.Context, repo, branch, path string) (*GitHubFile, error) {
    url := fmt.Sprintf("%s/repos/%s/contents/%s?ref=%s", s.baseURL, repo, path, branch)

    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    req.Header.Set("Authorization", "token "+s.token)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusNotFound {
        return nil, nil // Arquivo não existe
    }

    var file GitHubFile
    if err := json.NewDecoder(resp.Body).Decode(&file); err != nil {
        return nil, err
    }

    return &file, nil
}
```

---

## 🚀 CI/CD Trigger

### GitHub Actions (Automático)

Quando você faz push, GitHub Actions detecta automaticamente:

```yaml
# .github/workflows/ci-cd.yml (já existe)
name: CI/CD Pipeline

on:
  push:
    branches: [main]

jobs:
  backend-lint-build:
    # ... já configurado
```

**Não precisa fazer nada!** O push já triggera o CI/CD.

---

### Render (Automático)

Render detecta push automaticamente e faz deploy:

```yaml
# render.yaml (já existe)
services:
  - type: web
    name: ceialmilk-api
    autoDeployTrigger: commit # Já configurado!
```

**Não precisa fazer nada!** O push já triggera o deploy.

---

### Vercel (Automático)

Vercel detecta push automaticamente e faz deploy:

**Não precisa fazer nada!** O push já triggera o deploy.

---

## 📊 Status de Deploy

### Tracking de Status

```go
// backend/internal/service/deploy_status_service.go
package service

import (
    "context"
    "time"
)

type DeployStatusService struct {
    requestRepo *repository.DevStudioRequestRepository
}

func (s *DeployStatusService) GetStatus(ctx context.Context, requestID int64) (*DeployStatus, error) {
    request, err := s.requestRepo.GetByID(ctx, requestID)
    if err != nil {
        return nil, err
    }

    // Verificar status do deploy via GitHub API ou Render API
    deployInfo := s.checkDeployStatus(ctx, request)

    return &DeployStatus{
        RequestID: requestID,
        Status: request.Status,
        DeployInfo: deployInfo,
    }, nil
}

func (s *DeployStatusService) checkDeployStatus(ctx context.Context, request *models.DevStudioRequest) *DeployInfo {
    // Verificar último commit no GitHub
    // Verificar status do deploy no Render/Vercel
    // Retornar informações

    return &DeployInfo{
        CommitHash: "...",
        Branch: "main",
        DeployURL: "...",
        Status: "completed",
    }
}
```

---

## 🔐 Segurança na Integração

### Git Token

```go
// Usar token com permissões mínimas
// Apenas: repo (read/write)
// Sem: delete, admin, etc.
GITHUB_TOKEN=ghp_xxx
```

### Validação Antes de Aplicar

```go
func (s *DevStudioService) validateCode(code map[string]string) error {
    // 1. Syntax check básico
    // 2. Verificar paths válidos
    // 3. Verificar tamanho dos arquivos
    // 4. Verificar extensões permitidas

    for path, content := range code {
        // Validar path
        if !isValidPath(path) {
            return fmt.Errorf("path inválido: %s", path)
        }

        // Validar tamanho
        if len(content) > 100000 {
            return fmt.Errorf("arquivo muito grande: %s", path)
        }
    }

    return nil
}
```

---

## ✅ Checklist de Integração

- [ ] Git operations implementadas
- [ ] GitHub token configurado (permissões mínimas)
- [ ] CI/CD trigger testado (automático via push)
- [ ] Status de deploy implementado
- [ ] Validações de segurança
- [ ] Testes end-to-end
- [ ] Deploy em produção

---

**Última atualização**: 2026-01-25  
**Status**: Guia de integração completa
