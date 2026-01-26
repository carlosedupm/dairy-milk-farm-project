'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as devStudioService from '@/services/devStudio'
import type { CodeGenerationResponse } from '@/services/devStudio'

type Message = {
  role: 'user' | 'assistant'
  content: string
  code?: CodeGenerationResponse
}

type ChatInterfaceProps = {
  onCodeGenerated: (code: CodeGenerationResponse) => void
  atLimit?: boolean
}

const RATE_LIMIT_MSG =
  'Limite de requisições atingido (5/hora). Tente novamente mais tarde.'

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })
      .response
    if (res?.status === 429) return RATE_LIMIT_MSG
    return res?.data?.error?.message ?? 'Erro ao gerar código. Tente novamente.'
  }
  return 'Erro ao gerar código. Tente novamente.'
}

export function ChatInterface({
  onCodeGenerated,
  atLimit = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!input.trim() || loading || atLimit) return

    const userMessage: Message = {
      role: 'user',
      content: input,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const response = await devStudioService.chat(input)
      const aiMessage: Message = {
        role: 'assistant',
        content: response.explanation || 'Código gerado com sucesso',
        code: response,
      }
      setMessages((prev) => [...prev, aiMessage])
      onCodeGenerated(response)
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      const errorMsg: Message = {
        role: 'assistant',
        content: errorMessage,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || atLimit

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Dev Studio - Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex-1 overflow-y-auto space-y-4 min-h-[300px] max-h-[500px] p-4 border rounded-md">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center">
              Descreva a feature que deseja implementar...
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-md ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                    : 'bg-muted mr-auto max-w-[80%]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.code && (
                  <p className="text-xs mt-2 opacity-80">
                    {Object.keys(msg.code.files).length} arquivo(s) gerado(s)
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {atLimit && (
          <p className="text-sm text-destructive">
            Limite atingido. Aguarde para fazer novas requisições.
          </p>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Descreva a feature que deseja implementar..."
            disabled={disabled}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={disabled || !input.trim()}>
            {loading ? 'Gerando...' : 'Enviar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
