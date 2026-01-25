# 🛠️ Guia Prático: Gemini CLI + MCPs para Dev Studio

## 📋 Visão Geral

Este guia mostra como implementar Dev Studio usando **Gemini CLI** (gratuito) + **MCPs** (gratuitos) + **Cursor PRO** (que você já tem).

**Custo Total**: **$0 adicional** (apenas Cursor PRO que você já paga)

---

## 🚀 Setup Inicial

### 1. Instalar Gemini CLI

```bash
# Instalação global
npm install -g @google/gemini-cli

# Verificar instalação
gemini-cli --version
```

### 2. Autenticar com Google Account

```bash
# Autenticar (abre browser)
gemini-cli auth

# Verificar autenticação
gemini-cli whoami
```

**Free Tier com Google Account**:
- ✅ 60 requests/minuto
- ✅ 1,000 requests/dia
- ✅ Acesso a modelos Pro

### 3. Testar Sandbox

```bash
# Testar geração de código com sandbox
gemini-cli --sandbox "generate a hello world function in Go"
```

---

## 🔌 Setup MCPs no Cursor

### 1. Instalar MCP Servers

```bash
# Git MCP Server
npm install -g @modelcontextprotocol/server-git

# GitHub MCP Server
npm install -g @modelcontextprotocol/server-github

# Filesystem MCP Server
npm install -g @modelcontextprotocol/server-filesystem
```

### 2. Configurar no Cursor

**Arquivo**: `~/.cursor/mcp.json` (ou via Settings → MCP & Integrations)

```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "env": {
        "GIT_REPO_PATH": "/path/to/your/repos"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": ["/workspace", "/tmp"]
      }
    }
  }
}
```

### 3. Verificar Conexão

No Cursor:
- Settings → MCP & Integrations
- Verificar se servidores aparecem como conectados
- Testar comandos MCP

---

## 🛠️ Criar Custom MCP Server para Dev Studio

### Estrutura do Projeto

```
dev-studio-mcp/
├── package.json
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── code-generator.ts
│   │   ├── git-operations.ts
│   │   └── project-context.ts
└── tsconfig.json
```

### package.json

```json
{
  "name": "dev-studio-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "child_process": "^1.0.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### src/index.ts

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CodeGeneratorTool } from "./tools/code-generator.js";
import { GitOperationsTool } from "./tools/git-operations.js";
import { ProjectContextTool } from "./tools/project-context.js";

class DevStudioMCPServer {
  private server: Server;
  private codeGenerator: CodeGeneratorTool;
  private gitOps: GitOperationsTool;
  private projectContext: ProjectContextTool;

  constructor() {
    this.server = new Server(
      {
        name: "dev-studio-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.codeGenerator = new CodeGeneratorTool();
    this.gitOps = new GitOperationsTool();
    this.projectContext = new ProjectContextTool();

    this.setupHandlers();
  }

  private setupHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_code",
          description: "Gera código usando Gemini CLI com contexto do projeto",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "string",
                description: "ID do projeto (ex: ceialmilk)",
              },
              prompt: {
                type: "string",
                description: "Descrição da feature a implementar",
              },
            },
            required: ["project_id", "prompt"],
          },
        },
        {
          name: "apply_changes",
          description: "Aplica mudanças no Git (commit e push)",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "string",
                description: "ID do projeto",
              },
              files: {
                type: "object",
                description: "Mapa de arquivos (path -> content)",
              },
              commit_message: {
                type: "string",
                description: "Mensagem de commit",
              },
            },
            required: ["project_id", "files", "commit_message"],
          },
        },
        {
          name: "load_project_context",
          description: "Carrega contexto do projeto (memory-bank)",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "string",
                description: "ID do projeto",
              },
            },
            required: ["project_id"],
          },
        },
      ],
    }));

    // Executar ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "generate_code":
            return await this.codeGenerator.generate(
              args.project_id,
              args.prompt
            );

          case "apply_changes":
            return await this.gitOps.applyChanges(
              args.project_id,
              args.files,
              args.commit_message
            );

          case "load_project_context":
            return await this.projectContext.load(args.project_id);

          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Erro: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Dev Studio MCP Server rodando");
  }
}

const server = new DevStudioMCPServer();
server.run().catch(console.error);
```

### src/tools/code-generator.ts

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import { ProjectContextTool } from "./project-context.js";

const execAsync = promisify(exec);

export class CodeGeneratorTool {
  private projectContext: ProjectContextTool;

