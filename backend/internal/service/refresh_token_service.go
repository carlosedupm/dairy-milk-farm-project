package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
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

// Create cria um novo refresh token para o usuário
func (s *RefreshTokenService) Create(ctx context.Context, userID int64) (*models.RefreshToken, error) {
	tokenStr, err := s.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	refreshToken := &models.RefreshToken{
		Token:     tokenStr,
		UserID:    userID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 dias
	}

	if err := s.repo.Create(ctx, refreshToken); err != nil {
		return nil, err
	}

	return refreshToken, nil
}

// Validate valida um refresh token
func (s *RefreshTokenService) Validate(ctx context.Context, token string) (*models.RefreshToken, error) {
	rt, err := s.repo.GetByToken(ctx, token)
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

// Revoke revoga um refresh token
func (s *RefreshTokenService) Revoke(ctx context.Context, token string) error {
	return s.repo.Revoke(ctx, token)
}

// RevokeAllForUser revoga todos os refresh tokens de um usuário
func (s *RefreshTokenService) RevokeAllForUser(ctx context.Context, userID int64) error {
	return s.repo.RevokeAllForUser(ctx, userID)
}
