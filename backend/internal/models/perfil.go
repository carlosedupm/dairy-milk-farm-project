package models

// Constantes de perfis de acesso do sistema
const (
	PerfilUser        = "USER"
	PerfilAdmin       = "ADMIN"
	PerfilDeveloper   = "DEVELOPER"
	PerfilFuncionario = "FUNCIONARIO"
	PerfilGerente     = "GERENTE"
	PerfilGestao      = "GESTAO"
)

// PodeGerenciarFolgas indica perfis que podem gerar/alterar escala de folgas.
func PodeGerenciarFolgas(perfil string) bool {
	switch perfil {
	case PerfilAdmin, PerfilDeveloper, PerfilGerente, PerfilGestao:
		return true
	default:
		return false
	}
}
