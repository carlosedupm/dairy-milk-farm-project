package models

import "time"

type DevStudioRequest struct {
	ID          int64                  `json:"id" db:"id"`
	UserID      int64                  `json:"user_id" db:"user_id"`
	Prompt      string                 `json:"prompt" db:"prompt"`
	Status      string                 `json:"status" db:"status"`
	CodeChanges map[string]interface{} `json:"code_changes" db:"code_changes"` // JSONB
	Error       *string                `json:"error,omitempty" db:"error"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at" db:"updated_at"`
}

type DevStudioAudit struct {
	ID        int64                  `json:"id" db:"id"`
	RequestID *int64                 `json:"request_id,omitempty" db:"request_id"`
	UserID    int64                  `json:"user_id" db:"user_id"`
	Action    string                 `json:"action" db:"action"`
	Details   map[string]interface{} `json:"details" db:"details"` // JSONB
	CreatedAt time.Time              `json:"created_at" db:"created_at"`
}
