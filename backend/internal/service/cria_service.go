package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrCriaNotFound = errors.New("cria nao encontrada")

type CriaService struct {
	pool       *pgxpool.Pool
	repo       *repository.CriaRepository
	partoRepo  *repository.PartoRepository
	animalRepo *repository.AnimalRepository
}

func NewCriaService(pool *pgxpool.Pool, repo *repository.CriaRepository, partoRepo *repository.PartoRepository, animalRepo *repository.AnimalRepository) *CriaService {
	return &CriaService{pool: pool, repo: repo, partoRepo: partoRepo, animalRepo: animalRepo}
}

func (s *CriaService) validateCriaCampos(c *models.Cria) error {
	if c.Sexo == "" || c.Condicao == "" {
		return errors.New("parto_id, sexo e condicao sao obrigatorios")
	}
	if c.Sexo != models.SexoMacho && c.Sexo != models.SexoFemea {
		return errors.New("sexo invalido")
	}
	valid := false
	for _, cond := range models.ValidCondicoesCria() {
		if cond == c.Condicao {
			valid = true
			break
		}
	}
	if !valid {
		return errors.New("condicao invalida")
	}
	return nil
}

func (s *CriaService) Create(ctx context.Context, c *models.Cria) error {
	if c.PartoID <= 0 {
		return errors.New("parto_id, sexo e condicao sao obrigatorios")
	}
	if err := s.validateCriaCampos(c); err != nil {
		return err
	}
	parto, err := s.partoRepo.GetByID(ctx, c.PartoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPartoNotFound
		}
		return err
	}
	if err := EnsureAnimalIDNoRebanho(ctx, s.animalRepo, parto.AnimalID); err != nil {
		return err
	}

	identUser := strings.TrimSpace(ptrStr(c.AnimalIdentificacao))
	var racaPtr *string
	if r := strings.TrimSpace(ptrStr(c.AnimalRaca)); r != "" {
		racaPtr = &r
	}
	clearCriaTransientAnimalFields(c)

	if c.Condicao != models.CriaCondicaoVivo || c.AnimalID != nil {
		return s.repo.Create(ctx, c)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	if _, err := s.partoRepo.GetByIDForUpdateTx(ctx, tx, c.PartoID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPartoNotFound
		}
		return err
	}

	if err := s.insertCriaVivaComAnimalGeradoTx(ctx, tx, parto, c, identUser, racaPtr); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}

// createCriaAsPartOfPartoTx insere uma cria dentro de uma transação já aberta (ex.: parto + N crias).
// O registo do parto em `parto` deve estar persistido na mesma transação; `c.PartoID` deve coincidir com `parto.ID`.
func (s *CriaService) createCriaAsPartOfPartoTx(ctx context.Context, tx pgx.Tx, parto *models.Parto, c *models.Cria) error {
	if err := s.validateCriaCampos(c); err != nil {
		return err
	}
	if c.PartoID != parto.ID {
		c.PartoID = parto.ID
	}
	identUser := strings.TrimSpace(ptrStr(c.AnimalIdentificacao))
	var racaPtr *string
	if r := strings.TrimSpace(ptrStr(c.AnimalRaca)); r != "" {
		racaPtr = &r
	}
	clearCriaTransientAnimalFields(c)

	if c.Condicao != models.CriaCondicaoVivo || c.AnimalID != nil {
		return s.repo.CreateTx(ctx, tx, c)
	}
	return s.insertCriaVivaComAnimalGeradoTx(ctx, tx, parto, c, identUser, racaPtr)
}

func (s *CriaService) insertCriaVivaComAnimalGeradoTx(ctx context.Context, tx pgx.Tx, parto *models.Parto, c *models.Cria, identUser string, racaPtr *string) error {
	cnt, err := s.repo.CountByPartoIDTx(ctx, tx, parto.ID)
	if err != nil {
		return err
	}
	n := int(cnt) + 1

	ident, err := s.resolveIdentificacaoCriaVivaTx(ctx, tx, parto, c, n, identUser)
	if err != nil {
		return err
	}

	categoria := models.CategoriaBezerra
	if c.Sexo == models.SexoMacho {
		categoria = models.CategoriaBezerro
	}
	dn := parto.Data
	origem := models.OrigemNascido
	statusSaude := resolveStatusSaudeCriaViva(c)
	animal := &models.Animal{
		Identificacao:   ident,
		Sexo:            &c.Sexo,
		FazendaID:       parto.FazendaID,
		MaeID:           &parto.AnimalID,
		Categoria:       &categoria,
		PesoNascimento:  c.Peso,
		DataNascimento:  &dn,
		OrigemAquisicao: &origem,
		Raca:            racaPtr,
		StatusSaude:     &statusSaude,
		CreatedBy:       parto.CreatedBy,
	}
	if err := s.repo.CreateTx(ctx, tx, c); err != nil {
		return err
	}
	if err := s.animalRepo.CreateTx(ctx, tx, animal); err != nil {
		return err
	}
	c.AnimalID = &animal.ID
	if err := s.repo.UpdateTx(ctx, tx, c); err != nil {
		return err
	}
	return nil
}

