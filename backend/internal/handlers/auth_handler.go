package handlers

import (
	"io"
	"net/http"

	"github.com/ceialmilk/api/internal/auth"
	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/observability"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo        *repository.UsuarioRepository
	jwt             *auth.JWTService
	refreshTokenSvc *service.RefreshTokenService
	cookieSameSite  http.SameSite
}

func NewAuthHandler(
	userRepo *repository.UsuarioRepository,
	jwt *auth.JWTService,
	refreshTokenSvc *service.RefreshTokenService,
	cookieSameSite http.SameSite,
) *AuthHandler {
	return &AuthHandler{
		userRepo:        userRepo,
		jwt:             jwt,
		refreshTokenSvc: refreshTokenSvc,
		cookieSameSite:  cookieSameSite,
	}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Nome     string `json:"nome" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	// Verificar se email já existe
	exists, err := h.userRepo.ExistsByEmail(c.Request.Context(), req.Email, 0)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{"operation": "check_email_exists"})
		response.ErrorInternal(c, "Erro ao verificar email", err.Error())
		return
	}
	if exists {
		response.ErrorValidation(c, "Email já cadastrado", "Este email já está em uso")
		return
	}

	// Hash da senha
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{"operation": "hash_password"})
		response.ErrorInternal(c, "Erro ao processar senha", err.Error())
		return
	}

	// Criar usuário com perfil USER (padrão)
	user := &models.Usuario{
		Nome:    req.Nome,
		Email:   req.Email,
		Senha:   string(hashedPassword),
		Perfil:  "USER",
		Enabled: true,
	}

	if err := h.userRepo.Create(c.Request.Context(), user); err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{"operation": "create_user"})
		response.ErrorInternal(c, "Erro ao criar usuário", err.Error())
		return
	}

	registerData := gin.H{
		"id":    user.ID,
		"nome":  user.Nome,
		"email": user.Email,
	}
	response.SuccessCreated(c, registerData, "Usuário registrado com sucesso")
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		if err == pgx.ErrNoRows {
			response.ErrorUnauthorized(c, "Credenciais inválidas")
			return
		}
		observability.CaptureHandlerError(c, err, map[string]string{"operation": "get_user_by_email"})
		response.ErrorInternal(c, "Erro ao buscar usuário", err.Error())
		return
	}

	if !user.Enabled {
		response.ErrorUnauthorized(c, "Usuário desativado")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Senha), []byte(req.Password)); err != nil {
		response.ErrorUnauthorized(c, "Credenciais inválidas")
		return
	}

	// Gerar access token
	accessToken, err := h.jwt.GenerateToken(user.ID, user.Email, user.Perfil)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{"operation": "generate_token"})
		response.ErrorInternal(c, "Erro ao gerar token", err.Error())
		return
	}

	// Gerar refresh token
	refreshToken, err := h.refreshTokenSvc.Create(c.Request.Context(), user.ID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{"operation": "create_refresh_token"})
		response.ErrorInternal(c, "Erro ao gerar refresh token", err.Error())
		return
	}

	// Configurar cookie HttpOnly para o access token (15 minutos)
	auth.SetSecureCookie(c, "ceialmilk_token", accessToken, 15*60, h.cookieSameSite)

	// Configurar cookie HttpOnly para o refresh token (7 dias)
	auth.SetSecureCookie(c, "ceialmilk_refresh_token", refreshToken.Token, 7*24*60*60, h.cookieSameSite)

	loginData := gin.H{
		"email":  user.Email,
		"perfil": user.Perfil,
		"nome":   user.Nome,
	}
	response.SuccessOK(c, loginData, "Login realizado com sucesso")
}

func (h *AuthHandler) Validate(c *gin.Context) {
	// Tentar obter token do cookie primeiro, depois do header Authorization
	var tokenStr string

	// Verificar cookie HttpOnly
	if cookieToken, err := c.Cookie("ceialmilk_token"); err == nil && cookieToken != "" {
		tokenStr = cookieToken
	} else {
		// Fallback: tentar obter do body (compatibilidade com código antigo)
		body, err := io.ReadAll(c.Request.Body)
		if err == nil {
			tokenStr = string(body)
		}

		// Se ainda não encontrou, tentar header Authorization
		if tokenStr == "" {
			authHeader := c.GetHeader("Authorization")
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				tokenStr = authHeader[7:]
			}
		}
	}

	if tokenStr == "" {
		response.ErrorUnauthorized(c, "Token não fornecido")
		return
	}

	claims, err := h.jwt.ValidateToken(tokenStr)
	if err != nil {
		response.ErrorUnauthorized(c, "Token inválido ou expirado")
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), claims.UserID)
	if err != nil {
		if err == pgx.ErrNoRows {
			response.ErrorUnauthorized(c, "Usuário não encontrado")
			return
		}
		observability.CaptureHandlerError(c, err, map[string]string{"operation": "get_user_by_id_validate"})
		response.ErrorInternal(c, "Erro ao buscar usuário", err.Error())
		return
	}
	if !user.Enabled {
		response.ErrorUnauthorized(c, "Usuário desativado")
		return
	}

	validateData := gin.H{
		"email":   user.Email,
		"perfil":  user.Perfil,
		"user_id": claims.UserID,
		"nome":    user.Nome,
	}
	response.SuccessOK(c, validateData, "Token válido")
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Revogar refresh token se existir
	if refreshToken, err := c.Cookie("ceialmilk_refresh_token"); err == nil && refreshToken != "" {
		_ = h.refreshTokenSvc.Revoke(c.Request.Context(), refreshToken)
	}

	// Limpar cookies HttpOnly
	auth.ClearCookie(c, "ceialmilk_token", h.cookieSameSite)
	auth.ClearCookie(c, "ceialmilk_refresh_token", h.cookieSameSite)
	response.SuccessOK(c, nil, "Logout realizado com sucesso")
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	// Tentar obter refresh token do cookie primeiro
	var refreshTokenStr string
	if cookieToken, err := c.Cookie("ceialmilk_refresh_token"); err == nil && cookieToken != "" {
		refreshTokenStr = cookieToken
	} else {
		// Fallback: tentar obter do body
		var req RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.ErrorBadRequest(c, "Refresh token não fornecido", nil)
			return
		}
		refreshTokenStr = req.RefreshToken
	}

	if refreshTokenStr == "" {
		response.ErrorUnauthorized(c, "Refresh token não fornecido")
		return
	}

	// Validar refresh token
	rt, err := h.refreshTokenSvc.Validate(c.Request.Context(), refreshTokenStr)
	if err != nil {
		response.ErrorUnauthorized(c, "Refresh token inválido ou expirado")
		return
	}

	// Buscar usuário
	user, err := h.userRepo.GetByID(c.Request.Context(), rt.UserID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar usuário", err.Error())
		return
	}

	if !user.Enabled {
		response.ErrorUnauthorized(c, "Usuário desativado")
		return
	}

	// Gerar novo access token
	accessToken, err := h.jwt.GenerateToken(user.ID, user.Email, user.Perfil)
	if err != nil {
		response.ErrorInternal(c, "Erro ao gerar token", err.Error())
		return
	}

	// Configurar cookie HttpOnly para o novo access token
	auth.SetSecureCookie(c, "ceialmilk_token", accessToken, 15*60, h.cookieSameSite) // 15 minutos

	refreshData := gin.H{
		"email":  user.Email,
		"perfil": user.Perfil,
		"nome":   user.Nome,
	}
	response.SuccessOK(c, refreshData, "Token renovado com sucesso")
}
