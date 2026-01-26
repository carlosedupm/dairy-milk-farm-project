'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import * as devStudioService from '@/services/devStudio'
import type { CodeGenerationResponse } from '@/services/devStudio'

const RATE_LIMIT_MSG =
  'Limite de requisições atingido (5/hora). Tente novamente mais tarde.'

function getRefineErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })
      .response
    if (res?.status === 429) return RATE_LIMIT_MSG
    return res?.data?.error?.message ?? 'Erro ao refinar código. Tente novamente.'
  }
  return 'Erro ao refinar código. Tente novamente.'
}

type CodePreviewProps = {
  code: CodeGenerationResponse | null
  onCodeUpdated?: (code: CodeGenerationResponse) => void
  atLimit?: boolean
}

export function CodePreview({ code, onCodeUpdated, atLimit = false }: CodePreviewProps) {
  const [validating, setValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [validationError, setValidationError] = useState('')
  const [implementing, setImplementing] = useState(false)
  const [implementationStatus, setImplementationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [implementationError, setImplementationError] = useState('')
  const [refineFeedback, setRefineFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  const [refineError, setRefineError] = useState('')

  const handleValidate = async () => {
    if (!code) return

    setValidating(true)
    setValidationStatus('idle')
    setValidationError('')

    try {
      const updatedRequest = await devStudioService.validate(code.request_id)
      setValidationStatus('success')
      
      // Atualizar código com status atualizado
      if (onCodeUpdated) {
        // Extrair files do code_changes se necessário
        const files = updatedRequest.code_changes?.files as Record<string, string> | undefined
        const updatedCode: CodeGenerationResponse = {
          request_id: updatedRequest.id,
          files: files || code.files,
          explanation: updatedRequest.code_changes?.explanation as string || code.explanation,
          status: updatedRequest.status,
          pr_number: updatedRequest.pr_number,
          pr_url: updatedRequest.pr_url,
          branch_name: updatedRequest.branch_name,
        }
        onCodeUpdated(updatedCode)
      }
    } catch (err: unknown) {
      setValidationStatus('error')
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message
          : 'Erro ao validar código.'
      setValidationError(errorMessage ?? 'Erro ao validar código.')
    } finally {
      setValidating(false)
    }
  }

  const handleImplement = async () => {
    if (!code) return

    setImplementing(true)
    setImplementationStatus('idle')
    setImplementationError('')

    try {
      const updatedRequest = await devStudioService.implement(code.request_id)
      setImplementationStatus('success')
      
      // Atualizar código com informações do PR
      if (onCodeUpdated) {
        const files = updatedRequest.code_changes?.files as Record<string, string> | undefined
        const updatedCode: CodeGenerationResponse = {
          request_id: updatedRequest.id,
          files: files || code.files,
          explanation: updatedRequest.code_changes?.explanation as string || code.explanation,
          status: updatedRequest.status,
          pr_number: updatedRequest.pr_number,
          pr_url: updatedRequest.pr_url,
          branch_name: updatedRequest.branch_name,
        }
        onCodeUpdated(updatedCode)
      }
    } catch (err: unknown) {
      setImplementationStatus('error')
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message
          : 'Erro ao criar Pull Request.'
      setImplementationError(errorMessage ?? 'Erro ao criar Pull Request.')
    } finally {
      setImplementing(false)
    }
  }

  const handleRefine = async () => {
    if (!code || !refineFeedback.trim() || refining || atLimit) return

    setRefining(true)
    setRefineError('')

    try {
      const refined = await devStudioService.refine(code.request_id, refineFeedback.trim())
      setRefineFeedback('')
      setValidationStatus('idle')
      setValidationError('')
      setImplementationStatus('idle')
      setImplementationError('')
      if (onCodeUpdated) onCodeUpdated(refined)
    } catch (err: unknown) {
      setRefineError(getRefineErrorMessage(err))
    } finally {
      setRefining(false)
    }
  }

  if (!code) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Preview de Código</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            Nenhum código gerado ainda. Use o chat para gerar código.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Preview de Código</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {code.explanation && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-semibold mb-2">Explicação:</p>
            <p className="text-sm">{code.explanation}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 min-h-[200px] max-h-[600px]">
          {Object.entries(code.files).map(([path, content]) => (
            <div key={path} className="border rounded-md overflow-hidden">
              <div className="bg-muted p-2 font-mono text-sm border-b">{path}</div>
              <pre className="p-4 bg-background text-sm overflow-x-auto">
                <code>{content}</code>
              </pre>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium mb-1">Refinar código (divergente da estrutura?)</p>
            <p className="text-xs text-muted-foreground mb-2">
              Descreva o que ajustar (ex.: &quot;Use response.SuccessOK como em fazenda_handler&quot;,
              &quot;Siga o padrão Handler → Service → Repository&quot;).
            </p>
            <div className="flex gap-2">
              <Input
                value={refineFeedback}
                onChange={(e) => setRefineFeedback(e.target.value)}
                placeholder="Ex.: Use response.SuccessOK, siga fazenda_handler..."
                disabled={refining || atLimit}
                className="flex-1"
              />
              <Button
                onClick={handleRefine}
                disabled={refining || atLimit || !refineFeedback.trim()}
                variant="secondary"
              >
                {refining ? 'Refinando...' : 'Refinar'}
              </Button>
            </div>
            {refineError && (
              <p className="text-sm text-destructive mt-1">{refineError}</p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <Button onClick={handleValidate} disabled={validating || !code}>
              {validating ? 'Validando...' : 'Validar Código'}
            </Button>
            {validationStatus === 'success' && code.status === 'validated' && !code.pr_number && (
              <Button onClick={handleImplement} disabled={implementing} variant="default">
                {implementing ? 'Criando PR...' : 'Criar PR'}
              </Button>
            )}
          </div>
          
          {validationStatus === 'success' && (
            <span className="text-sm text-green-600">✓ Código validado com sucesso</span>
          )}
          {validationStatus === 'error' && (
            <span className="text-sm text-destructive">{validationError}</span>
          )}
          
          {implementationStatus === 'success' && code.pr_number && code.pr_url && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-semibold text-green-900 mb-1">✓ Pull Request criado!</p>
              <a
                href={code.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Ver PR #{code.pr_number} no GitHub →
              </a>
            </div>
          )}
          {implementationStatus === 'error' && (
            <span className="text-sm text-destructive">{implementationError}</span>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Status: {code.status}</p>
          <p>Request ID: {code.request_id}</p>
          {code.branch_name && <p>Branch: {code.branch_name}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
