package models

import "testing"

func TestIsValidSexo(t *testing.T) {
	tests := []struct {
		name  string
		sexo  string
		valid bool
	}{
		{"Macho válido", "M", true},
		{"Fêmea válido", "F", true},
		{"valor inválido", "outro", false},
		{"valor vazio", "", false},
		{"valor com minúsculas", "m", false},
		{"valor com minúsculas f", "f", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidSexo(tt.sexo)
			if result != tt.valid {
				t.Errorf("IsValidSexo(%q) = %v, esperado %v", tt.sexo, result, tt.valid)
			}
		})
	}
}

func TestIsValidStatusSaude(t *testing.T) {
	tests := []struct {
		name   string
		status string
		valid  bool
	}{
		{"SAUDAVEL válido", "SAUDAVEL", true},
		{"DOENTE válido", "DOENTE", true},
		{"EM_TRATAMENTO válido", "EM_TRATAMENTO", true},
		{"valor inválido", "outro", false},
		{"valor vazio", "", false},
		{"valor com minúsculas", "saudavel", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidStatusSaude(tt.status)
			if result != tt.valid {
				t.Errorf("IsValidStatusSaude(%q) = %v, esperado %v", tt.status, result, tt.valid)
			}
		})
	}
}

func TestValidSexos(t *testing.T) {
	sexos := ValidSexos()
	if len(sexos) != 2 {
		t.Errorf("ValidSexos() retornou %d valores, esperado 2", len(sexos))
	}
	
	expected := map[string]bool{"M": true, "F": true}
	for _, s := range sexos {
		if !expected[s] {
			t.Errorf("ValidSexos() contém valor inesperado: %q", s)
		}
	}
}

func TestValidStatusSaude(t *testing.T) {
	statuses := ValidStatusSaude()
	if len(statuses) != 3 {
		t.Errorf("ValidStatusSaude() retornou %d valores, esperado 3", len(statuses))
	}
	
	expected := map[string]bool{"SAUDAVEL": true, "DOENTE": true, "EM_TRATAMENTO": true}
	for _, s := range statuses {
		if !expected[s] {
			t.Errorf("ValidStatusSaude() contém valor inesperado: %q", s)
		}
	}
}
