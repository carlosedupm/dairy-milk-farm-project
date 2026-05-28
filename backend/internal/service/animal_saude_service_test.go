package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestDeriveAnimalStatusSaudeFromCasosAtivos(t *testing.T) {
	tests := []struct {
		name     string
		casos    []*models.AnimalSaude
		expected string
	}{
		{
			name:     "sem casos ativos vira saudavel",
			casos:    []*models.AnimalSaude{},
			expected: models.StatusSaudavel,
		},
		{
			name: "somente preventivo ativo vira doente",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoPreventivo, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusDoente,
		},
		{
			name: "tratamento ativo vira em tratamento",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoTratamento, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusTratamento,
		},
		{
			name: "cirurgia ativa vira em tratamento",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoCirurgia, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusTratamento,
		},
		{
			name: "qualquer caso com tratamento tem prioridade",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoPreventivo, Status: models.AnimalSaudeStatusAtivo},
				{TipoCaso: models.AnimalSaudeTipoTratamento, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusTratamento,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := deriveAnimalStatusSaudeFromCasosAtivos(tc.casos)
			if got != tc.expected {
				t.Fatalf("expected %s, got %s", tc.expected, got)
			}
		})
	}
}

func TestValidateAnimalSaudeInput(t *testing.T) {
	inicio := time.Date(2026, 5, 28, 10, 0, 0, 0, time.UTC)
	fimValido := inicio.AddDate(0, 0, 2)
	fimInvalido := inicio.AddDate(0, 0, -1)

	tests := []struct {
		name    string
		input   SaveAnimalSaudeInput
		wantErr error
	}{
		{
			name: "input valido",
			input: SaveAnimalSaudeInput{
				TipoCaso:   models.AnimalSaudeTipoPreventivo,
				DataInicio: inicio,
				DataFim:    &fimValido,
				Status:     models.AnimalSaudeStatusAtivo,
			},
		},
		{
			name: "tipo invalido",
			input: SaveAnimalSaudeInput{
				TipoCaso:   "X",
				DataInicio: inicio,
				Status:     models.AnimalSaudeStatusAtivo,
			},
			wantErr: ErrAnimalSaudeTipoCasoInvalido,
		},
		{
			name: "status invalido",
			input: SaveAnimalSaudeInput{
				TipoCaso:   models.AnimalSaudeTipoOutro,
				DataInicio: inicio,
				Status:     "X",
			},
			wantErr: ErrAnimalSaudeStatusInvalido,
		},
		{
			name: "data fim antes do inicio",
			input: SaveAnimalSaudeInput{
				TipoCaso:   models.AnimalSaudeTipoOutro,
				DataInicio: inicio,
				DataFim:    &fimInvalido,
				Status:     models.AnimalSaudeStatusConcluido,
			},
			wantErr: ErrAnimalSaudeDataFimInvalida,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateAnimalSaudeInput(tc.input)
			if tc.wantErr == nil && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tc.wantErr != nil && err != tc.wantErr {
				t.Fatalf("expected error %v, got %v", tc.wantErr, err)
			}
		})
	}
}
