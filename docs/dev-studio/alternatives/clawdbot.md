# 🛠️ Guia Prático: Implementando Dev Studio com Clawdbot

## 📋 Visão Geral

Este guia mostra como usar **Clawdbot** (self-hosted AI agent platform) para criar uma solução de deploy automatizado de features via IA, otimizada para 1 desenvolvedor com múltiplos projetos.

---

## 🎯 Por Que Clawdbot?

- ✅ **Open Source** (MIT) - 15k+ stars no GitHub
- ✅ **Self-hosted** - Você controla tudo
- ✅ **Extensível** - Sistema de skills/plugins
- ✅ **Control UI** - Interface web pronta
- ✅ **Multi-platform** - Docker, Railway, Render, etc.
- ✅ **Economia** - ~$36/mês vs $95/mês de solução customizada

---

## 🚀 Setup Inicial

### 1. Deploy Clawdbot

#### Opção A: Railway (Recomendado - Mais Fácil)

```bash
# 1. Criar conta no Railway
# 2. Conectar repositório GitHub do Clawdbot
# 3. Deploy automático
# Custo: ~$5-10/mês
```

#### Opção B: Render

```yaml
# render.yaml
services:
  - type: web
    name: clawdbot
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: CLAUDE_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
```

#### Opção C: Docker Local (Desenvolvimento)

```bash
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot
docker-compose up -d
```

### 2. Configurar Control UI

Acesse: `http://localhost:3000` (ou URL do deploy)

Configure:
- API keys (Gemini, Claude, etc.)
- Projetos
- Agents

---

## 🧩 Custom Skills para Dev Studio

### Skill 1: Code Generator (Gemini API)

**Arquivo**: `clawdbot/skills/code_generator.py`

```python
import os
import google.generativeai as genai
from typing import Dict, List

class CodeGeneratorSkill:
    """Gera código usando Gemini API com contexto do projeto"""
    
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel(
            'gemini-2.5-pro',
            generation_config={
                'temperature': 0.3,  # Mais determinístico para código
                'max_output_tokens': 8192,
            }
        )
    
    async def generate(self, prompt: str, project_id: str) -> Dict:
        """Gera código baseado no prompt e contexto do projeto"""
        
        # Carregar contexto do projeto
        context = await self._load_project_context(project_id)
        
        # Construir prompt completo
        full_prompt = f"""
Você é um desenvolvedor experiente trabalhando no projeto {project_id}.

PADRÕES ARQUITETURAIS:
{context['system_patterns']}

STACK TECNOLÓGICA:
{context['tech_context']}

ESTADO ATUAL:
{context['active_context']}

TAREFA SOLICITADA:
{prompt}

Por favor, gere o código necessário seguindo:
1. Os padrões arquiteturais documentados
2. A stack tecnológica especificada
3. Mantendo consistência com o código existente
4. Incluindo comentários quando necessário

Retorne o código em formato JSON:
{{
  "files": {{
    "path/to/file.go": "conteúdo do arquivo",
    "path/to/file.tsx": "conteúdo do arquivo"
  }},
  "explanation": "explicação do que foi implementado",
  "tests": "testes básicos (opcional)"
}}
"""
        
        # Gerar código
        response = self.model.generate_content(full_prompt)
        
        # Parsear resposta JSON
        code_data = self._parse_json_response(response.text)
        
        return {
            'files': code_data.get('files', {}),
            'explanation': code_data.get('explanation', ''),
            'tests': code_data.get('tests', ''),
        }
    
    async def _load_project_context(self, project_id: str) -> Dict:
        """Carrega contexto do projeto (memory-bank)"""
        # Configuração do projeto
        config = self._get_project_config(project_id)
        
        context = {
            'system_patterns': self._read_file(config['system_patterns_path']),
            'tech_context': self._read_file(config['tech_context_path']),
            'active_context': self._read_file(config['active_context_path']),
        }
        
        return context
    
    def _get_project_config(self, project_id: str) -> Dict:
        """Retorna configuração do projeto"""
        # Configurações hardcoded ou de banco de dados
        projects = {
            'ceialmilk': {
                'repo': 'github.com/seu-usuario/ceialmilk',
                'system_patterns_path': 'memory-bank/systemPatterns.md',
                'tech_context_path': 'memory-bank/techContext.md',
                'active_context_path': 'memory-bank/activeContext.md',
            },
            # Adicionar outros projetos aqui
        }
        return projects.get(project_id, {})
    
    def _read_file(self, path: str) -> str:
        """Lê arquivo do repositório"""
        # Implementar leitura via Git API ou filesystem
        # Por enquanto, retorna placeholder
        return f"Conteúdo de {path}"
    
    def _parse_json_response(self, text: str) -> Dict:
        """Extrai JSON da resposta da IA"""
        import json
        import re
        
        # Tentar encontrar JSON no texto
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {}
```

---

### Skill 2: Project Context Loader

**Arquivo**: `clawdbot/skills/project_context.py`

