package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DevStudioRepository struct {
	db *pgxpool.Pool
}

func NewDevStudioRepository(db *pgxpool.Pool) *DevStudioRepository {
	return &DevStudioRepository{db: db}
}

func (r *DevStudioRepository) CreateRequest(ctx context.Context, request *models.DevStudioRequest) error {
	codeChangesJSON, err := json.Marshal(request.CodeChanges)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO dev_studio_requests (user_id, prompt, status, code_changes)
		VALUES ($1, $2, $3, $4::jsonb)
		RETURNING id, created_at, updated_at
	`

	err = r.db.QueryRow(
		ctx,
		query,
		request.UserID,
		request.Prompt,
		request.Status,
		codeChangesJSON,
	).Scan(&request.ID, &request.CreatedAt, &request.UpdatedAt)

	return err
}

func (r *DevStudioRepository) GetByID(ctx context.Context, id int64) (*models.DevStudioRequest, error) {
	query := `
		SELECT id, user_id, prompt, status, code_changes, error, pr_number, pr_url, branch_name, created_at, updated_at
		FROM dev_studio_requests
		WHERE id = $1
	`

	var request models.DevStudioRequest
	var codeChangesJSON []byte
	var errorStr *string

	err := r.db.QueryRow(ctx, query, id).Scan(
		&request.ID,
		&request.UserID,
		&request.Prompt,
		&request.Status,
		&codeChangesJSON,
		&errorStr,
		&request.PRNumber,
		&request.PRURL,
		&request.BranchName,
		&request.CreatedAt,
		&request.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}

	if err != nil {
		return nil, err
	}

	// Parse JSONB
	if len(codeChangesJSON) > 0 {
		if err := json.Unmarshal(codeChangesJSON, &request.CodeChanges); err != nil {
			return nil, err
		}
	}

	request.Error = errorStr

	return &request, nil
}

func (r *DevStudioRepository) Update(ctx context.Context, request *models.DevStudioRequest) error {
	codeChangesJSON, err := json.Marshal(request.CodeChanges)
	if err != nil {
		return err
	}

	query := `
		UPDATE dev_studio_requests
		SET status = $1, code_changes = $2::jsonb, error = $3, pr_number = $4, pr_url = $5, branch_name = $6, updated_at = $7
		WHERE id = $8
	`

	_, err = r.db.Exec(
		ctx,
		query,
		request.Status,
		codeChangesJSON,
		request.Error,
		request.PRNumber,
		request.PRURL,
		request.BranchName,
		time.Now(),
		request.ID,
	)

	return err
}

func (r *DevStudioRepository) GetByUserID(ctx context.Context, userID int64) ([]*models.DevStudioRequest, error) {
	query := `
		SELECT id, user_id, prompt, status, code_changes, error, pr_number, pr_url, branch_name, created_at, updated_at
		FROM dev_studio_requests
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []*models.DevStudioRequest
	for rows.Next() {
		var request models.DevStudioRequest
		var codeChangesJSON []byte
		var errorStr *string

		err := rows.Scan(
			&request.ID,
			&request.UserID,
			&request.Prompt,
			&request.Status,
			&codeChangesJSON,
			&errorStr,
			&request.PRNumber,
			&request.PRURL,
			&request.BranchName,
			&request.CreatedAt,
			&request.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Parse JSONB
		if len(codeChangesJSON) > 0 {
			if err := json.Unmarshal(codeChangesJSON, &request.CodeChanges); err != nil {
				return nil, err
			}
		}

		request.Error = errorStr
		requests = append(requests, &request)
	}

	return requests, rows.Err()
}

func (r *DevStudioRepository) CreateAudit(ctx context.Context, audit *models.DevStudioAudit) error {
	detailsJSON, err := json.Marshal(audit.Details)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO dev_studio_audit (request_id, user_id, action, details)
		VALUES ($1, $2, $3, $4::jsonb)
		RETURNING id, created_at
	`

	err = r.db.QueryRow(
		ctx,
		query,
		audit.RequestID,
		audit.UserID,
		audit.Action,
		detailsJSON,
	).Scan(&audit.ID, &audit.CreatedAt)

	return err
}