func (s *CriaService) resolveIdentificacaoCriaVivaTx(ctx context.Context, tx pgx.Tx, parto *models.Parto, c *models.Cria, n int, identUser string) (string, error) {
	if identUser != "" {
		taken, err := s.animalRepo.ExistsByIdentificacaoTx(ctx, tx, identUser)
		if err != nil {
			return "", err
		}
		if taken {
			return "", ErrAnimalIdentificacaoDuplicada
		}
		return identUser, nil
	}
	datePart := parto.Data.Format("20060102")
	maeToken := "MAE"
	if mae, err := s.animalRepo.GetByIDTx(ctx, tx, parto.AnimalID); err == nil && mae != nil {
		maeToken = identificacaoMaeNoPadrao(mae.Identificacao)
	}
	prefix := "FILHA"
	if c.Sexo == models.SexoMacho {
		prefix = "FILHO"
	}
	base := fmt.Sprintf("%s-%s-%s-%d-%d", prefix, maeToken, datePart, parto.ID, n)
	found := false
	var ident string
	for i := 0; i < 50; i++ {
		cand := base
		if i > 0 {
			cand = fmt.Sprintf("%s-%d", base, i)
		}
		taken, err := s.animalRepo.ExistsByIdentificacaoTx(ctx, tx, cand)
		if err != nil {
			return "", err
		}
		if !taken {
			ident = cand
			found = true
			break
		}
	}
	if !found {
		return "", errors.New("nao foi possivel gerar identificacao unica para a cria")
	}
	return ident, nil
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// resolveStatusSaudeCriaViva define status_saude inicial do animal gerado (BR-PARTOS-008).
func resolveStatusSaudeCriaViva(c *models.Cria) string {
	if c.Condicao != models.CriaCondicaoVivo {
		return models.StatusSaudavel
	}
	if c.NaoSaudavel == nil || !*c.NaoSaudavel {
		return models.StatusSaudavel
	}
	if c.StatusSaudeInicial != nil {
		s := strings.TrimSpace(*c.StatusSaudeInicial)
		if models.IsValidStatusSaude(s) && s != models.StatusSaudavel {
			return s
		}
	}
	return models.StatusDoente
}

func clearCriaTransientAnimalFields(c *models.Cria) {
	c.AnimalIdentificacao = nil
	c.AnimalRaca = nil
}

// identificacaoMaeNoPadrao normaliza a identificação da matriz para o prefixo automático (VARCHAR(100) no animal).
func identificacaoMaeNoPadrao(ident string) string {
	ident = strings.TrimSpace(ident)
	if ident == "" {
		return "MAE"
	}
	ident = strings.ReplaceAll(ident, " ", "-")
	ident = strings.ReplaceAll(ident, "/", "-")
	ident = strings.ReplaceAll(ident, "\\", "-")
	for strings.Contains(ident, "--") {
		ident = strings.ReplaceAll(ident, "--", "-")
	}
	ident = strings.Trim(ident, "-")
	if ident == "" {
		return "MAE"
	}
	const maxRunes = 50
	r := []rune(ident)
	if len(r) > maxRunes {
		ident = string(r[:maxRunes])
	}
	return ident
}

func (s *CriaService) GetByID(ctx context.Context, id int64) (*models.Cria, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCriaNotFound
		}
		return nil, err
	}
	return c, nil
}

func (s *CriaService) GetByPartoID(ctx context.Context, partoID int64) ([]*models.Cria, error) {
	return s.repo.GetByPartoID(ctx, partoID)
}

func origemAnimalExplicitamenteComprado(a *models.Animal) bool {
	if a == nil || a.OrigemAquisicao == nil {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(*a.OrigemAquisicao), models.OrigemComprado)
}

// animalGeradoParaDesfazerComCria: animal ligado a uma cria VIVA do parto que pode ser removido ao excluir o parto
// (desfazer o nascimento). Não remove a matriz nem COMPRADO; mae_id ausente ainda permite remoção se não for comprado.
func animalGeradoParaDesfazerComCria(p *models.Parto, a *models.Animal, c *models.Cria) bool {
	if p == nil || a == nil || c == nil {
		return false
	}
	if c.Condicao != models.CriaCondicaoVivo {
		return false
	}
	if c.AnimalID == nil || *c.AnimalID != a.ID {
		return false
	}
	if a.ID == p.AnimalID {
		return false
	}
	if a.FazendaID != p.FazendaID {
		return false
	}
	if origemAnimalExplicitamenteComprado(a) {
		return false
	}
	// Mãe explícita diferente da matriz do parto → não apagar (evita apagar animal errado)
	if a.MaeID != nil && *a.MaeID != p.AnimalID {
		return false
	}
	return true
}

// DeleteAnimaisGeradosPorCriasDoPartoTx remove, na mesma transação, animais NASCIDO vinculados às crias do parto
// (desfazer o nascimento). Não remove a matriz nem animais de outra origem ou sem vínculo de mãe com o parto.
func (s *CriaService) DeleteAnimaisGeradosPorCriasDoPartoTx(ctx context.Context, tx pgx.Tx, p *models.Parto) error {
	crias, err := s.repo.GetByPartoIDTx(ctx, tx, p.ID)
	if err != nil {
		return err
	}
	seen := make(map[int64]struct{})
	for _, c := range crias {
		if c.AnimalID == nil {
			continue
		}
		aid := *c.AnimalID
		if aid == p.AnimalID {
			continue
		}
		if _, ok := seen[aid]; ok {
			continue
		}
		seen[aid] = struct{}{}
		animal, err := s.animalRepo.GetByIDTx(ctx, tx, aid)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			return err
		}
		if !animalGeradoParaDesfazerComCria(p, animal, c) {
			continue
		}
		if err := s.animalRepo.DeleteTx(ctx, tx, aid); err != nil {
			return fmt.Errorf("excluir animal %d gerado pelo parto: %w", aid, err)
		}
	}
	return nil
}

func (s *CriaService) Update(ctx context.Context, c *models.Cria) error {
	if c.ID <= 0 {
		return errors.New("id invalido")
	}
	_, err := s.repo.GetByID(ctx, c.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCriaNotFound
		}
		return err
	}
	return s.repo.Update(ctx, c)
}
