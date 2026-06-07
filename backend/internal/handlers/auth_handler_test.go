package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ceialmilk/api/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type stubAuthUsuarioRepository struct {
	getByID func(ctx context.Context, id int64) (*models.Usuario, error)
}

func (s *stubAuthUsuarioRepository) ExistsByEmail(ctx context.Context, email string, excludeID int64) (bool, error) {
	return false, nil
}

func (s *stubAuthUsuarioRepository) Create(ctx context.Context, u *models.Usuario) error {
	return nil
}

func (s *stubAuthUsuarioRepository) GetByEmail(ctx context.Context, email string) (*models.Usuario, error) {
	return nil, pgx.ErrNoRows
}

func (s *stubAuthUsuarioRepository) GetByID(ctx context.Context, id int64) (*models.Usuario, error) {
	if s.getByID != nil {
		return s.getByID(ctx, id)
	}
	return nil, pgx.ErrNoRows
}

func newMeTestContext(userID int64) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	if userID > 0 {
		c.Set("user_id", userID)
	}
	return c, w
}

func TestAuthHandler_Me_OK(t *testing.T) {
	t.Parallel()

	c, w := newMeTestContext(42)
	h := &AuthHandler{
		userRepo: &stubAuthUsuarioRepository{
			getByID: func(ctx context.Context, id int64) (*models.Usuario, error) {
				return &models.Usuario{
					ID:      42,
					Nome:    "Maria",
					Email:   "maria@example.com",
					Perfil:  models.PerfilGerente,
					Enabled: true,
				}, nil
			},
		},
	}

	h.Me(c)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Data struct {
			ID     int64  `json:"id"`
			Nome   string `json:"nome"`
			Email  string `json:"email"`
			Perfil string `json:"perfil"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Data.ID != 42 || resp.Data.Nome != "Maria" || resp.Data.Email != "maria@example.com" || resp.Data.Perfil != models.PerfilGerente {
		t.Fatalf("unexpected data: %+v", resp.Data)
	}
}

func TestAuthHandler_Me_MissingUserID(t *testing.T) {
	t.Parallel()

	c, w := newMeTestContext(0)
	h := &AuthHandler{userRepo: &stubAuthUsuarioRepository{}}

	h.Me(c)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuthHandler_Me_UserNotFound(t *testing.T) {
	t.Parallel()

	c, w := newMeTestContext(99)
	h := &AuthHandler{userRepo: &stubAuthUsuarioRepository{}}

	h.Me(c)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuthHandler_Me_UserDisabled(t *testing.T) {
	t.Parallel()

	c, w := newMeTestContext(7)
	h := &AuthHandler{
		userRepo: &stubAuthUsuarioRepository{
			getByID: func(ctx context.Context, id int64) (*models.Usuario, error) {
				return &models.Usuario{
					ID:      id,
					Nome:    "Inativo",
					Email:   "inativo@example.com",
					Perfil:  models.PerfilUser,
					Enabled: false,
				}, nil
			},
		},
	}

	h.Me(c)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}
