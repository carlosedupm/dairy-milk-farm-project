package service

import (
	"context"
	"log/slog"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
)

// IdadeMinimaMesesBezerraNovilha é a idade em meses a partir da qual bezerra pode ser reclassificada em novilha (padrão 12).
const IdadeMinimaMesesBezerraNovilha = 12

// ReclassificacaoCategoriaService executa regras de reclassificação automática de categoria (ex.: bezerra → novilha por idade).
type ReclassificacaoCategoriaService struct {
	animalRepo *repository.AnimalRepository
}

func NewReclassificacaoCategoriaService(animalRepo *repository.AnimalRepository) *ReclassificacaoCategoriaService {
	return &ReclassificacaoCategoriaService{animalRepo: animalRepo}
}

// ResultadoReclassificacaoPorIdade agrupa o resultado da execução da reclassificação por idade.
type ResultadoReclassificacaoPorIdade struct {
	Reclassificados int      `json:"reclassificados"`
	Ids             []int64  `json:"ids"`
	MesesUtilizados int      `json:"meses_utilizados"`
}

// RunReclassificacaoPorIdade reclassifica bezerras com idade >= mesesIdadeMinima em novilhas.
// Se mesesIdadeMinima <= 0, usa IdadeMinimaMesesBezerraNovilha (12).
func (s *ReclassificacaoCategoriaService) RunReclassificacaoPorIdade(ctx context.Context, mesesIdadeMinima int) (*ResultadoReclassificacaoPorIdade, error) {
	if mesesIdadeMinima <= 0 {
		mesesIdadeMinima = IdadeMinimaMesesBezerraNovilha
	}
	lista, err := s.animalRepo.ListBezerrasParaReclassificarPorIdade(ctx, mesesIdadeMinima)
	if err != nil {
		return nil, err
	}
	novilha := models.CategoriaNovilha
	var ids []int64
	for _, a := range lista {
		if err := s.animalRepo.UpdateCategoria(ctx, a.ID, &novilha); err != nil {
			slog.Warn("reclassificacao_categoria: falha ao atualizar animal", "animal_id", a.ID, "error", err)
			continue
		}
		ids = append(ids, a.ID)
	}
	return &ResultadoReclassificacaoPorIdade{
		Reclassificados: len(ids),
		Ids:             ids,
		MesesUtilizados: mesesIdadeMinima,
	}, nil
}
