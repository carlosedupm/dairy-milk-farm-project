package service

import (
	"time"

	"github.com/ceialmilk/api/internal/models"
)

// MesesMinimosNovilhaReproducao é a idade mínima em meses civis para marcos reprodutivos em NOVILHA (BR-CICLO-017).
const MesesMinimosNovilhaReproducao = 12

// ValidateElegibilidadeReprodutiva aplica BR-CICLO-016/017 na escrita de marcos do ciclo (INT-008).
func ValidateElegibilidadeReprodutiva(animal *models.Animal, dataEvento time.Time) error {
	if animal == nil {
		return newIntegridade("INT-008", "Animal inválido para marco reprodutivo (BR-CICLO-016).")
	}
	cat := ""
	if animal.Categoria != nil {
		cat = *animal.Categoria
	}
	switch cat {
	case models.CategoriaBezerra, models.CategoriaBezerro:
		return newIntegridade("INT-008",
			"Bezerra ou bezerro não elegível para marcos reprodutivos ou lactação de matriz (BR-CICLO-016).")
	case models.CategoriaMatriz:
		return nil
	case models.CategoriaNovilha:
		if animal.DataNascimento == nil {
			return newIntegridade("INT-008",
				"Novilha sem data de nascimento não elegível para reprodução — informe a data no cadastro (BR-CICLO-017).")
		}
		minima := TruncateToCivilDate(animal.DataNascimento.AddDate(0, MesesMinimosNovilhaReproducao, 0))
		evento := TruncateToCivilDate(dataEvento)
		if evento.Before(minima) {
			return newIntegridade("INT-008",
				"Novilha com menos de 12 meses não elegível para reprodução na data do evento (BR-CICLO-017).")
		}
		return nil
	default:
		return newIntegridade("INT-008",
			"Animal sem categoria NOVILHA ou MATRIZ não elegível para marcos reprodutivos (BR-CICLO-016).")
	}
}
