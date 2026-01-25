# 🎨 Implementação Frontend: Dev Studio

## 📋 Visão Geral

Este guia detalha os componentes necessários para a interface do Dev Studio no Next.js, com foco na segurança e experiência do desenvolvedor.

## 🧱 Componentes Principais

### 1. ChatInterface com Análise de Impacto

O chat deve exibir não apenas as mensagens, mas um resumo do impacto gerado pela IA.

```typescript
// frontend/src/components/dev-studio/ImpactAnalysis.tsx
export function ImpactAnalysis({ impact }) {
  return (
    <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
      <h4 className="font-bold text-amber-900">Análise de Impacto</h4>
      <ul className="list-disc ml-5 text-amber-800">
        {impact.map(i => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
```

### 2. DiffViewer Realista

Usar uma biblioteca como `react-diff-viewer` para mostrar as mudanças.

```typescript
// frontend/src/components/dev-studio/DiffViewer.tsx
import ReactDiffViewer from 'react-diff-viewer';

export function DiffViewer({ oldCode, newCode, filename }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-100 p-2 font-mono text-sm">{filename}</div>
      <ReactDiffViewer oldValue={oldCode} newValue={newCode} splitView={true} />
    </div>
  );
}
```

### 3. Deploy & PR Status

Monitoramento em tempo real do Pull Request e das Actions.

```typescript
// frontend/src/components/dev-studio/PRStatus.tsx
export function PRStatus({ prNumber, status }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={status === 'merged' ? 'success' : 'pending'}>
        PR #{prNumber}: {status}
      </Badge>
      <a href={`https://github.com/repo/pull/${prNumber}`} target="_blank">Ver no GitHub</a>
    </div>
  );
}
```

## 📁 Estrutura de Pastas

- `/app/dev-studio/page.tsx` - Layout em duas colunas (Chat | Preview)
- `/components/dev-studio/`
  - `ChatInterface.tsx`
  - `ImpactAnalysis.tsx`
  - `DiffViewer.tsx`
  - `PRStatus.tsx`
- `/services/dev-studio.ts` - Chamadas para `/api/v1/dev-studio/*`

## 🔐 Proteção de Rota

A página deve usar o `ProtectedRoute` e validar o `user.perfil === 'DEVELOPER'`.

---

**Última atualização**: 2026-01-25
