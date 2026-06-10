package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestValidateElegibilidadeReprodutiva(t *testing.T) {
	t.Parallel()
	ref := time.Date(2026, 6, 9, 14, 0, 0, 0, time.Local)

	strPtr := func(s string) *string { return &s }
	birth := func(y, m, d int) *time.Time {
		t := time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.Local)
		return &t
	}

	tests := []struct {
		name    string
		animal  *models.Animal
		evento  time.Time
		wantInt string
	}{
		{
			name:   "matriz permitida",
			animal: &models.Animal{Categoria: strPtr(models.CategoriaMatriz)},
			evento: ref,
		},
		{
			name:    "bezerra bloqueada",
			animal:  &models.Animal{Categoria: strPtr(models.CategoriaBezerra)},
			evento:  ref,
			wantInt: "INT-008",
		},
		{
			name:    "bezerro bloqueado",
			animal:  &models.Animal{Categoria: strPtr(models.CategoriaBezerro)},
			evento:  ref,
			wantInt: "INT-008",
		},
		{
			name:    "categoria nula",
			animal:  &models.Animal{},
			evento:  ref,
			wantInt: "INT-008",
		},
		{
			name:    "novilha 11 meses",
			animal:  &models.Animal{Categoria: strPtr(models.CategoriaNovilha), DataNascimento: birth(2025, 7, 10)},
			evento:  ref,
			wantInt: "INT-008",
		},
		{
			name:   "novilha 13 meses",
			animal: &models.Animal{Categoria: strPtr(models.CategoriaNovilha), DataNascimento: birth(2025, 4, 1)},
			evento: ref,
		},
		{
			name:    "novilha sem nascimento",
			animal:  &models.Animal{Categoria: strPtr(models.CategoriaNovilha)},
			evento:  ref,
			wantInt: "INT-008",
		},
		{
			name:    "touro bloqueado",
			animal:  &models.Animal{Categoria: strPtr(models.CategoriaTouro)},
			evento:  ref,
			wantInt: "INT-008",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := ValidateElegibilidadeReprodutiva(tt.animal, tt.evento)
			if tt.wantInt == "" {
				if err != nil {
					t.Fatalf("expected nil, got %v", err)
				}
				return
			}
			ie, ok := AsIntegridadeCiclo(err)
			if !ok || ie.IntCodigo != tt.wantInt {
				t.Fatalf("expected %s, got err=%v ie=%+v", tt.wantInt, err, ie)
			}
		})
	}
}
