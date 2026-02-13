package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrCriaNotFound = errors.New("cria nao encontrada")

type CriaService struct {
	repo       *repository.CriaRepository
	partoRepo  *repository.PartoRepository
	animalRepo *repository.AnimalRepository
}

func NewCriaService(repo *repository.CriaRepository, partoRepo *repository.PartoRepository, animalRepo *repository.AnimalRepository) *CriaService {
	return &CriaService{repo: repo, partoRepo: partoRepo, animalRepo: animalRepo}
}

func (s *CriaService) Create(ctx context.Context, c *models.Cria) error {
	if c.PartoID <= 0 || c.Sexo == "" || c.Condicao == "" {
		return errors.New("parto_id, sexo e condicao sao obrigatorios")
	}
	if c.Sexo != models.SexoMacho && c.Sexo != models.SexoFemea {
		return errors.New("sexo invalido")
	}
	valid := false
	for _, cond := range models.ValidCondicoesCria() {
		if cond == c.Condicao {
			valid = true
			break
		}
	}
	if !valid {
		return errors.New("condicao invalida")
	}
	parto, err := s.partoRepo.GetByID(ctx, c.PartoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPartoNotFound
		}
		return err
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return err
	}
	if c.Condicao != models.CriaCondicaoVivo || c.AnimalID != nil {
		return nil
	}
	crias, _ := s.repo.GetByPartoID(ctx, c.PartoID)
	seq := len(crias) - 1
	if seq < 0 {
		seq = 0
	}
	ident := fmt.Sprintf("B-%d-%d", c.PartoID, seq)
	categoria := models.CategoriaBezerra
	if c.Sexo == models.SexoMacho {
		categoria = models.CategoriaBezerro
	}
	animal := &models.Animal{
		Identificacao: ident,
		Sexo:          &c.Sexo,
		FazendaID:     parto.FazendaID,
		MaeID:         &parto.AnimalID,
		Categoria:     &categoria,
		PesoNascimento: c.Peso,
	}
	if err := s.animalRepo.Create(ctx, animal); err != nil {
		return err
	}
	c.AnimalID = &animal.ID
	return s.repo.Update(ctx, c)
}

func (s *CriaService) GetByID(ctx context.Context, id int64) (*models.Cria, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCriaNotFound
		}
		return nil, err
	}
	return c, nil
}

func (s *CriaService) GetByPartoID(ctx context.Context, partoID int64) ([]*models.Cria, error) {
	return s.repo.GetByPartoID(ctx, partoID)
}

func (s *CriaService) Update(ctx context.Context, c *models.Cria) error {
	if c.ID <= 0 {
		return errors.New("id invalido")
	}
	_, err := s.repo.GetByID(ctx, c.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCriaNotFound
		}
		return err
	}
	return s.repo.Update(ctx, c)
}
