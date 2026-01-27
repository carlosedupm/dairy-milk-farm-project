package service

import (
	"context"
	"path/filepath"
	"strings"
)

type LinterService struct {
	// Configurações podem ser adicionadas aqui no futuro
}

func NewLinterService() *LinterService {
	return &LinterService{}
}

type LinterResult struct {
	File     string   `json:"file"`
	Errors   []string `json:"errors"`
	Warnings []string `json:"warnings"`
	Success  bool     `json:"success"`
}

// RunLinter executa o linter apropriado baseado na extensão do arquivo
func (s *LinterService) RunLinter(ctx context.Context, path string, content string) (*LinterResult, error) {
	ext := filepath.Ext(path)
	switch ext {
	case ".go":
		return s.lintGo(ctx, path, content)
	case ".ts", ".tsx", ".js", ".jsx":
		return s.lintTypeScript(ctx, path, content)
	default:
		// Para outros tipos de arquivo, retornar sucesso sem lintar
		return &LinterResult{
			File:    path,
			Success: true,
		}, nil
	}
}

// lintGo executa validação básica de sintaxe Go (go vet requer módulo completo)
func (s *LinterService) lintGo(ctx context.Context, path string, content string) (*LinterResult, error) {
	result := &LinterResult{
		File:     path,
		Errors:   []string{},
		Warnings: []string{},
		Success:  true,
	}

	// Validação básica: verificar se o arquivo não está vazio
	if strings.TrimSpace(content) == "" {
		result.Errors = append(result.Errors, "Arquivo está vazio")
		result.Success = false
		return result, nil
	}

	// Validação básica: verificar chaves balanceadas
	openBraces := 0
	for _, char := range content {
		if char == '{' {
			openBraces++
		} else if char == '}' {
			openBraces--
		}
	}
	if openBraces != 0 {
		result.Warnings = append(result.Warnings, "Possíveis chaves desbalanceadas detectadas")
	}

	// Nota: go vet e golangci-lint requerem um módulo Go completo com go.mod
	// Para validação mais completa, seria necessário criar um módulo temporário
	// Por enquanto, apenas validação básica de sintaxe

	return result, nil
}

// lintTypeScript executa eslint no código TypeScript/JavaScript
func (s *LinterService) lintTypeScript(ctx context.Context, path string, content string) (*LinterResult, error) {
	result := &LinterResult{
		File:     path,
		Errors:   []string{},
		Warnings: []string{},
		Success:  true,
	}

	// Verificar se eslint está disponível
	// Como estamos no backend Go, não temos acesso direto ao node_modules do frontend
	// Vou fazer uma validação básica de sintaxe por enquanto
	// Em produção, poderia executar eslint via npx se o frontend estiver acessível

	// Validação básica: verificar se o arquivo não está vazio
	if strings.TrimSpace(content) == "" {
		result.Errors = append(result.Errors, "Arquivo está vazio")
		result.Success = false
		return result, nil
	}

	// Validação básica: verificar parênteses/chaves balanceados
	if !s.basicSyntaxCheck(content) {
		result.Warnings = append(result.Warnings, "Possíveis problemas de sintaxe detectados (validação básica)")
	}

	return result, nil
}

// basicSyntaxCheck faz uma validação básica de sintaxe
func (s *LinterService) basicSyntaxCheck(content string) bool {
	openBraces := 0
	openParens := 0
	openBrackets := 0

	for _, char := range content {
		switch char {
		case '{':
			openBraces++
		case '}':
			openBraces--
		case '(':
			openParens++
		case ')':
			openParens--
		case '[':
			openBrackets++
		case ']':
			openBrackets--
		}
	}

	return openBraces == 0 && openParens == 0 && openBrackets == 0
}
