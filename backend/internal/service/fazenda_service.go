package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrFazendaNotFound = errors.New("fazenda não encontrada")
var ErrFazendaDuplicada = errors.New("já existe uma fazenda com esse nome e localização")

type FazendaService struct {
	repo *repository.FazendaRepository
}

func NewFazendaService(repo *repository.FazendaRepository) *FazendaService {
	return &FazendaService{repo: repo}
}

func (s *FazendaService) Create(ctx context.Context, fazenda *models.Fazenda) error {
	if fazenda.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	exists, err := s.repo.ExistsByNomeAndLocalizacao(ctx, fazenda.Nome, fazenda.Localizacao)
	if err != nil {
		return err
	}
	if exists {
		return ErrFazendaDuplicada
	}
	return s.repo.Create(ctx, fazenda)
}

func (s *FazendaService) GetByID(ctx context.Context, id int64) (*models.Fazenda, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *FazendaService) GetAll(ctx context.Context) ([]*models.Fazenda, error) {
	return s.repo.GetAll(ctx)
}

func (s *FazendaService) Update(ctx context.Context, fazenda *models.Fazenda) error {
	if fazenda.Nome == "" {
		return errors.New("nome é obrigatório")
	}

	// Verificar se existe
	_, err := s.repo.GetByID(ctx, fazenda.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}

	// Não permitir alterar para nome+localização que já existe em outra fazenda
	exists, err := s.repo.ExistsByNomeAndLocalizacaoExcluding(ctx, fazenda.Nome, fazenda.Localizacao, fazenda.ID)
	if err != nil {
		return err
	}
	if exists {
		return ErrFazendaDuplicada
	}

	return s.repo.Update(ctx, fazenda)
}

func (s *FazendaService) Delete(ctx context.Context, id int64) error {
	// Verificar se existe
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}

	return s.repo.Delete(ctx, id)
}

func (s *FazendaService) SearchByNome(ctx context.Context, nome string) ([]*models.Fazenda, error) {
	return s.repo.SearchByNome(ctx, nome)
}

func (s *FazendaService) SearchByLocalizacao(ctx context.Context, loc string) ([]*models.Fazenda, error) {
	return s.repo.SearchByLocalizacao(ctx, loc)
}

func (s *FazendaService) SearchByVacasMin(ctx context.Context, qty int) ([]*models.Fazenda, error) {
	return s.repo.SearchByVacasMin(ctx, qty)
}

func (s *FazendaService) SearchByVacasRange(ctx context.Context, min, max int) ([]*models.Fazenda, error) {
	return s.repo.SearchByVacasRange(ctx, min, max)
}

func (s *FazendaService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *FazendaService) ExistsByNome(ctx context.Context, nome string) (bool, error) {
	return s.repo.ExistsByNome(ctx, nome)
}

// GetByUsuarioID retorna as fazendas vinculadas ao usuário (minhas fazendas).
func (s *FazendaService) GetByUsuarioID(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
	return s.repo.GetFazendasByUsuarioID(ctx, usuarioID)
}

// GetFazendaIDsByUsuarioID retorna os IDs das fazendas vinculadas ao usuário (para admin).
func (s *FazendaService) GetFazendaIDsByUsuarioID(ctx context.Context, usuarioID int64) ([]int64, error) {
	return s.repo.GetFazendaIDsByUsuarioID(ctx, usuarioID)
}

// SetFazendasForUsuario substitui as fazendas vinculadas ao usuário (admin). Valida que todos os IDs existem.
func (s *FazendaService) SetFazendasForUsuario(ctx context.Context, usuarioID int64, fazendaIDs []int64) error {
	for _, fid := range fazendaIDs {
		_, err := s.repo.GetByID(ctx, fid)
		if err != nil {
			if err == pgx.ErrNoRows {
				return fmt.Errorf("%w: id %d", ErrFazendaNotFound, fid)
			}
			return err
		}
	}
	return s.repo.SetFazendasForUsuario(ctx, usuarioID, fazendaIDs)
}
