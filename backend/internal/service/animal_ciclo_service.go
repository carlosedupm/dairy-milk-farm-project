package service

import (
	"context"
	"fmt"
	"sort"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

const maxTimelineItems = 50
const maxProducaoTimeline = 15

type AnimalCicloService struct {
	cioRepo         *repository.CioRepository
	coberturaRepo   *repository.CoberturaRepository
	diagnosticoRepo *repository.DiagnosticoGestacaoRepository
	gestacaoRepo    *repository.GestacaoRepository
	secagemRepo     *repository.SecagemRepository
	partoRepo       *repository.PartoRepository
	lactacaoRepo    *repository.LactacaoRepository
	producaoRepo    *repository.ProducaoRepository
}

func NewAnimalCicloService(
	cioRepo *repository.CioRepository,
	coberturaRepo *repository.CoberturaRepository,
	diagnosticoRepo *repository.DiagnosticoGestacaoRepository,
	gestacaoRepo *repository.GestacaoRepository,
	secagemRepo *repository.SecagemRepository,
	partoRepo *repository.PartoRepository,
	lactacaoRepo *repository.LactacaoRepository,
	producaoRepo *repository.ProducaoRepository,
) *AnimalCicloService {
	return &AnimalCicloService{
		cioRepo:         cioRepo,
		coberturaRepo:   coberturaRepo,
		diagnosticoRepo: diagnosticoRepo,
		gestacaoRepo:    gestacaoRepo,
		secagemRepo:     secagemRepo,
		partoRepo:       partoRepo,
		lactacaoRepo:    lactacaoRepo,
		producaoRepo:    producaoRepo,
	}
}

func (s *AnimalCicloService) GetLactacaoAtiva(ctx context.Context, animalID int64) (*models.Lactacao, error) {
	l, err := s.lactacaoRepo.GetEmAndamentoByAnimalID(ctx, animalID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return l, nil
}

func (s *AnimalCicloService) BuildTimeline(ctx context.Context, animalID int64) ([]models.CicloTimelineItem, error) {
	var items []models.CicloTimelineItem

	cios, err := s.cioRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, c := range cios {
		det := ""
		if c.MetodoDeteccao != nil {
			det = *c.MetodoDeteccao
		}
		items = append(items, models.CicloTimelineItem{
			Tipo: "CIO", Data: c.DataDetectado, Titulo: "Cio detectado", Detalhe: det, RefID: c.ID,
		})
	}

	cobs, err := s.coberturaRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, c := range cobs {
		items = append(items, models.CicloTimelineItem{
			Tipo: "COBERTURA", Data: c.Data, Titulo: fmt.Sprintf("Cobertura (%s)", c.Tipo), RefID: c.ID,
		})
	}

	diags, err := s.diagnosticoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, d := range diags {
		items = append(items, models.CicloTimelineItem{
			Tipo: "TOQUE", Data: d.Data, Titulo: fmt.Sprintf("Toque %s", d.Resultado), RefID: d.ID,
		})
	}

	gests, err := s.gestacaoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, g := range gests {
		titulo := fmt.Sprintf("Gestação %s", g.Status)
		items = append(items, models.CicloTimelineItem{
			Tipo: "GESTACAO", Data: g.DataConfirmacao, Titulo: titulo, RefID: g.ID,
		})
	}

	secs, err := s.secagemRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, sec := range secs {
		items = append(items, models.CicloTimelineItem{
			Tipo: "SECAGEM", Data: sec.DataSecagem, Titulo: "Secagem", RefID: sec.ID,
		})
	}

	partos, err := s.partoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, p := range partos {
		items = append(items, models.CicloTimelineItem{
			Tipo: "PARTO", Data: p.Data, Titulo: fmt.Sprintf("Parto (%d cria(s))", p.NumeroCrias), RefID: p.ID,
		})
	}

	lacts, err := s.lactacaoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, l := range lacts {
		d := l.DataInicio
		titulo := fmt.Sprintf("Lactação #%d iniciada", l.NumeroLactacao)
		if l.DataFim != nil {
			d = *l.DataFim
			titulo = fmt.Sprintf("Lactação #%d encerrada", l.NumeroLactacao)
		}
		items = append(items, models.CicloTimelineItem{
			Tipo: "LACTACAO", Data: d, Titulo: titulo, RefID: l.ID,
		})
	}

	prods, err := s.producaoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	n := 0
	for _, p := range prods {
		if n >= maxProducaoTimeline {
			break
		}
		items = append(items, models.CicloTimelineItem{
			Tipo:    "PRODUCAO",
			Data:    p.DataHora,
			Titulo:  "Produção de leite",
			Detalhe: fmt.Sprintf("%.1f L", p.Quantidade),
			RefID:   p.ID,
		})
		n++
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Data.After(items[j].Data)
	})
	if len(items) > maxTimelineItems {
		items = items[:maxTimelineItems]
	}
	return items, nil
}

func (s *AnimalCicloService) BuildProximasAcoes(ctx context.Context, animal *models.Animal) ([]models.ProximaAcao, error) {
	if animal.Sexo != nil && *animal.Sexo != models.SexoFemea {
		return nil, nil
	}
	aid := animal.ID
	var acoes []models.ProximaAcao

	lact, err := s.GetLactacaoAtiva(ctx, aid)
	if err != nil {
		return nil, err
	}
	if lact != nil {
		acoes = append(acoes, models.ProximaAcao{
			Codigo: models.AcaoRegistrarProducao, Label: "Registrar produção",
			HrefPath: fmt.Sprintf("/producao/novo?animal_id=%d", aid),
		})
	}

	gest, err := s.gestacaoRepo.GetAtivaConfirmadaByAnimalID(ctx, aid)
	if err != nil {
		return nil, err
	}
	if gest != nil {
		acoes = append(acoes, models.ProximaAcao{
			Codigo: models.AcaoRegistrarSecagem, Label: "Registrar secagem",
			HrefPath: fmt.Sprintf("/gestao/secagens/novo?animal_id=%d", aid),
		})
		acoes = append(acoes, models.ProximaAcao{
			Codigo: models.AcaoRegistrarParto, Label: "Registrar parto",
			HrefPath: fmt.Sprintf("/gestao/partos/novo?animal_id=%d&gestacao_id=%d", aid, gest.ID),
		})
	}

	st := ""
	if animal.StatusReprodutivo != nil {
		st = *animal.StatusReprodutivo
	}
	if st == models.StatusReprodutivoServida && gest == nil {
		acoes = append(acoes, models.ProximaAcao{
			Codigo: models.AcaoRegistrarToque, Label: "Registrar toque",
			HrefPath: fmt.Sprintf("/gestao/toques/novo?animal_id=%d", aid),
		})
	}
	if st == "" || st == models.StatusReprodutivoVazia || st == models.StatusReprodutivoParida {
		if lact == nil && gest == nil {
			acoes = append(acoes, models.ProximaAcao{
				Codigo: models.AcaoRegistrarCobertura, Label: "Registrar cobertura",
				HrefPath: fmt.Sprintf("/gestao/coberturas/novo?animal_id=%d", aid),
			})
		}
	}

	return acoes, nil
}
