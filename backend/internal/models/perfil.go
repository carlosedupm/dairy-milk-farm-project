package models

// Constantes de perfis de acesso do sistema
const (
	PerfilUser         = "USER"
	PerfilAdmin        = "ADMIN"
	PerfilDeveloper    = "DEVELOPER"
	PerfilFuncionario  = "FUNCIONARIO"
	PerfilGerente      = "GERENTE"
	PerfilGestao       = "GESTAO"
	PerfilProprietario = "PROPRIETARIO"
)

// PodeGerenciarFolgas indica perfis que podem gerar/alterar escala de folgas na fazenda
// (sempre sujeito a validação de vínculo, exceto perfis de gestão global — ver PodeAcessarFazendaSemVinculoGestao).
func PodeGerenciarFolgas(perfil string) bool {
	switch perfil {
	case PerfilAdmin, PerfilDeveloper, PerfilGerente, PerfilGestao, PerfilProprietario:
		return true
	default:
		return false
	}
}

// PodeAcessarFazendaSemVinculoGestao indica perfis que podem operar dados de qualquer fazenda existente
// em rotas que usam ValidateFazendaAccessOrGestao (ex.: folgas para suporte/gestão global).
// Titular (PROPRIETARIO) e GERENTE **não** entram aqui: isolamento por vínculo em usuarios_fazendas.
func PodeAcessarFazendaSemVinculoGestao(perfil string) bool {
	switch perfil {
	case PerfilAdmin, PerfilDeveloper, PerfilGestao:
		return true
	default:
		return false
	}
}
