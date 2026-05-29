package models

import "time"

type PushSubscription struct {
	ID         int64     `json:"id" db:"id"`
	UsuarioID  int64     `json:"usuario_id" db:"usuario_id"`
	Endpoint   string    `json:"endpoint" db:"endpoint"`
	P256dh     string    `json:"p256dh" db:"p256dh"`
	Auth       string    `json:"auth" db:"auth"`
	UserAgent  *string   `json:"user_agent,omitempty" db:"user_agent"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}
