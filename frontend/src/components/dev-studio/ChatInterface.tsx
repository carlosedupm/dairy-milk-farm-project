'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as devStudioService from '@/services/devStudio'
import type { CodeGenerationResponse } from '@/services/devStudio'
import { Download } from 'lucide-react'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll automático para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading || atLimit) return

    const userMessage: Message = {
      role: 'user',
      content: input,
    }
    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)
    setError('')

    try {
      const response = await devStudioService.chat(currentInput)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      if (loading) {
        // Cancelar requisição se possível (opcional)
        setInput('')
      }
    }
  }

  const handleExportConversation = () => {
    if (messages.length === 0) return

    const markdown = messages
      .map((msg) => {
        const role = msg.role === 'user' ? '**Usuário**' : '**IA**'
        const content = msg.content
        const files = msg.code
          ? `\n\n${Object.keys(msg.code.files).length} arquivo(s) gerado(s)`
          : ''
        return `${role}:\n${content}${files}`
      })
      .join('\n\n---\n\n')

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dev-studio-conversation-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const disabled = loading || atLimit

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dev Studio - Chat</CardTitle>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportConversation}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto space-y-4 min-h-[300px] max-h-[500px] p-4 border rounded-md"
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center">
              Descreva a feature que deseja implementar...
            </p>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-md ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                      : 'bg-muted mr-auto max-w-[80%]'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.code && (
                    <p className="text-xs mt-2 opacity-80">
                      {Object.keys(msg.code.files).length} arquivo(s) gerado(s)
                    </p>
                  )}
                </div>
              ))}
              {loading && (
                <div className="bg-muted mr-auto max-w-[80%] p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Gerando código...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
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
            onKeyDown={handleKeyDown}
            placeholder="Descreva a feature que deseja implementar... (Ctrl+Enter para enviar)"
            disabled={disabled}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={disabled || !input.trim()}>
            {loading ? 'Gerando...' : 'Enviar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </CardContent>
    </Card>
  )
}