```python
import os
import requests
from typing import Dict, Optional

class ProjectContextSkill:
    """Carrega contexto de projetos (memory-bank)"""
    
    def __init__(self):
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"
    
    async def load_context(self, project_id: str) -> Dict:
        """Carrega contexto completo do projeto"""
        config = self._get_project_config(project_id)
        
        if not config:
            raise ValueError(f"Projeto {project_id} não encontrado")
        
        # Ler arquivos do memory-bank via GitHub API
        context = {
            'system_patterns': await self._read_github_file(
                config['repo'], 
                config['system_patterns_path']
            ),
            'tech_context': await self._read_github_file(
                config['repo'],
                config['tech_context_path']
            ),
            'active_context': await self._read_github_file(
                config['repo'],
                config['active_context_path']
            ),
        }
        
        return context
    
    async def _read_github_file(self, repo: str, path: str) -> str:
        """Lê arquivo do GitHub via API"""
        url = f"{self.base_url}/repos/{repo}/contents/{path}"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3.raw"
        }
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.text
        return ""
    
    def _get_project_config(self, project_id: str) -> Optional[Dict]:
        """Retorna configuração do projeto"""
        # Pode vir de banco de dados ou arquivo de config
        projects = {
            'ceialmilk': {
                'repo': 'seu-usuario/ceialmilk',
                'system_patterns_path': 'memory-bank/systemPatterns.md',
                'tech_context_path': 'memory-bank/techContext.md',
                'active_context_path': 'memory-bank/activeContext.md',
            },
        }
        return projects.get(project_id)
```

---

### Skill 3: Git Operations

**Arquivo**: `clawdbot/skills/git_operations.py`

```python
import os
import subprocess
import tempfile
import shutil
from typing import Dict

class GitOperationsSkill:
    """Operações Git (clone, commit, push)"""
    
    def __init__(self):
        self.work_dir = os.getenv("GIT_WORK_DIR", "/tmp/clawdbot-repos")
        os.makedirs(self.work_dir, exist_ok=True)
    
    async def apply_changes(
        self, 
        project_id: str, 
        repo: str, 
        branch: str,
        changes: Dict[str, str],
        commit_message: str
    ) -> bool:
        """Aplica mudanças no repositório Git"""
        
        repo_path = os.path.join(self.work_dir, project_id)
        
        # Clone ou update
        if not os.path.exists(repo_path):
            await self._clone_repo(repo, repo_path)
        else:
            await self._update_repo(repo_path, branch)
        
        # Aplicar mudanças
        for file_path, content in changes.items():
            full_path = os.path.join(repo_path, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        # Commit
        subprocess.run(
            ['git', 'add', '.'],
            cwd=repo_path,
            check=True
        )
        
        subprocess.run(
            ['git', 'commit', '-m', commit_message],
            cwd=repo_path,
            check=True
        )
        
        # Push
        subprocess.run(
            ['git', 'push', 'origin', branch],
            cwd=repo_path,
            check=True
        )
        
        return True
    
    async def _clone_repo(self, repo: str, repo_path: str):
        """Clona repositório"""
        github_token = os.getenv("GITHUB_TOKEN")
        repo_url = f"https://{github_token}@github.com/{repo}.git"
        
        subprocess.run(
            ['git', 'clone', repo_url, repo_path],
            check=True
        )
    
    async def _update_repo(self, repo_path: str, branch: str):
        """Atualiza repositório"""
        subprocess.run(
            ['git', 'checkout', branch],
            cwd=repo_path,
            check=True
        )
        subprocess.run(
            ['git', 'pull', 'origin', branch],
            cwd=repo_path,
            check=True
        )
```

---

### Skill 4: CI/CD Trigger

**Arquivo**: `clawdbot/skills/cicd_trigger.py`

```python
import os
import requests
from typing import Dict, Optional

class CICDTriggerSkill:
    """Trigger CI/CD após push"""
    
    def __init__(self):
        self.github_token = os.getenv("GITHUB_TOKEN")
    
    async def trigger(self, project_id: str, cicd_config: Dict):
        """Trigger CI/CD baseado na configuração"""
        
        cicd_type = cicd_config.get('type', 'github_actions')
        
        if cicd_type == 'github_actions':
            # GitHub Actions é automático via push
            return {'status': 'triggered', 'message': 'CI/CD será executado automaticamente via push'}
        
        elif cicd_type == 'webhook':
            # Trigger webhook customizado
            webhook_url = cicd_config.get('webhook')
            if webhook_url:
                response = requests.post(webhook_url, json={
                    'project_id': project_id,
                    'event': 'code_deployed'
                })
                return {'status': 'triggered', 'response': response.status_code}
        
        elif cicd_type == 'render':
            # Render detecta push automaticamente
            return {'status': 'triggered', 'message': 'Render detectará push automaticamente'}
        
        elif cicd_type == 'vercel':
            # Vercel detecta push automaticamente
            return {'status': 'triggered', 'message': 'Vercel detectará push automaticamente'}
        
        return {'status': 'unknown', 'message': 'Tipo de CI/CD não suportado'}
```

---

## 🔗 Agent Principal: Dev Studio Agent

**Arquivo**: `clawdbot/agents/dev_studio_agent.py`

