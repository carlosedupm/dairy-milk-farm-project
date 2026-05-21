package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrIntegracaoClienteNotFound = errors.New("cliente de integracao nao encontrado")
	ErrIntegracaoScopeInvalido   = errors.New("scope de integracao invalido")
	ErrIntegracaoIdempotencyConflict = errors.New("idempotency key ja usada com payload diferente")
)

const idempotencyTTL = 72 * time.Hour

type IntegracaoService struct {
	repo        *repository.IntegracaoRepository
	usuarioRepo *repository.UsuarioRepository
}

func NewIntegracaoService(repo *repository.IntegracaoRepository, usuarioRepo *repository.UsuarioRepository) *IntegracaoService {
	return &IntegracaoService{repo: repo, usuarioRepo: usuarioRepo}
}

func (s *IntegracaoService) validateScopes(scopes []string) error {
	if len(scopes) == 0 {
		return errors.New("pelo menos um scope e obrigatorio")
	}
	for _, sc := range scopes {
		if !models.IsValidIntegrationScope(sc) {
			return ErrIntegracaoScopeInvalido
		}
	}
	return nil
}

func (s *IntegracaoService) CreateCliente(ctx context.Context, nome string, fazendaIDs []int64, scopesStr []string, adminID int64) (*models.IntegracaoCliente, string, error) {
	if err := s.validateScopes(scopesStr); err != nil {
		return nil, "", err
	}
	fullKey, keyPrefix, keyHash, err := GenerateAPIKey()
	if err != nil {
		return nil, "", err
	}
	email := fmt.Sprintf("integracao+%s@interno.ceialmilk", uuid.New().String())
	dummyHash, _ := bcrypt.GenerateFromPassword([]byte(uuid.New().String()), bcrypt.MinCost)
	actor := &models.Usuario{
		Nome:    models.PerfilIntegracaoNomePrefix + nome,
		Email:   email,
		Senha:   string(dummyHash),
		Perfil:  models.PerfilIntegracao,
		Enabled: false,
	}
	if err := s.usuarioRepo.Create(ctx, actor); err != nil {
		return nil, "", err
	}
	c := &models.IntegracaoCliente{
		Nome:             nome,
		ActorUserID:      actor.ID,
		KeyPrefix:        keyPrefix,
		KeyHash:          keyHash,
		Ativo:            true,
		CriadoPorAdminID: &adminID,
	}
	if err := s.repo.CreateCliente(ctx, c); err != nil {
		return nil, "", err
	}
	if err := s.repo.SetFazendas(ctx, c.ID, fazendaIDs); err != nil {
		return nil, "", err
	}
	if err := s.repo.SetScopes(ctx, c.ID, scopesStr); err != nil {
		return nil, "", err
	}
	_ = s.repo.LoadClienteRelations(ctx, c)
	return c, fullKey, nil
}

func (s *IntegracaoService) GetByID(ctx context.Context, id int64) (*models.IntegracaoCliente, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrIntegracaoClienteNotFound
		}
		return nil, err
	}
	if err := s.repo.LoadClienteRelations(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *IntegracaoService) List(ctx context.Context, limit, offset int) ([]*models.IntegracaoCliente, int64, error) {
	list, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	for _, c := range list {
		_ = s.repo.LoadClienteRelations(ctx, c)
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (s *IntegracaoService) UpdateCliente(ctx context.Context, id int64, nome string, ativo *bool, fazendaIDs []int64, scopes []string) error {
	if scopes != nil {
		if err := s.validateScopes(scopes); err != nil {
			return err
		}
	}
	c, err := s.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if nome != "" {
		c.Nome = nome
	}
	if ativo != nil {
		c.Ativo = *ativo
	}
	if err := s.repo.UpdateCliente(ctx, c); err != nil {
		return err
	}
	if fazendaIDs != nil {
		if err := s.repo.SetFazendas(ctx, id, fazendaIDs); err != nil {
			return err
		}
	}
	if scopes != nil {
		if err := s.repo.SetScopes(ctx, id, scopes); err != nil {
			return err
		}
	}
	return nil
}

func (s *IntegracaoService) RotacionarChave(ctx context.Context, id int64) (string, error) {
	if _, err := s.GetByID(ctx, id); err != nil {
		return "", err
	}
	fullKey, keyPrefix, keyHash, err := GenerateAPIKey()
	if err != nil {
		return "", err
	}
	if err := s.repo.UpdateKey(ctx, id, keyPrefix, keyHash); err != nil {
		return "", err
	}
	return fullKey, nil
}

func (s *IntegracaoService) Revogar(ctx context.Context, id int64) error {
	if _, err := s.GetByID(ctx, id); err != nil {
		return err
	}
	return s.repo.Revogar(ctx, id)
}

func (s *IntegracaoService) ResolveClienteByAPIKey(ctx context.Context, fullKey string) (*models.IntegracaoCliente, error) {
	prefix, err := ExtractKeyPrefix(fullKey)
	if err != nil {
		return nil, err
	}
	c, err := s.repo.GetByKeyPrefix(ctx, prefix)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrIntegracaoClienteNotFound
		}
		return nil, err
	}
	if !CompareAPIKey(fullKey, c.KeyHash) {
		return nil, ErrIntegracaoClienteNotFound
	}
	if !c.Ativo || c.RevogadoEm != nil {
		return nil, errors.New("cliente de integracao inativo ou revogado")
	}
	if err := s.repo.LoadClienteRelations(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *IntegracaoService) ListChamadas(ctx context.Context, clienteID int64, limit, offset int) ([]*models.IntegracaoChamada, error) {
	return s.repo.ListChamadas(ctx, clienteID, limit, offset)
}

func (s *IntegracaoService) LogChamada(ctx context.Context, ch *models.IntegracaoChamada) error {
	return s.repo.InsertChamada(ctx, ch)
}

func HashRequestBody(body []byte) string {
	h := sha256.Sum256(body)
	return hex.EncodeToString(h[:])
}

// CheckIdempotency retorna resposta cacheada, ou nil se deve processar. conflict=true se key existe com hash diferente.
func (s *IntegracaoService) CheckIdempotency(ctx context.Context, clienteID int64, key, requestHash string) (cached []byte, statusCode int, conflict bool, err error) {
	if key == "" {
		return nil, 0, false, nil
	}
	row, err := s.repo.GetIdempotencia(ctx, clienteID, key)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, 0, false, nil
		}
		return nil, 0, false, err
	}
	if row.RequestHash != requestHash {
		return nil, 0, true, nil
	}
	return row.ResponseBody, row.StatusCode, false, nil
}

func (s *IntegracaoService) SaveIdempotency(ctx context.Context, clienteID int64, key, requestHash string, statusCode int, responseBody interface{}) error {
	if key == "" {
		return nil
	}
	return s.repo.SaveIdempotencia(ctx, clienteID, key, requestHash, statusCode, responseBody, idempotencyTTL)
}
