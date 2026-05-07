package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrRestricaoLeiteNotFound       = errors.New("restrição de leite não encontrada")
	ErrRestricaoLeiteNaoAguardando  = errors.New("restrição não está aguardando laboratório")
	ErrRestricaoLeiteAnimalFazenda  = errors.New("animal não pertence à fazenda informada")
	ErrRestricaoLeiteJaAberta       = errors.New("já existe restrição ativa para este animal")
	ErrRestricaoLeiteMotivoInvalido = errors.New("motivo inválido")
	ErrRestricaoLeiteAnimalSemLactacao = errors.New("animal não está em lactação ativa")
)

type RestricaoLeiteService struct {
	repo         *repository.RestricaoLeiteRepository
	animalRepo   *repository.AnimalRepository
	lactacaoRepo *repository.LactacaoRepository
}

func NewRestricaoLeiteService(repo *repository.RestricaoLeiteRepository, animalRepo *repository.AnimalRepository, lactacaoRepo *repository.LactacaoRepository) *RestricaoLeiteService {
	return &RestricaoLeiteService{repo: repo, animalRepo: animalRepo, lactacaoRepo: lactacaoRepo}
}

func (s *RestricaoLeiteService) ListAtivasByFazenda(ctx context.Context, fazendaID int64) ([]models.RestricaoLeiteAtiva, error) {
	return s.repo.ListAtivasByFazendaID(ctx, fazendaID)
}

func (s *RestricaoLeiteService) GetAtivaByAnimalID(ctx context.Context, animalID int64) (*models.RestricaoLeite, error) {
	return s.repo.GetAtivaByAnimalID(ctx, animalID)
}

type CreateRestricaoLeiteInput struct {
	FazendaID   int64
	AnimalID    int64
	Motivo      string
	InicioEm    *time.Time
	Observacao  *string
}

func (s *RestricaoLeiteService) Create(ctx context.Context, in CreateRestricaoLeiteInput) (*models.RestricaoLeite, error) {
	if !models.IsValidMotivoRestricaoLeite(in.Motivo) {
		return nil, ErrRestricaoLeiteMotivoInvalido
	}

	animal, err := s.animalRepo.GetByID(ctx, in.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	if animal.FazendaID != in.FazendaID {
		return nil, ErrRestricaoLeiteAnimalFazenda
	}

	emLactacao, err := s.lactacaoRepo.ExistsAtivaNaFazenda(ctx, in.FazendaID, in.AnimalID)
	if err != nil {
		return nil, err
	}
	if !emLactacao {
		return nil, ErrRestricaoLeiteAnimalSemLactacao
	}

	inicio := time.Now().UTC()
	if in.InicioEm != nil {
		inicio = normalizeDateUTC(*in.InicioEm)
	} else {
		inicio = truncateToDateUTC(inicio)
	}

	row := &models.RestricaoLeite{
		FazendaID:   in.FazendaID,
		AnimalID:    in.AnimalID,
		Motivo:      in.Motivo,
		InicioEm:    inicio,
		Observacao:  in.Observacao,
		Status:      models.RestricaoLeiteStatusAguardandoLab,
	}

	if err := s.repo.Create(ctx, row); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrRestricaoLeiteJaAberta
		}
		return nil, err
	}
	return row, nil
}

type LiberarRestricaoLeiteInput struct {
	LiberadoEm         time.Time
	LiberadoObservacao *string
}

func (s *RestricaoLeiteService) Liberar(ctx context.Context, fazendaID, restricaoID int64, in LiberarRestricaoLeiteInput) (*models.RestricaoLeite, error) {
	existing, err := s.repo.GetByID(ctx, restricaoID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrRestricaoLeiteNotFound
	}
	if existing.FazendaID != fazendaID {
		return nil, ErrRestricaoLeiteNotFound
	}
	if existing.Status != models.RestricaoLeiteStatusAguardandoLab {
		return nil, ErrRestricaoLeiteNaoAguardando
	}

	lib := truncateToDateUTC(in.LiberadoEm)
	if err := s.repo.Liberar(ctx, restricaoID, lib, in.LiberadoObservacao); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRestricaoLeiteNaoAguardando
		}
		return nil, err
	}
	out, err := s.repo.GetByID(ctx, restricaoID)
	if err != nil || out == nil {
		return nil, err
	}
	return out, nil
}

func truncateToDateUTC(t time.Time) time.Time {
	u := t.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC)
}

func normalizeDateUTC(t time.Time) time.Time {
	return truncateToDateUTC(t)
}
