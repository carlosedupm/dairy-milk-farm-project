'use client'

import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import * as devStudioService from '@/services/devStudio'
import type { CodeGenerationResponse, FileDiff, ValidationResult } from '@/services/devStudio'
import { Copy, Download, X } from 'lucide-react'
import { DiffViewer } from './DiffViewer'

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
  onRequestCancelled?: () => void // Callback quando uma requisição é cancelada
}

export function CodePreview({ code, onCodeUpdated, atLimit = false, onRequestCancelled }: CodePreviewProps) {
  const [currentCode, setCurrentCode] = useState<CodeGenerationResponse | null>(code)
  
  // Sincronizar currentCode com code prop
  useEffect(() => {
    setCurrentCode(code)
  }, [code])
  const [validating, setValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [validationError, setValidationError] = useState('')
  const [implementing, setImplementing] = useState(false)
  const [implementationStatus, setImplementationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [implementationError, setImplementationError] = useState('')
  const [refineFeedback, setRefineFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  const [refineError, setRefineError] = useState('')
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'diff'>('preview')
  const [diffs, setDiffs] = useState<FileDiff[]>([])
  const [diffsLoading, setDiffsLoading] = useState(false)
  const [diffsError, setDiffsError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const handleValidate = async () => {
    if (!currentCode) return

    setValidating(true)
    setValidationStatus('idle')
    setValidationError('')
    setValidationResult(null)

    try {
      const result = await devStudioService.validate(currentCode.request_id)
      setValidationResult(result.validation)
      
      // Verificar se há erros
      if (!result.validation.syntax_valid || result.validation.has_errors) {
        setValidationStatus('error')
        const errorFiles = Object.entries(result.validation.linter_results)
          .filter(([_, lr]) => lr.errors.length > 0)
          .map(([file, lr]) => `${file}: ${lr.errors.join(', ')}`)
          .join('; ')
        setValidationError(`Erros encontrados: ${errorFiles}`)
      } else {
        setValidationStatus('success')
      }
      
      // Atualizar código com status atualizado
      if (onCodeUpdated) {
        // Extrair files do code_changes se necessário
        const files = result.request.code_changes?.files as Record<string, string> | undefined
        const updatedCode: CodeGenerationResponse = {
          request_id: result.request.id,
          files: files || currentCode.files,
          explanation: result.request.code_changes?.explanation as string || currentCode.explanation,
          status: result.request.status,
          pr_number: result.request.pr_number,
          pr_url: result.request.pr_url,
          branch_name: result.request.branch_name,
        }
        setCurrentCode(updatedCode)
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
    if (!currentCode) return

    setImplementing(true)
    setImplementationStatus('idle')
    setImplementationError('')

    try {
      const updatedRequest = await devStudioService.implement(currentCode.request_id)
      setImplementationStatus('success')
      
      // Atualizar código com informações do PR
      if (onCodeUpdated) {
        const files = updatedRequest.code_changes?.files as Record<string, string> | undefined
        const updatedCode: CodeGenerationResponse = {
          request_id: updatedRequest.id,
          files: files || currentCode.files,
          explanation: updatedRequest.code_changes?.explanation as string || currentCode.explanation,
          status: updatedRequest.status,
          pr_number: updatedRequest.pr_number,
          pr_url: updatedRequest.pr_url,
          branch_name: updatedRequest.branch_name,
        }
        setCurrentCode(updatedCode)
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
    if (!currentCode || !refineFeedback.trim() || refining || atLimit) return

    setRefining(true)
    setRefineError('')

    try {
      const refined = await devStudioService.refine(currentCode.request_id, refineFeedback.trim())
      setRefineFeedback('')
      setValidationStatus('idle')
      setValidationError('')
      setImplementationStatus('idle')
      setImplementationError('')
      setCurrentCode(refined)
      if (onCodeUpdated) onCodeUpdated(refined)
    } catch (err: unknown) {
      setRefineError(getRefineErrorMessage(err))
    } finally {
      setRefining(false)
    }
  }

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'go': 'go',
      'ts': 'typescript',
      'tsx': 'tsx',
      'js': 'javascript',
      'jsx': 'jsx',
      'json': 'json',
      'md': 'markdown',
      'sql': 'sql',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sh': 'bash',
      'py': 'python',
      'java': 'java',
      'html': 'html',
      'css': 'css',
    }
    return languageMap[ext || ''] || 'text'
  }

  const handleCopyCode = async (path: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedPath(path)
      setTimeout(() => setCopiedPath(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar código:', error)
    }
  }

  const handleDownloadAll = () => {
    if (!currentCode) return

    const zipContent: Record<string, string> = currentCode.files
    const blob = new Blob([JSON.stringify(zipContent, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dev-studio-${currentCode.request_id}-files.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Carregar diffs quando tab Diff for selecionada
  useEffect(() => {
    if (activeTab === 'diff' && currentCode && diffs.length === 0 && !diffsLoading) {
      loadDiffs()
    }
  }, [activeTab, currentCode])

  const loadDiffs = async () => {
    if (!currentCode) return

    setDiffsLoading(true)
    setDiffsError(null)

    try {
      const loadedDiffs = await devStudioService.getDiff(currentCode.request_id)
      setDiffs(loadedDiffs)
    } catch (err) {
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message
          : 'Erro ao carregar diffs.'
      setDiffsError(errorMessage ?? 'Erro ao carregar diffs.')
    } finally {
      setDiffsLoading(false)
    }
  }

  const handleCancelClick = () => {
    setShowCancelDialog(true)
  }

  const handleCancelConfirm = async () => {
    if (!currentCode) return

    setShowCancelDialog(false)
    setCancelling(true)
    setCancelError(null)

    try {
      await devStudioService.cancel(currentCode.request_id)
      // Atualizar código com status cancelled
      const cancelledCode: CodeGenerationResponse = {
        ...currentCode,
        status: 'cancelled',
      }
      setCurrentCode(cancelledCode)
      if (onCodeUpdated) {
        onCodeUpdated(cancelledCode)
      }
      // Notificar que uma requisição foi cancelada para atualizar histórico
      if (onRequestCancelled) {
        onRequestCancelled()
      }
    } catch (err) {
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message
          : 'Erro ao cancelar requisição.'
      setCancelError(errorMessage ?? 'Erro ao cancelar requisição.')
    } finally {
      setCancelling(false)
    }
  }

  if (!currentCode) {
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Preview de Código</CardTitle>
        {currentCode.status !== 'cancelled' && 
         currentCode.status !== 'implemented' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelClick}
            disabled={cancelling}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            {cancelling ? 'Cancelando...' : 'Cancelar'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {currentCode.explanation && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-semibold mb-2">Explicação:</p>
            <p className="text-sm">{currentCode.explanation}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </Button>
            <Button
              variant={activeTab === 'diff' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('diff')}
            >
              Diff
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Todos
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-[200px] max-h-[600px]">
          {activeTab === 'preview' ? (
            Object.entries(currentCode.files).map(([path, content]) => (
              <div key={path} className="border rounded-md overflow-hidden">
                <div className="bg-muted p-2 font-mono text-sm border-b flex items-center justify-between">
                  <span>{path}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(path, content)}
                    className="h-6 px-2 text-xs"
                  >
                    {copiedPath === path ? (
                      '✓ Copiado'
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <SyntaxHighlighter
                  language={getLanguageFromPath(path)}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                  }}
                  showLineNumbers
                >
                  {content}
                </SyntaxHighlighter>
              </div>
            ))
          ) : (
            <>
              {diffsLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Carregando diffs...
                </p>
              )}
              {diffsError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">{diffsError}</p>
                </div>
              )}
              {!diffsLoading && !diffsError && diffs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum diff disponível.
                </p>
              )}
              {!diffsLoading && !diffsError && diffs.map((diff) => (
                <DiffViewer
                  key={diff.path}
                  oldCode={diff.old_code}
                  newCode={diff.new_code}
                  path={diff.path}
                  isNew={diff.is_new}
                />
              ))}
            </>
          )}
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

          {currentCode.status !== 'cancelled' && (
            <div className="flex gap-2 items-center">
              <Button onClick={handleValidate} disabled={validating || !currentCode}>
                {validating ? 'Validando...' : 'Validar Código'}
              </Button>
              {validationStatus === 'success' && 
               currentCode.status === 'validated' && 
               !currentCode.pr_number && 
               (!validationResult || !validationResult.has_errors) && (
                <Button onClick={handleImplement} disabled={implementing} variant="default">
                  {implementing ? 'Criando PR...' : 'Criar PR'}
                </Button>
              )}
            </div>
          )}
          
          {validationStatus === 'success' && (
            <span className="text-sm text-green-600">✓ Código validado com sucesso</span>
          )}
          {validationStatus === 'error' && (
            <span className="text-sm text-destructive">{validationError}</span>
          )}
          
          {implementationStatus === 'success' && currentCode.pr_number && currentCode.pr_url && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-semibold text-green-900 mb-1">✓ Pull Request criado!</p>
              <a
                href={currentCode.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Ver PR #{currentCode.pr_number} no GitHub →
              </a>
            </div>
          )}
          {implementationStatus === 'error' && (
            <span className="text-sm text-destructive">{implementationError}</span>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Status: {currentCode.status}</p>
          <p>Request ID: {currentCode.request_id}</p>
          {currentCode.branch_name && <p>Branch: {currentCode.branch_name}</p>}
        </div>
      </CardContent>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Requisição</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar esta requisição? O código gerado será descartado e não poderá ser recuperado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelling}
            >
              Não, manter
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
