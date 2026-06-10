package service

import (
	"context"
	"testing"

	"github.com/ceialmilk/api/internal/models"
	"github.com/google/generative-ai-go/genai"
)

// assistenteLiveTenantTestSvc nega acesso a qualquer fazenda (simula usuário de outro tenant).
func assistenteLiveTenantTestSvc() *AssistenteLiveService {
	return &AssistenteLiveService{
		fazendaAccessFn: func(context.Context, int64, int64) bool {
			return false
		},
	}
}

func resultErro(t *testing.T, result interface{}) string {
	t.Helper()
	m, ok := result.(map[string]any)
	if !ok {
		t.Fatalf("esperava map[string]any, recebeu %T", result)
	}
	erro, _ := m["erro"].(string)
	if erro == "" {
		t.Fatalf("esperava campo 'erro' preenchido, recebeu %v", m)
	}
	return erro
}

// Cross-tenant: listar_animais de fazenda sem vínculo deve ser negado antes de tocar o serviço de animais.
func TestAssistenteLive_ListarAnimais_FazendaSemVinculo_Negado(t *testing.T) {
	svc := assistenteLiveTenantTestSvc()
	result, err := svc.ExecuteFunction(context.Background(), genai.FunctionCall{
		Name: "listar_animais",
		Args: map[string]any{"fazenda_id": float64(2)},
	}, 10, models.PerfilFuncionario, 0)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	resultErro(t, result)
}

// Cross-tenant: listar_lotes / listar_gestacoes / listar_lactacoes exigem vínculo com a fazenda.
func TestAssistenteLive_Listagens_FazendaSemVinculo_Negado(t *testing.T) {
	svc := &AssistenteLiveService{
		loteSvc:     &LoteService{},
		gestacaoSvc: &GestacaoService{},
		lactacaoSvc: &LactacaoService{},
		fazendaAccessFn: func(context.Context, int64, int64) bool {
			return false
		},
	}
	for _, fn := range []string{"listar_lotes", "listar_gestacoes", "listar_lactacoes"} {
		result, err := svc.ExecuteFunction(context.Background(), genai.FunctionCall{
			Name: fn,
			Args: map[string]any{"fazenda_id": float64(7)},
		}, 10, models.PerfilProprietario, 0)
		if err != nil {
			t.Fatalf("%s: erro inesperado: %v", fn, err)
		}
		resultErro(t, result)
	}
}

// Perfil: cadastrar_fazenda restrito a ADMIN/DEVELOPER (mesma regra do REST).
func TestAssistenteLive_CadastrarFazenda_PerfilSemPermissao_Negado(t *testing.T) {
	svc := assistenteLiveTenantTestSvc()
	for _, perfil := range []string{models.PerfilFuncionario, models.PerfilGerente, models.PerfilProprietario, models.PerfilUser} {
		result, err := svc.ExecuteFunction(context.Background(), genai.FunctionCall{
			Name: "cadastrar_fazenda",
			Args: map[string]any{"nome": "Fazenda Alheia"},
		}, 10, perfil, 0)
		if err != nil {
			t.Fatalf("perfil %s: erro inesperado: %v", perfil, err)
		}
		resultErro(t, result)
	}
}

// Perfil: editar_fazenda restrito a ADMIN/DEVELOPER (mesma regra do REST).
func TestAssistenteLive_EditarFazenda_PerfilSemPermissao_Negado(t *testing.T) {
	svc := assistenteLiveTenantTestSvc()
	result, err := svc.ExecuteFunction(context.Background(), genai.FunctionCall{
		Name: "editar_fazenda",
		Args: map[string]any{"id": float64(3), "nome": "Novo Nome"},
	}, 10, models.PerfilProprietario, 0)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	resultErro(t, result)
}

// resolveFazendaIDForUser deve retornar 0 quando o usuário não tem vínculo com a fazenda.
func TestAssistenteLive_ResolveFazendaIDForUser_SemVinculo_RetornaZero(t *testing.T) {
	svc := assistenteLiveTenantTestSvc()
	if got := svc.resolveFazendaIDForUser(context.Background(), map[string]interface{}{"fazenda_id": float64(5)}, 0, 10); got != 0 {
		t.Fatalf("esperava 0, recebeu %d", got)
	}
}

// resolveFazendaIDForUser deve aceitar a fazenda quando há vínculo.
func TestAssistenteLive_ResolveFazendaIDForUser_ComVinculo_RetornaID(t *testing.T) {
	svc := &AssistenteLiveService{
		fazendaAccessFn: func(_ context.Context, _ int64, fazendaID int64) bool {
			return fazendaID == 5
		},
	}
	if got := svc.resolveFazendaIDForUser(context.Background(), map[string]interface{}{"fazenda_id": float64(5)}, 0, 10); got != 5 {
		t.Fatalf("esperava 5, recebeu %d", got)
	}
}
