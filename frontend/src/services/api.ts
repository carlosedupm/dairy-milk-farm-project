import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

export type ApiResponse<T> = { data: T };

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Importante: permite envio de cookies HttpOnly
});

// Os cookies HttpOnly são enviados automaticamente pelo navegador
// Não precisamos adicionar token manualmente no header

const AUTH_ENDPOINTS = [
  "/api/auth/validate",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh",
];

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((path) => url?.includes(path));
}

// Interceptor de request para marcar requisições de validate
api.interceptors.request.use((config) => {
  if (config.url?.includes("/api/auth/validate")) {
    // Marcar que esta requisição pode retornar 401 esperado
    (config as any)._silent401 = true;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _silent401?: boolean })
      | undefined;
    const requestUrl = originalRequest?.url ?? "";
    const isSilent401 = originalRequest?._silent401;

    // Para o endpoint /api/auth/validate com 401, transformar em resposta válida
    // Isso evita que o erro seja logado no console (é um comportamento esperado)
    if (isSilent401 && error.response?.status === 401) {
      // Criar uma resposta válida que será tratada como sucesso
      const mockResponse: AxiosResponse = {
        data: {
          data: null,
          message: "Not authenticated",
          timestamp: new Date().toISOString(),
        },
        status: 200,
        statusText: "OK",
        headers: error.response.headers,
        config: originalRequest!,
        request: error.request,
      };
      return Promise.resolve(mockResponse);
    }

    // Não fazer retry/redirect para outros endpoints de auth: login, logout e refresh.
    // 401 nesses casos significa "não logado" ou credenciais inválidas.
    if (isAuthEndpoint(requestUrl)) {
      return Promise.reject(error);
    }

    // Se receber 401 e não for uma tentativa de refresh já
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest!._retry = true;

      try {
        await api.post("/api/auth/refresh");
        return api(originalRequest!);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
