package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

// EncerrarLactacaoAtivaTx encerra a lactação em andamento do animal, se existir.
func EncerrarLactacaoAtivaTx(
	ctx context.Context,
	tx pgx.Tx,
	lactacaoRepo *repository.LactacaoRepository,
	animalID int64,
	dataFim time.Time,
) error {
	lact, err := lactacaoRepo.GetEmAndamentoByAnimalIDTx(ctx, tx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	dias := diasLactacaoCivis(lact.DataInicio, dataFim)
	st := models.LactacaoStatusEncerrada
	lact.DataFim = &dataFim
	lact.DiasLactacao = &dias
	lact.Status = &st
	return lactacaoRepo.UpdateTx(ctx, tx, lact)
}
