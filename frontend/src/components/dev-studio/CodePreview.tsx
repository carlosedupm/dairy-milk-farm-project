'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as devStudioService from '@/services/devStudio'
import type { CodeGenerationResponse } from '@/services/devStudio'

type CodePreviewProps = {
  code: CodeGenerationResponse | null
  onCodeUpdated?: (code: CodeGenerationResponse) => void
}

export function CodePreview({ code, onCodeUpdated }: CodePreviewProps) {
  const [validating, setValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [validationError, setValidationError] = useState('')

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

        <div className="flex gap-2 items-center">
          <Button onClick={handleValidate} disabled={validating || !code}>
            {validating ? 'Validando...' : 'Validar Código'}
          </Button>
          {validationStatus === 'success' && (
            <span className="text-sm text-green-600">✓ Código validado com sucesso</span>
          )}
          {validationStatus === 'error' && (
            <span className="text-sm text-destructive">{validationError}</span>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Status: {code.status}</p>
          <p>Request ID: {code.request_id}</p>
        </div>
      </CardContent>
    </Card>
  )
}
