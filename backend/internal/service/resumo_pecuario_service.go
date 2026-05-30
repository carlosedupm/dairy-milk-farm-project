package service

import (
	"context"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
)

type ResumoPecuarioService struct {
	gestacaoRepo       *repository.GestacaoRepository
	restricaoLeiteRepo *repository.RestricaoLeiteRepository
	producaoRepo       *repository.ProducaoRepository
	animalRepo         *repository.AnimalRepository
}

func NewResumoPecuarioService(
	gestacaoRepo *repository.GestacaoRepository,
	restricaoLeiteRepo *repository.RestricaoLeiteRepository,
	producaoRepo *repository.ProducaoRepository,
	animalRepo *repository.AnimalRepository,
) *ResumoPecuarioService {
	return &ResumoPecuarioService{
		gestacaoRepo:       gestacaoRepo,
		restricaoLeiteRepo: restricaoLeiteRepo,
		producaoRepo:       producaoRepo,
		animalRepo:         animalRepo,
	}
}

func (s *ResumoPecuarioService) Build(ctx context.Context, fazendaID int64, diasParto int) (*models.ResumoPecuario, error) {
	if diasParto <= 0 {
		diasParto = 30
	}
	if diasParto > 365 {
		diasParto = 365
	}

	prenhes, err := s.gestacaoRepo.CountConfirmadasByFazendaID(ctx, fazendaID)
	if err != nil {
		return nil, err
	}

	ativas, err := s.restricaoLeiteRepo.ListAtivasByFazendaID(ctx, fazendaID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	startHoje := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endHoje := startHoje.AddDate(0, 0, 1)
	producaoHoje, err := s.producaoRepo.SumLitrosByFazendaBetween(ctx, fazendaID, startHoje, endHoje)
	if err != nil {
		return nil, err
	}

	startSemana := startHoje.AddDate(0, 0, -6)
	producaoSemana, err := s.producaoRepo.SumLitrosByFazendaBetween(ctx, fazendaID, startSemana, endHoje)
	if err != nil {
		return nil, err
	}

	ateParto := startHoje.AddDate(0, 0, diasParto)
	partos, err := s.gestacaoRepo.ListPartosPrevistosByFazendaID(ctx, fazendaID, ateParto)
	if err != nil {
		return nil, err
	}
	if partos == nil {
		partos = []models.PartoPrevistoResumo{}
	}

	ate7d := startHoje.AddDate(0, 0, 7)
	partos7d, err := s.gestacaoRepo.ListPartosPrevistosNaJanelaByFazendaID(ctx, fazendaID, startHoje, ate7d)
	if err != nil {
		return nil, err
	}

	lactacaoAtiva, err := s.animalRepo.CountEmLactacaoByFazendaID(ctx, fazendaID)
	if err != nil {
		return nil, err
	}

	return &models.ResumoPecuario{
		PrenhesTotal:          prenhes,
		RestricoesAtivasTotal: len(ativas),
		ProducaoHojeLitros:    producaoHoje,
		ProducaoSemanaLitros:  producaoSemana,
		PartosProximos7dTotal: len(partos7d),
		LactacaoAtivaTotal:    lactacaoAtiva,
		PartosPrevistos:       partos,
	}, nil
}
