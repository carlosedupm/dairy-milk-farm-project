package service

import "testing"

func TestDiasMinimosToque(t *testing.T) {
	if DiasMinimosToque != 15 {
		t.Fatalf("DiasMinimosToque = %d, want 15", DiasMinimosToque)
	}
}
