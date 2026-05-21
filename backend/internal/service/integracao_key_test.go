package service

import "testing"

func TestGenerateAPIKeyAndValidate(t *testing.T) {
	full, prefix, hash, err := GenerateAPIKey()
	if err != nil {
		t.Fatal(err)
	}
	if !ValidateAPIKeyFormat(full) {
		t.Fatal("expected valid key format")
	}
	gotPrefix, err := ExtractKeyPrefix(full)
	if err != nil {
		t.Fatal(err)
	}
	if gotPrefix != prefix {
		t.Fatalf("prefix mismatch: %s vs %s", gotPrefix, prefix)
	}
	if !CompareAPIKey(full, hash) {
		t.Fatal("bcrypt compare failed")
	}
	if CompareAPIKey(full+"x", hash) {
		t.Fatal("expected wrong key to fail")
	}
}

func TestValidateAPIKeyFormatRejectsJWT(t *testing.T) {
	if ValidateAPIKeyFormat("eyJhbGciOiJSUzI1NiJ9") {
		t.Fatal("jwt should not match integracao key format")
	}
}
