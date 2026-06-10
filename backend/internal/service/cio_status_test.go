package service

import (
	"context"
	"testing"

	"github.com/ceialmilk/api/internal/models"
)

func TestApplyStatusAfterCio_skipsPrenhe(t *testing.T) {
	prenhe := models.StatusReprodutivoPrenhe
	animal := &models.Animal{ID: 1, StatusReprodutivo: &prenhe}
	s := &CioService{}
	// Sem repo: applyStatusAfterCio só retorna nil quando PRENHE
	if err := s.applyStatusAfterCio(context.TODO(), animal); err != nil {
		t.Fatalf("expected nil for PRENHE, got %v", err)
	}
}
