package handlers

import "testing"

func TestSetCreatedBy(t *testing.T) {
	var dst *int64
	SetCreatedBy(&dst, 42)
	if dst == nil || *dst != 42 {
		t.Fatalf("expected created_by 42, got %v", dst)
	}
	SetCreatedBy(&dst, 0)
	if dst == nil || *dst != 42 {
		t.Fatalf("expected unchanged 42 after actorID 0, got %v", dst)
	}
}
