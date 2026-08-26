package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func runSeedDev(ctx context.Context, pool *pgxpool.Pool) error {
	path, err := seedDevSQLPath()
	if err != nil {
		return err
	}
	sqlBytes, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("ler seed_dev.sql: %w", err)
	}

	seedCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if _, err := pool.Exec(seedCtx, string(sqlBytes)); err != nil {
		return fmt.Errorf("executar seed_dev.sql: %w", err)
	}
	slog.Info("Seed de desenvolvimento aplicado", "path", path)
	return nil
}

func seedDevSQLPath() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	candidates := []string{
		filepath.Join(wd, "scripts", "seed_dev.sql"),
		filepath.Join(wd, "..", "scripts", "seed_dev.sql"),
		filepath.Join(wd, "backend", "scripts", "seed_dev.sql"),
		"/workspace/backend/scripts/seed_dev.sql",
	}
	for _, c := range candidates {
		abs, err := filepath.Abs(c)
		if err != nil {
			continue
		}
		if _, err := os.Stat(abs); err == nil {
			return abs, nil
		}
	}
	return "", fmt.Errorf("seed_dev.sql não encontrado (procurado a partir de %s)", wd)
}
