package assistente

// Capacidades do assistente para FUNCIONARIO — fase 1 (BRF-007 / BR-ACESSO-006).
var (
	FuncionarioConsultaIntents = map[string]struct{}{
		"consultar_animais_fazenda": {},
		"listar_animais_fazenda":    {},
		"detalhar_animal":           {},
	}

	FuncionarioConsultaLiveTools = map[string]struct{}{
		"listar_animais":     {},
		"detalhar_animal":    {},
		"finalizar_conversa": {},
	}
)

func FuncionarioIntentAllowed(intent string) bool {
	_, ok := FuncionarioConsultaIntents[intent]
	return ok
}

func FuncionarioLiveToolAllowed(name string) bool {
	_, ok := FuncionarioConsultaLiveTools[name]
	return ok
}
