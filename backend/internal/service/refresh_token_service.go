package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

type RefreshTokenService struct {
	repo *repository.RefreshTokenRepository
}

func NewRefreshTokenService(repo *repository.RefreshTokenRepository) *RefreshTokenService {
	return &RefreshTokenService{repo: repo}
}

// GenerateRefreshToken gera um token aleatório seguro
func (s *RefreshTokenService) GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// hashRefreshToken devolve o SHA-256 (hex) do token. Apenas o hash é persistido;
// o valor em claro só existe no cookie HttpOnly do cliente.
func hashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// Create cria um novo refresh token para o usuário. O banco guarda só o hash;
// o campo Token do retorno contém o valor em claro para ser enviado ao cliente (cookie).
func (s *RefreshTokenService) Create(ctx context.Context, userID int64) (*models.RefreshToken, error) {
	tokenStr, err := s.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	refreshToken := &models.RefreshToken{
		Token:     hashRefreshToken(tokenStr),
		UserID:    userID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 dias
	}

	if err := s.repo.Create(ctx, refreshToken); err != nil {
		return nil, err
	}

	// Devolver o valor em claro ao chamador (handler) — nunca persistido.
	refreshToken.Token = tokenStr
	return refreshToken, nil
}

// Validate valida um refresh token (comparação por hash)
func (s *RefreshTokenService) Validate(ctx context.Context, token string) (*models.RefreshToken, error) {
	rt, err := s.repo.GetByToken(ctx, hashRefreshToken(token))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("refresh token não encontrado")
		}
		return nil, err
	}

	if rt.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("refresh token expirado")
	}

	return rt, nil
}

// Rotate revoga o token usado e emite um novo (rotação a cada refresh).
func (s *RefreshTokenService) Rotate(ctx context.Context, usedToken string, userID int64) (*models.RefreshToken, error) {
	if err := s.repo.Revoke(ctx, hashRefreshToken(usedToken)); err != nil {
		return nil, err
	}
	return s.Create(ctx, userID)
}

// Revoke revoga um refresh token
func (s *RefreshTokenService) Revoke(ctx context.Context, token string) error {
	return s.repo.Revoke(ctx, hashRefreshToken(token))
}

// RevokeAllForUser revoga todos os refresh tokens de um usuário
func (s *RefreshTokenService) RevokeAllForUser(ctx context.Context, userID int64) error {
	return s.repo.RevokeAllForUser(ctx, userID)
}
