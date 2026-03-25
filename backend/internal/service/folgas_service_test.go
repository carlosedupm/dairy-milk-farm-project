package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestUsuarioParaDia_Rodizio5x1(t *testing.T) {
	anchor := time.Date(2026, 3, 25, 0, 0, 0, 0, time.UTC) // quarta
	cfg := &models.FolgasEscalaConfig{
		DataAnchor:   anchor,
		UsuarioSlot0: 10,
		UsuarioSlot1: 20,
		UsuarioSlot2: 30,
	}
	// Quarta: slot 0
	uid, ok := UsuarioParaDia(cfg, anchor)
	if !ok || uid != 10 {
		t.Fatalf("esperado slot0 na quarta, got %d ok=%v", uid, ok)
	}
	// Quinta: slot 1
	uid, ok = UsuarioParaDia(cfg, anchor.AddDate(0, 0, 1))
	if !ok || uid != 20 {
		t.Fatalf("esperado slot1 na quinta")
	}
	// Sábado: slot 2
	uid, ok = UsuarioParaDia(cfg, anchor.AddDate(0, 0, 2))
	if !ok || uid != 30 {
		t.Fatalf("esperado slot2 no sábado")
	}
	// +3, +4, +5: sem folga (sáb, dom, seg no exemplo)
	for _, add := range []int{3, 4, 5} {
		uid, ok = UsuarioParaDia(cfg, anchor.AddDate(0, 0, add))
		if ok {
			t.Fatalf("dia +%d não deveria ter folga automática, uid=%d", add, uid)
		}
	}
	// Próxima quarta (+7): slot 0 de novo (ciclo 6 dias a partir da âncora: +6 = terça com slot0? âncora+6 = terça)
	// âncora quarta +6 = terça — slot 0
	uid, ok = UsuarioParaDia(cfg, anchor.AddDate(0, 0, 6))
	if !ok || uid != 10 {
		t.Fatalf("esperado slot0 em +6 dias (terça), got %d ok=%v", uid, ok)
	}
}
