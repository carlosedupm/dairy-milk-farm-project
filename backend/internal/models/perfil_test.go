package models

import "testing"

func TestPodeDeletarFazenda(t *testing.T) {
	allowed := []string{PerfilAdmin, PerfilDeveloper, PerfilGestao, PerfilProprietario}
	for _, p := range allowed {
		if !PodeDeletarFazenda(p) {
			t.Fatalf("esperava PodeDeletarFazenda true para %s", p)
		}
	}
	denied := []string{PerfilUser, PerfilFuncionario, PerfilGerente, PerfilIntegracao}
	for _, p := range denied {
		if PodeDeletarFazenda(p) {
			t.Fatalf("esperava PodeDeletarFazenda false para %s", p)
		}
	}
}
