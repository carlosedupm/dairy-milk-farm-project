# 🚀 Guia de Deploy - CeialMilk

Este guia explica como configurar e realizar o deploy automatizado da aplicação CeialMilk no Fly.io.

## 📋 Pré-requisitos

1. **Conta no Fly.io**: [https://fly.io](https://fly.io)
2. **Fly CLI instalado**: `curl -L https://fly.io/install.sh | sh`
3. **Token de API do Fly.io**: Gerado no painel do Fly.io
4. **Repositório no GitHub**: Para CI/CD automatizado

## 🔧 Configuração do Fly.io

### 1. Login no Fly.io
```bash
fly auth login
```

### 2. Criar aplicação no Fly.io
```bash
fly apps create ceialmilk
```

### 3. Configurar variáveis de ambiente
```bash
# Database (usar PostgreSQL managed do Fly.io ou externo)
fly secrets set DATABASE_URL=your-database-url
fly secrets set DB_USERNAME=your-username
fly secrets set DB_PASSWORD=your-password

# Redis (usar Redis managed do Fly.io ou externo)
fly secrets set REDIS_URL=your-redis-url
fly secrets set REDIS_PASSWORD=your-redis-password

# JWT Secret
fly secrets set JWT_SECRET=your-super-secret-jwt-key

# Outras configurações
fly secrets set SPRING_PROFILES_ACTIVE=prod
```

### 4. Configurar recursos (opcional)
```bash
# Scale da aplicação
fly scale show
fly scale memory 512
fly scale vm shared-cpu-1x

# Verificar status
fly status
```

## 🔄 CI/CD com GitHub Actions

### 1. Configurar secrets no GitHub
No repositório do GitHub, vá para:
**Settings → Secrets and variables → Actions**

Adicione os seguintes secrets:
- `FLY_API_TOKEN`: Token de API do Fly.io

### 2. Fluxo do Pipeline
O pipeline está configurado no arquivo `.github/workflows/ci-cd.yml`:

1. **Test**: Executa testes com PostgreSQL e Redis em containers
2. **Build**: Compila a aplicação e gera o JAR
3. **Deploy**: Faz deploy automático no Fly.io quando merge na main

### 3. Trigger manual (opcional)
Para executar o deploy manualmente:
```bash
fly deploy
```

## 🌐 Verificação do Deploy

### Health Check
A aplicação expõe endpoints de health check:
```bash
curl https://ceialmilk.fly.dev/actuator/health
```

### Testar endpoints
```bash
# Listar fazendas
curl https://ceialmilk.fly.dev/api/v1/fazendas

# Health check detalhado
curl https://ceialmilk.fly.dev/actuator/health

# Informações da aplicação
curl https://ceialmilk.fly.dev/actuator/info
```

## 🐛 Troubleshooting

### Problemas comuns:

1. **Erro de conexão com database**
   - Verificar variáveis de ambiente DATABASE_URL
   - Verificar se o database está acessível

2. **Erro de memória**
   - Aumentar memória: `fly scale memory 1024`

3. **Deploy falha**
   - Ver logs: `fly logs`
   - Debug: `fly deploy --verbose`

4. **Health check falha**
   - Verificar se a aplicação está respondendo
   - Ajustar timeout no health check

### Comandos úteis:
```bash
# Ver logs
fly logs

# SSH na máquina
fly ssh console

# Ver status
fly status

# Ver variáveis
fly secrets list

# Restart aplicação
fly apps restart ceialmilk
```

## 📊 Monitoramento

### Fly.io Dashboard
- Acesse: [https://fly.io/dashboard](https://fly.io/dashboard)
- Monitore: CPU, memória, rede, logs

### Métricas da aplicação
- Health: `/actuator/health`
- Metrics: `/actuator/metrics`
- Info: `/actuator/info`

## 🔒 Segurança

### Boas práticas:
1. Use secrets para dados sensíveis
2. Habilite HTTPS obrigatório
3. Configure limites de rate limiting
4. Mantenha dependências atualizadas

### Rotação de secrets:
```bash
# Rotacionar JWT secret
fly secrets set JWT_SECRET=new-super-secret-key

# Rotacionar database password
fly secrets set DB_PASSWORD=new-database-password
```

## 📈 Escalabilidade

### Configurações recomendadas:
```bash
# Para ambiente de produção
fly scale vm performance-1x
fly scale memory 1024

# Para alta disponibilidade
fly scale count 2
```

### Auto-scaling (quando necessário):
```bash
fly autoscale set min=1 max=3
```

---

**Última atualização**: 2025-09-08
**Status**: Configuração de deploy concluída ✅
