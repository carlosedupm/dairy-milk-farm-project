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
      error?: string | { message?: string; details?: string | unknown }
    }
  }
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
    if (typeof details === 'string' && details.trim()) return details.trim()
    const message = errorPayload.message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }

  return fallback
}
