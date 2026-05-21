package service

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const apiKeyPrefix = "cmk_live_"

// GenerateAPIKey gera chave completa, prefixo de lookup e hash bcrypt.
func GenerateAPIKey() (fullKey, keyPrefix, keyHash string, err error) {
	b := make([]byte, 16)
	if _, err = rand.Read(b); err != nil {
		return "", "", "", err
	}
	secret := hex.EncodeToString(b)
	fullKey = apiKeyPrefix + secret
	// prefixo único para lookup: cmk_live_ + primeiros 8 chars do secret
	keyPrefix = apiKeyPrefix + secret[:8]
	hash, err := bcrypt.GenerateFromPassword([]byte(fullKey), bcrypt.DefaultCost)
	if err != nil {
		return "", "", "", err
	}
	return fullKey, keyPrefix, string(hash), nil
}

// ValidateAPIKeyFormat verifica prefixo Bearer.
func ValidateAPIKeyFormat(token string) bool {
	return strings.HasPrefix(token, apiKeyPrefix) && len(token) > len(apiKeyPrefix)+8
}

// CompareAPIKey compara token com hash armazenado.
func CompareAPIKey(fullKey, keyHash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(keyHash), []byte(fullKey)) == nil
}

// ExtractKeyPrefix extrai prefixo de lookup a partir da chave completa.
func ExtractKeyPrefix(fullKey string) (string, error) {
	if !ValidateAPIKeyFormat(fullKey) {
		return "", fmt.Errorf("formato de chave invalido")
	}
	secret := strings.TrimPrefix(fullKey, apiKeyPrefix)
	if len(secret) < 8 {
		return "", fmt.Errorf("chave curta demais")
	}
	return apiKeyPrefix + secret[:8], nil
}
