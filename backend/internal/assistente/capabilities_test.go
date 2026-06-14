package assistente

import "testing"

func TestFuncionarioConsultaCapabilities(t *testing.T) {
	t.Parallel()

	if !FuncionarioIntentAllowed("consultar_animais_fazenda") {
		t.Fatal("consultar_animais_fazenda deveria ser permitido")
	}
	if !FuncionarioIntentAllowed("detalhar_animal") {
		t.Fatal("detalhar_animal deveria ser permitido")
	}
	if FuncionarioIntentAllowed("cadastrar_animal") {
		t.Fatal("cadastrar_animal deveria ser bloqueado")
	}
	if FuncionarioIntentAllowed("registrar_producao_animal") {
		t.Fatal("registrar_producao_animal deveria ser bloqueado")
	}

	if !FuncionarioLiveToolAllowed("listar_animais") {
		t.Fatal("listar_animais deveria ser permitido")
	}
	if !FuncionarioLiveToolAllowed("detalhar_animal") {
		t.Fatal("detalhar_animal live deveria ser permitido")
	}
	if FuncionarioLiveToolAllowed("cadastrar_animal") {
		t.Fatal("cadastrar_animal live deveria ser bloqueado")
	}
}
