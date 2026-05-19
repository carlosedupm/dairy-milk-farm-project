package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrGestacaoNotFound = errors.New("gestacao nao encontrada")

type GestacaoService struct {
	repo        *repository.GestacaoRepository
	animalRepo  *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewGestacaoService(repo *repository.GestacaoRepository, animalRepo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *GestacaoService {
	return &GestacaoService{repo: repo, animalRepo: animalRepo, fazendaRepo: fazendaRepo}
}

func (s *GestacaoService) Create(ctx context.Context, g *models.Gestacao) error {
	if g.AnimalID <= 0 || g.CoberturaID <= 0 || g.FazendaID <= 0 {
		return errors.New("animal_id, cobertura_id e fazenda_id sao obrigatorios")
	}
	valid := false
	for _, st := range models.ValidStatusGestacao() {
		if st == g.Status {
			valid = true
			break
		}
	}
	if !valid {
		return errors.New("status invalido")
	}
	animal, err := s.animalRepo.GetByID(ctx, g.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != g.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	return s.repo.Create(ctx, g)
}

func (s *GestacaoService) GetByID(ctx context.Context, id int64) (*models.Gestacao, error) {
	g, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrGestacaoNotFound
		}
		return nil, err
	}
	return g, nil
}

func (s *GestacaoService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Gestacao, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *GestacaoService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Gestacao, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

const diasPorMesGestacao = 30

// BuildResumoContexto monta o resumo de gestação confirmada ativa para o contexto do animal.
func (s *GestacaoService) BuildResumoContexto(ctx context.Context, animalID int64) (*models.GestacaoResumoContexto, error) {
	g, err := s.repo.GetAtivaConfirmadaByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if g == nil {
		return &models.GestacaoResumoContexto{Confirmada: false}, nil
	}
	dias := diasGestacaoCivis(g.DataConfirmacao, time.Now())
	meses := dias / diasPorMesGestacao
	resumo := &models.GestacaoResumoContexto{
		Confirmada:    true,
		GestacaoID:    &g.ID,
		DiasGestacao:  dias,
		MesesGestacao: meses,
	}
	if dc := formatDateYMD(g.DataConfirmacao); dc != "" {
		resumo.DataConfirmacao = &dc
	}
	if g.DataPrevistaParto != nil {
		if dp := formatDateYMD(*g.DataPrevistaParto); dp != "" {
			resumo.DataPrevistaParto = &dp
		}
	}
	return resumo, nil
}

func diasGestacaoCivis(dataConfirmacao, hoje time.Time) int {
	dias := civilDaysBetween(dataConfirmacao, hoje)
	if dias < 0 {
		return 0
	}
	return dias
}

func civilDaysBetween(a, b time.Time) int {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	t1 := time.Date(ay, am, ad, 0, 0, 0, 0, time.Local)
	t2 := time.Date(by, bm, bd, 0, 0, 0, 0, time.Local)
	return int(t2.Sub(t1).Hours() / 24)
}

func formatDateYMD(t time.Time) string {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
}

func (s *GestacaoService) Update(ctx context.Context, g *models.Gestacao) error {
	if g.ID <= 0 {
		return errors.New("id invalido")
	}
	_, err := s.repo.GetByID(ctx, g.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrGestacaoNotFound
		}
		return err
	}
	return s.repo.Update(ctx, g)
}
