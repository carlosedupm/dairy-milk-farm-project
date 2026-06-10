package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ceialmilk/api/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type stubFazendaAccessQuerier struct {
	getByID        func(ctx context.Context, id int64) (*models.Fazenda, error)
	getByUsuarioID func(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error)
}

func (s *stubFazendaAccessQuerier) GetByID(ctx context.Context, id int64) (*models.Fazenda, error) {
	if s.getByID != nil {
		return s.getByID(ctx, id)
	}
	return nil, pgx.ErrNoRows
}

func (s *stubFazendaAccessQuerier) GetByUsuarioID(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
	if s.getByUsuarioID != nil {
		return s.getByUsuarioID(ctx, usuarioID)
	}
	return nil, nil
}

func newAccessTestContext(perfil string, userID int64) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/fazendas/1", nil)
	if userID > 0 {
		c.Set("user_id", userID)
	}
	if perfil != "" {
		c.Set("perfil", perfil)
	}
	return c, w
}

// RF01: ADMIN sem vínculo em usuarios_fazendas pode aceder à fazenda existente.
func TestValidateFazendaAccessOrGestao_AdminSemVinculo_Allows(t *testing.T) {
	c, w := newAccessTestContext(models.PerfilAdmin, 99)
	stub := &stubFazendaAccessQuerier{
		getByID: func(ctx context.Context, id int64) (*models.Fazenda, error) {
			return &models.Fazenda{ID: id, Nome: "Fazenda Teste"}, nil
		},
		getByUsuarioID: func(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
			return nil, nil
		},
	}

	if !ValidateFazendaAccessOrGestao(c, stub, 1) {
		t.Fatalf("esperava acesso permitido para ADMIN, status=%d", w.Code)
	}
}

// RF04: fazenda inexistente retorna 404 na validação de acesso (ADMIN).
func TestValidateFazendaAccessOrGestao_AdminFazendaInexistente_NotFound(t *testing.T) {
	c, w := newAccessTestContext(models.PerfilAdmin, 1)
	stub := &stubFazendaAccessQuerier{
		getByID: func(ctx context.Context, id int64) (*models.Fazenda, error) {
			return nil, pgx.ErrNoRows
		},
	}

	if ValidateFazendaAccessOrGestao(c, stub, 999) {
		t.Fatal("esperava acesso negado para fazenda inexistente")
	}
	if w.Code != http.StatusNotFound {
		t.Fatalf("esperava 404, recebeu %d", w.Code)
	}
}

// RF02 (camada handler): perfil sem vínculo e sem gestão global recebe 403.
func TestValidateFazendaAccessOrGestao_FuncionarioSemVinculo_Forbidden(t *testing.T) {
	c, w := newAccessTestContext(models.PerfilFuncionario, 1)
	stub := &stubFazendaAccessQuerier{
		getByID: func(ctx context.Context, id int64) (*models.Fazenda, error) {
			return &models.Fazenda{ID: id}, nil
		},
		getByUsuarioID: func(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
			return nil, nil
		},
	}

	if ValidateFazendaAccessOrGestao(c, stub, 1) {
		t.Fatal("esperava acesso negado para FUNCIONARIO sem vínculo")
	}
	if w.Code != http.StatusForbidden {
		t.Fatalf("esperava 403, recebeu %d", w.Code)
	}
}

func newListTestContext(userID int64, query string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/animais/count"+query, nil)
	if userID > 0 {
		c.Set("user_id", userID)
	}
	return c, w
}

// Cross-tenant: fazenda_id na query fora do vínculo do usuário deve retornar 403.
func TestResolveFazendaIDsForList_FazendaNaoVinculada_Forbidden(t *testing.T) {
	c, w := newListTestContext(10, "?fazenda_id=99")
	stub := &stubFazendaAccessQuerier{
		getByUsuarioID: func(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
			return []*models.Fazenda{{ID: 1}, {ID: 2}}, nil
		},
	}

	ids, ok := ResolveFazendaIDsForList(c, stub)
	if ok || ids != nil {
		t.Fatal("esperava acesso negado para fazenda fora do vínculo")
	}
	if w.Code != http.StatusForbidden {
		t.Fatalf("esperava 403, recebeu %d", w.Code)
	}
}

// Sem query fazenda_id: retorna apenas as fazendas vinculadas ao usuário (isolamento de listagens).
func TestResolveFazendaIDsForList_SemQuery_RetornaFazendasDoUsuario(t *testing.T) {
	c, _ := newListTestContext(10, "")
	stub := &stubFazendaAccessQuerier{
		getByUsuarioID: func(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
			return []*models.Fazenda{{ID: 1}, {ID: 2}}, nil
		},
	}

	ids, ok := ResolveFazendaIDsForList(c, stub)
	if !ok {
		t.Fatal("esperava sucesso ao resolver fazendas do usuário")
	}
	if len(ids) != 2 || ids[0] != 1 || ids[1] != 2 {
		t.Fatalf("esperava [1 2], recebeu %v", ids)
	}
}

// Cross-tenant: usuário sem fazendas vinculadas recebe lista vazia (nenhum dado de outras fazendas).
func TestResolveFazendaIDsForList_UsuarioSemFazendas_ListaVazia(t *testing.T) {
	c, _ := newListTestContext(10, "")
	stub := &stubFazendaAccessQuerier{
		getByUsuarioID: func(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
			return nil, nil
		},
	}

	ids, ok := ResolveFazendaIDsForList(c, stub)
	if !ok {
		t.Fatal("esperava sucesso (lista vazia) para usuário sem fazendas")
	}
	if len(ids) != 0 {
		t.Fatalf("esperava lista vazia, recebeu %v", ids)
	}
}

func TestValidateFazendaAccessOrGestao_ProprietarioComVinculo_Allows(t *testing.T) {
	c, w := newAccessTestContext(models.PerfilProprietario, 5)
	stub := &stubFazendaAccessQuerier{
		getByUsuarioID: func(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error) {
			return []*models.Fazenda{{ID: 7, Nome: "Minha"}}, nil
		},
	}

	if !ValidateFazendaAccessOrGestao(c, stub, 7) {
		t.Fatalf("esperava acesso permitido para PROPRIETARIO vinculado, status=%d", w.Code)
	}
}