```python
from clawdbot.skills.code_generator import CodeGeneratorSkill
from clawdbot.skills.git_operations import GitOperationsSkill
from clawdbot.skills.cicd_trigger import CICDTriggerSkill
from clawdbot.skills.project_context import ProjectContextSkill

class DevStudioAgent:
    """Agent principal para Dev Studio"""
    
    def __init__(self):
        self.code_generator = CodeGeneratorSkill()
        self.git_ops = GitOperationsSkill()
        self.cicd_trigger = CICDTriggerSkill()
        self.context_loader = ProjectContextSkill()
    
    async def process_request(
        self,
        project_id: str,
        prompt: str,
        user_id: str
    ) -> Dict:
        """Processa request completo: gera código → aplica → deploy"""
        
        # 1. Carregar contexto do projeto
        context = await self.context_loader.load_context(project_id)
        
        # 2. Gerar código
        code_result = await self.code_generator.generate(prompt, project_id)
        
        # 3. Aplicar mudanças no Git
        project_config = self._get_project_config(project_id)
        await self.git_ops.apply_changes(
            project_id=project_id,
            repo=project_config['repo'],
            branch=project_config['branch'],
            changes=code_result['files'],
            commit_message=f"Auto: {prompt[:50]}"
        )
        
        # 4. Trigger CI/CD
        cicd_result = await self.cicd_trigger.trigger(
            project_id,
            project_config['cicd']
        )
        
        return {
            'status': 'completed',
            'code': code_result,
            'git': {'status': 'pushed'},
            'cicd': cicd_result,
            'explanation': code_result['explanation'],
        }
    
    def _get_project_config(self, project_id: str) -> Dict:
        """Retorna configuração do projeto"""
        # Pode vir de banco de dados
        return {
            'repo': 'seu-usuario/ceialmilk',
            'branch': 'main',
            'cicd': {
                'type': 'github_actions',
            }
        }
```

---

## 📝 Configuração de Projetos

**Arquivo**: `clawdbot/config/projects.json`

```json
{
  "projects": {
    "ceialmilk": {
      "name": "CeialMilk",
      "repo": "seu-usuario/ceialmilk",
      "branch": "main",
      "cicd": {
        "type": "github_actions",
        "trigger": "push"
      },
      "context": {
        "system_patterns": "memory-bank/systemPatterns.md",
        "tech_context": "memory-bank/techContext.md",
        "active_context": "memory-bank/activeContext.md"
      },
      "security": {
        "require_approval": false,
        "rate_limit": {
          "requests_per_hour": 10
        }
      }
    },
    "outro-projeto": {
      "name": "Outro Projeto",
      "repo": "seu-usuario/outro-projeto",
      "branch": "main",
      "cicd": {
        "type": "vercel",
        "trigger": "webhook",
        "webhook": "https://api.vercel.com/v1/integrations/deploy/xxx"
      },
      "context": {
        "system_patterns": "docs/architecture.md",
        "tech_context": "docs/tech-stack.md"
      }
    }
  }
}
```

---

## 🎮 Uso via Control UI

### Fluxo de Uso

1. **Acessar Control UI**: `http://seu-clawdbot.com`

2. **Selecionar Agent**: "Dev Studio Agent"

3. **Enviar Prompt**:
   ```
   Preciso adicionar um endpoint para listar animais de uma fazenda
   ```

4. **Agent Processa**:
   - Carrega contexto do CeialMilk
   - Gera código com Gemini
   - Aplica no Git
   - Trigger CI/CD

5. **Resultado**:
   - Código gerado
   - Commit feito
   - Deploy iniciado

---

## 🔐 Variáveis de Ambiente

```bash
# .env
GEMINI_API_KEY=your_gemini_api_key
GITHUB_TOKEN=ghp_your_github_token
GIT_WORK_DIR=/tmp/clawdbot-repos

# Opcional (se usar Claude)
CLAUDE_API_KEY=your_claude_api_key
```

---

## 💰 Custo Estimado

### Infraestrutura
- **Railway/Render**: $5-10/mês (hobby plan)

### APIs
- **Gemini API**: ~$26/mês (100 requests)
- **GitHub API**: $0 (dentro do limite free)

### Total
- **~$31-36/mês**

---

## 🚀 Deploy em Produção

### Railway (Recomendado)

1. Conectar repositório GitHub do Clawdbot
2. Configurar variáveis de ambiente
3. Deploy automático

### Render

1. Criar novo serviço web
2. Conectar repositório
3. Configurar Dockerfile
4. Adicionar variáveis de ambiente

---

## 📊 Monitoramento

### Logs
- Clawdbot tem sistema de logs integrado
- Verificar logs no Control UI

### Métricas
- Requests por projeto
- Custo de API (Gemini)
- Taxa de sucesso

---

## 🔄 Próximos Passos

1. **Deploy Clawdbot** (Railway/Render)
2. **Criar Skills Customizados** (code generator, git ops, etc.)
3. **Configurar Projetos** (CeialMilk, etc.)
4. **Testar Fluxo Completo**
5. **Iterar e Melhorar**

---

**Última atualização**: 2026-01-25  
**Status**: Guia prático de implementação  
**Recomendação**: Clawdbot + Gemini API
