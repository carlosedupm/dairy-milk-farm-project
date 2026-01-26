'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ChatInterface } from '@/components/dev-studio/ChatInterface'
import { CodePreview } from '@/components/dev-studio/CodePreview'
import { PRStatus } from '@/components/dev-studio/PRStatus'
import { useAuth } from '@/contexts/AuthContext'
import type { CodeGenerationResponse } from '@/services/devStudio'

export default function DevStudioPage() {
  const { user } = useAuth()
  const [currentCode, setCurrentCode] = useState<CodeGenerationResponse | null>(null)

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

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Dev Studio</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <ChatInterface onCodeGenerated={setCurrentCode} />
          </div>
          <div>
            <CodePreview code={currentCode} onCodeUpdated={setCurrentCode} />
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
      </div>
    </ProtectedRoute>
  )
}
