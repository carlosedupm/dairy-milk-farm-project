package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5/pgconn"
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

func TestUsuarioParaDia_TresDiasComFolgaEmSequenciaNoInicioDoCiclo(t *testing.T) {
	anchor := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	cfg := &models.FolgasEscalaConfig{
		DataAnchor:   anchor,
		UsuarioSlot0: 1,
		UsuarioSlot1: 2,
		UsuarioSlot2: 3,
	}
	inicio := anchor
	fim := anchor.AddDate(0, 0, 5)
	comFolga := 0
	for d := inicio; !d.After(fim); d = d.AddDate(0, 0, 1) {
		if _, tem := UsuarioParaDia(cfg, d); tem {
			comFolga++
		}
	}
	if comFolga != 3 {
		t.Fatalf("em 6 dias consecutivos do ciclo esperados 3 com folga, got %d", comFolga)
	}
}

func TestIsEscalaFolgasUniqueViolation_VariaConstraintName(t *testing.T) {
	t.Parallel()

	// Nome padrão da constraint gerada pela migration.
	err1 := &pgconn.PgError{
		Code:          "23505",
		TableName:     "escala_folgas",
		ConstraintName: "escala_folgas_fazenda_id_data_usuario_id_key",
		Message:       `duplicate key value violates unique constraint "escala_folgas_fazenda_id_data_usuario_id_key"`,
	}
	if !isEscalaFolgasUniqueViolation(err1) {
		t.Fatalf("esperado true para constraint padrão")
	}

	// Variação comum: sufixo numérico quando a constraint/index foi recriada.
	err2 := &pgconn.PgError{
		Code:          "23505",
		TableName:     "escala_folgas",
		ConstraintName: "escala_folgas_fazenda_id_data_usuario_id_key1",
		Message:       `duplicate key value violates unique constraint "escala_folgas_fazenda_id_data_usuario_id_key1"`,
	}
	if !isEscalaFolgasUniqueViolation(err2) {
		t.Fatalf("esperado true para constraint com sufixo")
	}

	// Não deve cair como escala_folgas.
	err3 := &pgconn.PgError{
		Code:          "23505",
		TableName:     "outra_tabela",
		ConstraintName: "outra_tabela_x_y_key",
		Message:       `duplicate key value violates unique constraint "outra_tabela_x_y_key"`,
	}
	if isEscalaFolgasUniqueViolation(err3) {
		t.Fatalf("esperado false para outra tabela")
	}
}
