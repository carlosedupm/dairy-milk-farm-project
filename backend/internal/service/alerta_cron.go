package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/ceialmilk/api/internal/config"
)

func RunAlertasCron(ctx context.Context, cfg *config.Config, svc *AlertaGeracaoService) {
	if cfg == nil || svc == nil || !cfg.AlertasCronEnabled {
		return
	}

	tzName := cfg.AlertasTZ
	if tzName == "" {
		tzName = "America/Sao_Paulo"
	}
	loc, err := time.LoadLocation(tzName)
	if err != nil {
		slog.Warn("alertas cron: timezone inválida, usando UTC", "tz", tzName, "error", err)
		loc = time.UTC
	}

	hour := cfg.AlertasCronHour
	if hour < 0 || hour > 23 {
		hour = 6
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("alertas cron: panic recuperado", "panic", r)
			}
		}()

		for {
			now := time.Now().In(loc)
			next := time.Date(now.Year(), now.Month(), now.Day(), hour, 0, 0, 0, loc)
			if !next.After(now) {
				next = next.Add(24 * time.Hour)
			}
			wait := time.Until(next)
			slog.Info("alertas cron: próxima execução agendada", "at", next.Format(time.RFC3339), "wait", wait.String())

			select {
			case <-ctx.Done():
				slog.Info("alertas cron: encerrado")
				return
			case <-time.After(wait):
			}

			runCtx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
			ref := time.Now().In(loc)
			res, err := svc.GerarAlertasDiarios(runCtx, ref)
			cancel()
			if err != nil {
				slog.Error("alertas cron: execução falhou", "error", err)
			} else {
				slog.Info("alertas cron: execução concluída",
					"fazendas", res.FazendasProcessadas,
					"criados", res.Criados,
					"ignorados_duplicata", res.IgnoradosDuplicata,
					"erros_regra", res.ErrosRegra,
				)
			}
		}
	}()
}
