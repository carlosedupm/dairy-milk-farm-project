package service

import (
	"context"
	"log/slog"
)

// AlertaAutoResolver resolve alertas de sistema abertos após evento-fonte.
type AlertaAutoResolver interface {
	ResolveOpenByAnimal(ctx context.Context, fazendaID, animalID int64, tipo string) error
}

func resolveAlertaSilencioso(ctx context.Context, r AlertaAutoResolver, fazendaID, animalID int64, tipo string) {
	if r == nil {
		return
	}
	if err := r.ResolveOpenByAnimal(ctx, fazendaID, animalID, tipo); err != nil {
		slog.Warn("alerta auto-resolução falhou",
			"fazenda_id", fazendaID,
			"animal_id", animalID,
			"tipo", tipo,
			"error", err,
		)
	}
}
