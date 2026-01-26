package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type GitHubService struct {
	token    string
	repo     string // formato: owner/repo
	baseURL  string
	owner    string
	repoName string
}

type CreatePRRequest struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Head  string `json:"head"` // branch name
	Base  string `json:"base"` // base branch (main)
}

type CreatePRResponse struct {
	Number int    `json:"number"`
	URL    string `json:"html_url"`
	State  string `json:"state"`
}

type PRStatus struct {
	Number int    `json:"number"`
	URL    string `json:"html_url"`
	State  string `json:"state"`
	Merged bool   `json:"merged"`
}

type FileContent struct {
	Content string `json:"content"`
	Sha     string `json:"sha,omitempty"`
}

func NewGitHubService(token, repo string) *GitHubService {
	parts := strings.Split(repo, "/")
	owner := ""
	repoName := ""
	if len(parts) == 2 {
		owner = parts[0]
		repoName = parts[1]
	}

	return &GitHubService{
		token:    token,
		repo:     repo,
		baseURL:  "https://api.github.com",
		owner:    owner,
		repoName: repoName,
	}
}

func (s *GitHubService) CreatePR(ctx context.Context, branchName string, files map[string]string, title, body string) (*CreatePRResponse, error) {
	if s.token == "" || s.repo == "" {
		return nil, fmt.Errorf("GitHub token ou repositório não configurado")
	}

	if s.owner == "" || s.repoName == "" {
		return nil, fmt.Errorf("formato de repositório inválido. Use owner/repo")
	}

	// 1. Obter SHA da branch base (main)
	baseBranchSHA, err := s.getBranchSHA(ctx, "main")
	if err != nil {
		return nil, fmt.Errorf("erro ao obter SHA da branch main: %w", err)
	}

	// 2. Criar branch
	if err := s.createBranch(ctx, branchName, baseBranchSHA); err != nil {
		return nil, fmt.Errorf("erro ao criar branch: %w", err)
	}

	// 3. Criar/atualizar arquivos
	for path, content := range files {
		if err := s.createOrUpdateFile(ctx, branchName, path, content); err != nil {
			slog.Warn("Erro ao criar/atualizar arquivo", "path", path, "error", err)
			// Continuar com outros arquivos mesmo se um falhar
		}
	}

	// 4. Criar Pull Request
	pr, err := s.openPullRequest(ctx, branchName, title, body)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar Pull Request: %w", err)
	}

	return pr, nil
}

func (s *GitHubService) getBranchSHA(ctx context.Context, branch string) (string, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/git/ref/heads/%s", s.baseURL, s.owner, s.repoName, branch)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("erro ao obter branch: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var ref struct {
		Object struct {
			SHA string `json:"sha"`
		} `json:"object"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&ref); err != nil {
		return "", err
	}

	return ref.Object.SHA, nil
}

func (s *GitHubService) createBranch(ctx context.Context, branchName, sha string) error {
	url := fmt.Sprintf("%s/repos/%s/%s/git/refs", s.baseURL, s.owner, s.repoName)

	payload := map[string]interface{}{
		"ref": fmt.Sprintf("refs/heads/%s", branchName),
		"sha": sha,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusUnprocessableEntity {
		// 422 pode significar que a branch já existe, o que é OK
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("erro ao criar branch: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func (s *GitHubService) createOrUpdateFile(ctx context.Context, branch, path, content string) error {
	// Verificar se arquivo existe
	fileSHA, err := s.getFileSHA(ctx, branch, path)
	fileExists := err == nil

	url := fmt.Sprintf("%s/repos/%s/%s/contents/%s", s.baseURL, s.owner, s.repoName, path)

	// Codificar conteúdo em base64
	encodedContent := base64.StdEncoding.EncodeToString([]byte(content))

	payload := map[string]interface{}{
		"message": fmt.Sprintf("Update %s via Dev Studio", path),
		"content": encodedContent,
		"branch":  branch,
	}

	if fileExists {
		payload["sha"] = fileSHA
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("erro ao criar/atualizar arquivo: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func (s *GitHubService) getFileSHA(ctx context.Context, branch, path string) (string, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/contents/%s?ref=%s", s.baseURL, s.owner, s.repoName, path, branch)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("arquivo não encontrado")
	}

	var file struct {
		SHA string `json:"sha"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&file); err != nil {
		return "", err
	}

	return file.SHA, nil
}

func (s *GitHubService) openPullRequest(ctx context.Context, branchName, title, body string) (*CreatePRResponse, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/pulls", s.baseURL, s.owner, s.repoName)

	payload := CreatePRRequest{
		Title: title,
		Body:  body,
		Head:  branchName,
		Base:  "main",
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("erro ao criar Pull Request: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var pr CreatePRResponse
	if err := json.NewDecoder(resp.Body).Decode(&pr); err != nil {
		return nil, err
	}

	return &pr, nil
}

func (s *GitHubService) GetPRStatus(ctx context.Context, prNumber int64) (*PRStatus, error) {
	if s.token == "" || s.repo == "" {
		return nil, fmt.Errorf("GitHub token ou repositório não configurado")
	}

	if s.owner == "" || s.repoName == "" {
		return nil, fmt.Errorf("formato de repositório inválido. Use owner/repo")
	}

	url := fmt.Sprintf("%s/repos/%s/%s/pulls/%d", s.baseURL, s.owner, s.repoName, prNumber)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("token %s", s.token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("erro ao obter status do PR: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var pr PRStatus
	if err := json.NewDecoder(resp.Body).Decode(&pr); err != nil {
		return nil, err
	}

	return &pr, nil
}

func (s *GitHubService) GetPRDetails(ctx context.Context, prNumber int64) (*PRStatus, error) {
	return s.GetPRStatus(ctx, prNumber)
}
