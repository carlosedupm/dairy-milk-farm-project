package service

import (
	"context"

	"github.com/ceialmilk/api/internal/repository"
)

// ResultadoAreaSafra agrega custos, receitas e resultado por área/safra
type ResultadoAreaSafra struct {
	AreaID       int64   `json:"area_id"`
	Ano          int     `json:"ano"`
	TotalCustos  float64 `json:"total_custos"`
	TotalReceitas float64 `json:"total_receitas"`
	Resultado    float64 `json:"resultado"` // receitas - custos
}

// ComparativoFornecedor por safra: totais de custos e receitas por fornecedor
type ComparativoFornecedor struct {
	FornecedorID   int64   `json:"fornecedor_id"`
	NomeFornecedor string  `json:"nome_fornecedor"`
	TotalCustos    float64 `json:"total_custos"`
	TotalReceitas  float64 `json:"total_receitas"`
}

type ResultadoAgricolaService struct {
	fornecedorRepo *repository.FornecedorRepository
	areaRepo       *repository.AreaRepository
	safraRepo      *repository.SafraCulturaRepository
	custoRepo      *repository.CustoAgricolaRepository
	receitaRepo    *repository.ReceitaAgricolaRepository
}

func NewResultadoAgricolaService(
	fornecedorRepo *repository.FornecedorRepository,
	areaRepo *repository.AreaRepository,
	safraRepo *repository.SafraCulturaRepository,
	custoRepo *repository.CustoAgricolaRepository,
	receitaRepo *repository.ReceitaAgricolaRepository,
) *ResultadoAgricolaService {
	return &ResultadoAgricolaService{
		fornecedorRepo: fornecedorRepo,
		areaRepo:       areaRepo,
		safraRepo:      safraRepo,
		custoRepo:      custoRepo,
		receitaRepo:    receitaRepo,
	}
}

// GetResultadoByAreaAndAno retorna totais de custos e receitas para uma área em um ano (todas as culturas da área)
func (s *ResultadoAgricolaService) GetResultadoByAreaAndAno(ctx context.Context, areaID int64, ano int) (*ResultadoAreaSafra, error) {
	culturas, err := s.safraRepo.GetByAreaIDAndAno(ctx, areaID, ano)
	if err != nil {
		return nil, err
	}
	var totalCustos, totalReceitas float64
	for _, sc := range culturas {
		c, _ := s.custoRepo.TotalBySafraCulturaID(ctx, sc.ID)
		r, _ := s.receitaRepo.TotalBySafraCulturaID(ctx, sc.ID)
		totalCustos += c
		totalReceitas += r
	}
	return &ResultadoAreaSafra{
		AreaID:        areaID,
		Ano:           ano,
		TotalCustos:   totalCustos,
		TotalReceitas: totalReceitas,
		Resultado:     totalReceitas - totalCustos,
	}, nil
}

// GetResultadoByFazendaAndAno consolida por fazenda e ano (todas as áreas)
func (s *ResultadoAgricolaService) GetResultadoByFazendaAndAno(ctx context.Context, fazendaID int64, ano int) ([]ResultadoAreaSafra, float64, float64, error) {
	areas, err := s.areaRepo.GetByFazendaID(ctx, fazendaID)
	if err != nil {
		return nil, 0, 0, err
	}
	var list []ResultadoAreaSafra
	var totalCustos, totalReceitas float64
	for _, a := range areas {
		res, err := s.GetResultadoByAreaAndAno(ctx, a.ID, ano)
		if err != nil {
			continue
		}
		list = append(list, *res)
		totalCustos += res.TotalCustos
		totalReceitas += res.TotalReceitas
	}
	return list, totalCustos, totalReceitas, nil
}

// GetComparativoFornecedoresByFazendaAndAno retorna por fornecedor os totais de custos e receitas na safra
func (s *ResultadoAgricolaService) GetComparativoFornecedoresByFazendaAndAno(ctx context.Context, fazendaID int64, ano int) ([]ComparativoFornecedor, error) {
	fornecedores, err := s.fornecedorRepo.GetByFazendaID(ctx, fazendaID)
	if err != nil {
		return nil, err
	}
	var list []ComparativoFornecedor
	for _, f := range fornecedores {
		custos, _ := s.custoRepo.TotalByFornecedorIDAndAno(ctx, f.ID, ano)
		receitas, _ := s.receitaRepo.TotalByFornecedorIDAndAno(ctx, f.ID, ano)
		list = append(list, ComparativoFornecedor{
			FornecedorID:   f.ID,
			NomeFornecedor: f.Nome,
			TotalCustos:    custos,
			TotalReceitas:  receitas,
		})
	}
	return list, nil
}
