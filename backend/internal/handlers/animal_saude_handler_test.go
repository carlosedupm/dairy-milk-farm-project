package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestParseSaveAnimalSaudeInput(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req := saveAnimalSaudeRequest{
		TipoCaso:   "TRATAMENTO",
		DataInicio: "2026-05-28",
		Status:     "ATIVO",
	}
	in, ok := parseSaveAnimalSaudeInput(c, req)
	if !ok {
		t.Fatal("expected parse success")
	}
	if in.DataInicio.Format("2006-01-02") != "2026-05-28" {
		t.Fatalf("unexpected data_inicio: %s", in.DataInicio.Format("2006-01-02"))
	}
}

func TestParseSaveAnimalSaudeInputInvalidDate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req := saveAnimalSaudeRequest{
		TipoCaso:   "TRATAMENTO",
		DataInicio: "28-05-2026",
		Status:     "ATIVO",
	}
	_, ok := parseSaveAnimalSaudeInput(c, req)
	if ok {
		t.Fatal("expected parse failure for invalid date")
	}
	if w.Code != 400 {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}
