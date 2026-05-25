/**
 * Extrai mensagem de erro padronizada a partir de erros de resposta da API.
 * Trata response.data.error (string ou objeto com message/details) e status 429 (rate limit).
 */
const RATE_LIMIT_MESSAGE =
  'Limite de requisições atingido. Tente novamente mais tarde.'

type AxiosErrorShape = {
  response?: {
    status?: number
    data?: {
      error?: string | {
        message?: string
        details?: string | { conformidade?: string } | unknown
      }
    }
  }
}

function conformidadeFromDetails(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') return undefined
  const code = (details as { conformidade?: string }).conformidade
  return typeof code === 'string' && code.trim() ? code.trim() : undefined
}

function withConformidadePrefix(code: string | undefined, message: string): string {
  if (!code) return message
  return `[${code}] ${message}`
}

const PREFIXED_CONFORMIDADE_RE = /^\[(INT-\d{3}|TMP-\d{3})\]\s*(.*)$/s

/** Separa código prefixado (ex. `[TMP-003] mensagem`) do texto exibido. */
export function parsePrefixedConformidadeMessage(message: string): {
  conformidadeCode?: string
  message: string
} {
  const trimmed = message.trim()
  if (!trimmed) return { message: '' }
  const match = PREFIXED_CONFORMIDADE_RE.exec(trimmed)
  if (!match) return { message: trimmed }
  const body = match[2]?.trim() ?? ''
  return {
    conformidadeCode: match[1],
    message: body || trimmed,
  }
}

/** Lê `error.details.conformidade` de respostas da API (INT-xxx / TMP-xxx). */
export function getApiErrorConformidadeCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return undefined
  }
  const res = (err as AxiosErrorShape).response
  if (!res) return undefined
  const errorPayload = res.data?.error
  if (!errorPayload || typeof errorPayload !== 'object') return undefined
  const details = errorPayload.details
  if (typeof details === 'string') return undefined
  return conformidadeFromDetails(details)
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return fallback
  }
  const res = (err as AxiosErrorShape).response
  if (!res) return fallback

  if (res.status === 429) {
    return RATE_LIMIT_MESSAGE
  }

  const errorPayload = res.data?.error
  if (typeof errorPayload === 'string' && errorPayload.trim()) {
    return errorPayload.trim()
  }
  if (errorPayload && typeof errorPayload === 'object') {
    const details = errorPayload.details
    const conformidade =
      typeof details === 'string'
        ? undefined
        : conformidadeFromDetails(details)
    if (typeof details === 'string' && details.trim()) {
      return withConformidadePrefix(conformidade, details.trim())
    }
    const message = errorPayload.message
    if (typeof message === 'string' && message.trim()) {
      return withConformidadePrefix(conformidade, message.trim())
    }
  }

  return fallback
}
