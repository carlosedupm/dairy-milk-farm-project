import axios from "axios";

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Não fazer retry/redirect para endpoints de auth: validate (checagem inicial),
    // login, logout e refresh. 401 nesses casos significa "não logado" ou credenciais
    // inválidas — não devemos tentar refresh nem redirecionar (evita loop na tela de login).
    if (isAuthEndpoint(originalRequest?.url ?? "")) {
      return Promise.reject(error);
    }

    // Se receber 401 e não for uma tentativa de refresh já
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post("/api/auth/refresh");
        return api(originalRequest);
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
