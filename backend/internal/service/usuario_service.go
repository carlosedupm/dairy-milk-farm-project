package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

var ErrUsuarioNotFound = errors.New("usuário não encontrado")
var ErrPerfilDeveloperViaAPI = errors.New("perfil DEVELOPER não pode ser atribuído via API; use migração ou script")
var ErrEmailEmUso = errors.New("email já está em uso")

const bcryptCost = 10

type UsuarioService struct {
	repo *repository.UsuarioRepository
}

func NewUsuarioService(repo *repository.UsuarioRepository) *UsuarioService {
	return &UsuarioService{repo: repo}
}

func (s *UsuarioService) List(ctx context.Context, limit, offset int) ([]*models.Usuario, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *UsuarioService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *UsuarioService) GetByID(ctx context.Context, id int64) (*models.Usuario, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUsuarioNotFound
		}
		return nil, err
	}
	return u, nil
}

func (s *UsuarioService) Create(ctx context.Context, u *models.Usuario) error {
	if u.Perfil == models.PerfilDeveloper {
		return ErrPerfilDeveloperViaAPI
	}
	if u.Perfil != models.PerfilUser && u.Perfil != models.PerfilAdmin {
		u.Perfil = models.PerfilUser
	}
	if u.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	if u.Email == "" {
		return errors.New("email é obrigatório")
	}
	if u.Senha == "" {
		return errors.New("senha é obrigatória")
	}

	exists, err := s.repo.ExistsByEmail(ctx, u.Email, 0)
	if err != nil {
		return err
	}
	if exists {
		return ErrEmailEmUso
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(u.Senha), bcryptCost)
	if err != nil {
		return err
	}
	u.Senha = string(hash)
	u.Enabled = true

	return s.repo.Create(ctx, u)
}

func (s *UsuarioService) Update(ctx context.Context, u *models.Usuario) error {
	if u.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	if u.Email == "" {
		return errors.New("email é obrigatório")
	}

	atual, err := s.repo.GetByID(ctx, u.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUsuarioNotFound
		}
		return err
	}
	// Não permitir alterar perfil de usuário que já é ADMIN ou DEVELOPER
	if atual.Perfil == models.PerfilAdmin || atual.Perfil == models.PerfilDeveloper {
		u.Perfil = atual.Perfil
	} else {
		if u.Perfil == models.PerfilDeveloper {
			return ErrPerfilDeveloperViaAPI
		}
		if u.Perfil != models.PerfilUser && u.Perfil != models.PerfilAdmin {
			u.Perfil = models.PerfilUser
		}
	}

	exists, err := s.repo.ExistsByEmail(ctx, u.Email, u.ID)
	if err != nil {
		return err
	}
	if exists {
		return ErrEmailEmUso
	}

	// Manter senha se não estiver alterando
	if u.Senha == "" {
		u.Senha = atual.Senha
		return s.repo.Update(ctx, u)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(u.Senha), bcryptCost)
	if err != nil {
		return err
	}
	u.Senha = string(hash)
	return s.repo.UpdateWithPassword(ctx, u)
}

func (s *UsuarioService) ToggleEnabled(ctx context.Context, id int64) error {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUsuarioNotFound
		}
		return err
	}
	return s.repo.ToggleEnabled(ctx, id, !u.Enabled)
}