  constructor() {
    this.projectContext = new ProjectContextTool();
  }

  async generate(projectId: string, prompt: string) {
    // 1. Carregar contexto do projeto
    const context = await this.projectContext.load(projectId);

    // 2. Construir prompt completo
    const fullPrompt = `
Você é um desenvolvedor experiente trabalhando no projeto ${projectId}.

PADRÕES ARQUITETURAIS:
${context.system_patterns}

STACK TECNOLÓGICA:
${context.tech_context}

ESTADO ATUAL:
${context.active_context}

TAREFA SOLICITADA:
${prompt}

Por favor, gere o código necessário seguindo os padrões documentados.
Retorne apenas o código, sem explicações adicionais.
`;

    // 3. Chamar Gemini CLI com sandbox
    try {
      const { stdout, stderr } = await execAsync(
        `gemini-cli --sandbox "${fullPrompt.replace(/"/g, '\\"')}"`
      );

      if (stderr) {
        console.error("Gemini CLI stderr:", stderr);
      }

      // 4. Parsear código gerado
      const code = this.parseCode(stdout);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              files: code.files,
              explanation: code.explanation,
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Erro ao gerar código: ${error.message}`);
    }
  }

  private parseCode(output: string): { files: Record<string, string>; explanation: string } {
    // Tentar extrair JSON do output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Se não for JSON, tratar como código único
      }
    }

    // Fallback: tratar output como código único
    return {
      files: {
        "generated_code.go": output,
      },
      explanation: "Código gerado pelo Gemini CLI",
    };
  }
}
```

### src/tools/git-operations.ts

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

export class GitOperationsTool {
  private workDir = process.env.GIT_WORK_DIR || "/tmp/dev-studio-repos";

  async applyChanges(
    projectId: string,
    files: Record<string, string>,
    commitMessage: string
  ) {
    const repoPath = path.join(this.workDir, projectId);

    try {
      // 1. Clone ou update repo
      if (!(await this.exists(repoPath)))) {
        await this.cloneRepo(projectId, repoPath);
      } else {
        await this.updateRepo(repoPath);
      }

      // 2. Aplicar mudanças
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(repoPath, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, "utf-8");
      }

      // 3. Commit
      await execAsync("git add .", { cwd: repoPath });
      await execAsync(`git commit -m "${commitMessage}"`, { cwd: repoPath });

      // 4. Push
      await execAsync("git push origin main", { cwd: repoPath });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: "Mudanças aplicadas e commitadas com sucesso",
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Erro ao aplicar mudanças: ${error.message}`);
    }
  }

  private async cloneRepo(projectId: string, repoPath: string) {
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = this.getProjectRepo(projectId);
    const repoUrl = `https://${githubToken}@github.com/${repo}.git`;

    await execAsync(`git clone ${repoUrl} ${repoPath}`);
  }

  private async updateRepo(repoPath: string) {
    await execAsync("git pull origin main", { cwd: repoPath });
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private getProjectRepo(projectId: string): string {
    // Configuração de projetos (pode vir de arquivo ou banco)
    const projects: Record<string, string> = {
      ceialmilk: "seu-usuario/ceialmilk",
      // Adicionar outros projetos
    };
    return projects[projectId] || "";
  }
}
```

### src/tools/project-context.ts

```typescript
import * as fs from "fs/promises";
import * as path from "path";

export class ProjectContextTool {
  private projectsDir = process.env.PROJECTS_DIR || "/workspace";

  async load(projectId: string) {
    const projectPath = path.join(this.projectsDir, projectId);

    try {
      const [systemPatterns, techContext, activeContext] = await Promise.all([
        this.readFile(path.join(projectPath, "memory-bank/systemPatterns.md")),
        this.readFile(path.join(projectPath, "memory-bank/techContext.md")),
        this.readFile(path.join(projectPath, "memory-bank/activeContext.md")),
      ]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              system_patterns: systemPatterns,
              tech_context: techContext,
              active_context: activeContext,
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Erro ao carregar contexto: ${error.message}`);
    }
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return "";
    }
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Build e Instalação

```bash
# Instalar dependências
npm install

# Build
npm run build

# Instalar globalmente (opcional)
npm link
```

### Configurar no Cursor

Adicionar ao `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "dev-studio": {
      "command": "node",
      "args": ["/path/to/dev-studio-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token",
        "GIT_WORK_DIR": "/tmp/dev-studio-repos",
        "PROJECTS_DIR": "/workspace"
      }
    }
  }
}
```

---

## 🎮 Uso no Cursor

### Fluxo Completo

1. **Abrir Cursor**
2. **Abrir Chat** (Cmd+L ou Ctrl+L)
3. **Usar MCP Tools**:

```
@dev-studio load_project_context project_id=ceialmilk
```

```
@dev-studio generate_code project_id=ceialmilk prompt="Preciso adicionar um endpoint para listar animais"
```

```
@dev-studio apply_changes project_id=ceialmilk files={...} commit_message="Add animals endpoint"
```

### Exemplo de Conversa

```
Você: Preciso adicionar um endpoint para listar animais de uma fazenda

Cursor (usando MCP):
1. Carrega contexto do CeialMilk
2. Gera código com Gemini CLI (sandbox)
3. Mostra preview do código
4. Você aprova
5. Aplica mudanças no Git
6. Faz commit e push
7. CI/CD é triggerado automaticamente
```

---

## 🔐 Segurança

### 1. Gemini CLI Sandbox

```bash
# Sempre usar --sandbox
gemini-cli --sandbox "generate code"
```

**Isolamento**:
- Docker/Podman container
- Sem acesso ao sistema host
- Limpeza automática após execução

### 2. Validação de Código

```typescript
// Adicionar validação antes de aplicar
async function validateCode(code: string): Promise<boolean> {
  // Syntax check
  // Linter
  // Testes básicos
  return true;
}
```

### 3. Git Token

```bash
# Token com permissões mínimas
# Apenas: repo (read/write), sem delete, sem admin
GITHUB_TOKEN=ghp_xxx
```

### 4. Rate Limiting

```typescript
// Implementar rate limiting
const rateLimiter = {
  requests: new Map<string, number[]>(),
  
  check(projectId: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(projectId) || [];
    const recent = requests.filter(t => now - t < 3600000); // 1 hora
    
    if (recent.length >= 10) {
      return false; // Limite: 10 requests/hora
    }
    
    recent.push(now);
    this.requests.set(projectId, recent);
    return true;
  }
};
```

---

## 💰 Otimização de Custos

### 1. Maximizar Free Tier

```typescript
// Alternar entre CLI e API conforme necessário
if (requestsToday < 1000) {
  // Usar Gemini CLI (free tier)
} else {
  // Usar Gemini API (free tier: 1,500 req/dia)
}
```

### 2. Cache de Contexto

```typescript
// Cache do memory-bank
const contextCache = new Map<string, { data: any; timestamp: number }>();

async function getCachedContext(projectId: string) {
  const cached = contextCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.data; // Cache válido por 1 hora
  }
  
  const context = await loadContext(projectId);
  contextCache.set(projectId, { data: context, timestamp: Date.now() });
  return context;
}
```

### 3. Batch Requests

```typescript
// Agrupar requests similares
const batch: string[] = [];
setInterval(() => {
  if (batch.length > 0) {
    processBatch(batch);
    batch.length = 0;
  }
}, 60000); // A cada minuto
```

---

## 📊 Monitoramento

### Logs

```typescript
// Logging de todas as operações
function logOperation(operation: string, projectId: string, details: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation,
    project_id: projectId,
    details,
  }));
}
```

### Métricas

```typescript
// Rastrear uso
const metrics = {
  requests: 0,
  successful: 0,
  failed: 0,
  cost: 0, // $0 (free tier)
};
```

---

## 🚀 Deploy

### Opção 1: Local (Desenvolvimento)

```bash
# Rodar MCP server localmente
cd dev-studio-mcp
npm run build
node dist/index.js
```

### Opção 2: Global (Produção)

```bash
# Instalar globalmente
npm link

# Rodar como serviço (systemd, PM2, etc.)
pm2 start dist/index.js --name dev-studio-mcp
```

---

## ✅ Checklist de Implementação

- [ ] Instalar Gemini CLI
- [ ] Autenticar com Google Account
- [ ] Instalar MCP Servers (Git, GitHub, Filesystem)
- [ ] Configurar MCPs no Cursor
- [ ] Criar Custom MCP Server (opcional)
- [ ] Testar geração de código
- [ ] Testar operações Git
- [ ] Configurar projetos
- [ ] Implementar validações de segurança
- [ ] Implementar rate limiting
- [ ] Testar fluxo completo
- [ ] Documentar uso

---

**Última atualização**: 2026-01-25  
**Status**: Guia prático completo  
**Custo**: $0 adicional (apenas Cursor PRO)
