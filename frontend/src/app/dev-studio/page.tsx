'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ChatInterface } from '@/components/dev-studio/ChatInterface'
import { CodePreview } from '@/components/dev-studio/CodePreview'
import { PRStatus } from '@/components/dev-studio/PRStatus'
import { UsageAlert } from '@/components/dev-studio/UsageAlert'
import { HistoryPanel } from '@/components/dev-studio/HistoryPanel'
import { useAuth } from '@/contexts/AuthContext'
import * as devStudioService from '@/services/devStudio'
import type { CodeGenerationResponse, UsageStats, DevStudioRequest } from '@/services/devStudio'

const USAGE_REFRESH_MS = 90_000
const PR_STATUS_REFRESH_MS = 30_000 // 30 segundos

export default function DevStudioPage() {
  const { user } = useAuth()
  const [currentCode, setCurrentCode] = useState<CodeGenerationResponse | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)

  const fetchUsage = useCallback(async () => {
    try {
      const u = await devStudioService.getUsage()
      setUsage(u)
    } catch {
      setUsage(null)
    } finally {
      setUsageLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
    const id = setInterval(fetchUsage, USAGE_REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchUsage])

  // Polling de status do PR
  const fetchPRStatus = useCallback(async () => {
    if (!currentCode?.request_id) return

    try {
      const status = await devStudioService.getStatus(currentCode.request_id)
      // Atualizar apenas se houver mudanças relevantes
      if (
        status.status !== currentCode.status ||
        status.pr_number !== currentCode.pr_number ||
        status.pr_url !== currentCode.pr_url
      ) {
        const files = status.code_changes?.files as Record<string, string> | undefined
        const explanation = status.code_changes?.explanation as string | undefined
        
        if (files && explanation) {
          setCurrentCode({
            request_id: status.id,
            files,
            explanation,
            status: status.status,
            pr_number: status.pr_number,
            pr_url: status.pr_url,
            branch_name: status.branch_name,
          })
        }
      }
    } catch (error) {
      // Silenciosamente falhar - não queremos interromper a experiência
      console.error('Erro ao buscar status do PR:', error)
    }
  }, [currentCode])

  useEffect(() => {
    if (!currentCode?.pr_number) return

    fetchPRStatus()
    const id = setInterval(fetchPRStatus, PR_STATUS_REFRESH_MS)
    return () => clearInterval(id)
  }, [currentCode?.pr_number, fetchPRStatus])

  // Verificar perfil DEVELOPER
  if (user?.perfil !== 'DEVELOPER') {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Apenas usuários com perfil DEVELOPER podem acessar o Dev Studio.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const atLimit = Boolean(
    usage && usage.used_last_hour >= usage.limit_per_hour
  )

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Dev Studio</h1>

        <UsageAlert usage={usage} loading={usageLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <ChatInterface
              onCodeGenerated={(code) => {
                setCurrentCode(code)
                fetchUsage()
              }}
              atLimit={atLimit}
              onCodeCleared={() => setCurrentCode(null)}
            />
          </div>
          <div>
            <CodePreview
              code={currentCode}
              onCodeUpdated={setCurrentCode}
              atLimit={atLimit}
              onRequestCancelled={() => {
                // Forçar atualização do histórico
                setHistoryRefreshTrigger((prev) => prev + 1)
              }}
            />
          </div>
        </div>

        {currentCode?.pr_number && currentCode.pr_url && (
          <div className="mt-6">
            <PRStatus
              prNumber={currentCode.pr_number}
              prURL={currentCode.pr_url}
              branchName={currentCode.branch_name}
              status={currentCode.status}
            />
          </div>
        )}

        <div className="mt-6">
          <HistoryPanel
            refreshTrigger={historyRefreshTrigger}
            onSelectRequest={(request: DevStudioRequest) => {
              // Converter DevStudioRequest para CodeGenerationResponse
              const files = request.code_changes?.files as Record<string, string> | undefined
              const explanation = request.code_changes?.explanation as string | undefined
              
              if (files && explanation) {
                const codeResponse: CodeGenerationResponse = {
                  request_id: request.id,
                  files,
                  explanation,
                  status: request.status,
                  pr_number: request.pr_number,
                  pr_url: request.pr_url,
                  branch_name: request.branch_name,
                }
                setCurrentCode(codeResponse)
              }
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
