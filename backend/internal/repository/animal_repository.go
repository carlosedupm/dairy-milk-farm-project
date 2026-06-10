package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnimalRepository struct {
	db *pgxpool.Pool
}

func NewAnimalRepository(db *pgxpool.Pool) *AnimalRepository {
	return &AnimalRepository{db: db}
}

const animalSelectColumns = `id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, observacao_saida, baixa_registrado_por, baixa_revertido_por, origem_aquisicao, created_by, created_at, updated_at`

// SQLNoRebanho filtra animais ainda no rebanho operacional (BR-BAIXA-002, BR-AUDIT-009).
const SQLNoRebanho = `(data_saida IS NULL OR data_saida > CURRENT_DATE)`

const sqlNoRebanho = SQLNoRebanho

// SQLNoRebanhoFor devolve o mesmo critério com prefixo de tabela/alias (ex.: "a").
func SQLNoRebanhoFor(alias string) string {
	if alias == "" {
		return SQLNoRebanho
	}
	return fmt.Sprintf("(%s.data_saida IS NULL OR %s.data_saida > CURRENT_DATE)", alias, alias)
}

func animalSelectWithPrefix(prefix string) string {
	if prefix == "" {
		return animalSelectColumns
	}
	parts := strings.Split(animalSelectColumns, ", ")
	for i, col := range parts {
		parts[i] = prefix + "." + col
	}
	return strings.Join(parts, ", ")
}

type animalRowScanner interface {
	Scan(dest ...any) error
}

func scanAnimal(a *models.Animal, s animalRowScanner) error {
	return s.Scan(
		&a.ID,
		&a.Identificacao,
		&a.Raca,
		&a.DataNascimento,
		&a.Sexo,
		&a.StatusSaude,
		&a.FazendaID,
		&a.Categoria,
		&a.StatusReprodutivo,
		&a.MaeID,
		&a.PaiInfo,
		&a.LoteID,
		&a.PesoNascimento,
		&a.DataEntrada,
		&a.DataSaida,
		&a.MotivoSaida,
		&a.ObservacaoSaida,
		&a.BaixaRegistradoPor,
		&a.BaixaRevertidoPor,
		&a.OrigemAquisicao,
		&a.CreatedBy,
		&a.CreatedAt,
		&a.UpdatedAt,
	)
}

func (r *AnimalRepository) Create(ctx context.Context, animal *models.Animal) error {
	query := `
		INSERT INTO animais (identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, observacao_saida, origem_aquisicao, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		animal.Identificacao,
		animal.Raca,
		animal.DataNascimento,
		animal.Sexo,
		animal.StatusSaude,
		animal.FazendaID,
		animal.Categoria,
		animal.StatusReprodutivo,
		animal.MaeID,
		animal.PaiInfo,
		animal.LoteID,
		animal.PesoNascimento,
		animal.DataEntrada,
		animal.DataSaida,
		animal.MotivoSaida,
		animal.ObservacaoSaida,
		animal.OrigemAquisicao,
		animal.CreatedBy,
	).Scan(&animal.ID, &animal.CreatedAt, &animal.UpdatedAt)

	return err
}

func (r *AnimalRepository) CreateTx(ctx context.Context, tx pgx.Tx, animal *models.Animal) error {
	query := `
		INSERT INTO animais (identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, observacao_saida, origem_aquisicao, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING id, created_at, updated_at
	`
	return tx.QueryRow(
		ctx,
		query,
		animal.Identificacao,
		animal.Raca,
		animal.DataNascimento,
		animal.Sexo,
		animal.StatusSaude,
		animal.FazendaID,
		animal.Categoria,
		animal.StatusReprodutivo,
		animal.MaeID,
		animal.PaiInfo,
		animal.LoteID,
		animal.PesoNascimento,
		animal.DataEntrada,
		animal.DataSaida,
		animal.MotivoSaida,
		animal.ObservacaoSaida,
		animal.OrigemAquisicao,
		animal.CreatedBy,
	).Scan(&animal.ID, &animal.CreatedAt, &animal.UpdatedAt)
}

func (r *AnimalRepository) GetByID(ctx context.Context, id int64) (*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE id = $1`, animalSelectColumns)

	var animal models.Animal
	err := scanAnimal(&animal, r.db.QueryRow(ctx, query, id))

	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}

	return &animal, err
}

func (r *AnimalRepository) GetByIDTx(ctx context.Context, tx pgx.Tx, id int64) (*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE id = $1`, animalSelectColumns)
	var animal models.Animal
	err := scanAnimal(&animal, tx.QueryRow(ctx, query, id))
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &animal, err
}

func (r *AnimalRepository) GetAll(ctx context.Context) ([]*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais ORDER BY created_at DESC`, animalSelectColumns)
	return r.queryList(ctx, query)
}

func (r *AnimalRepository) GetByFazendaID(ctx context.Context, fazendaID int64, somenteNoRebanho bool) ([]*models.Animal, error) {
	where := "fazenda_id = $1"
	if somenteNoRebanho {
		where += " AND " + sqlNoRebanho
	}
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE %s ORDER BY created_at DESC`, animalSelectColumns, where)
	return r.queryList(ctx, query, fazendaID)
}

// CountEmLactacaoByFazendaID conta animais com lactação ativa na fazenda.
func (r *AnimalRepository) CountEmLactacaoByFazendaID(ctx context.Context, fazendaID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM animais a
		WHERE a.fazenda_id = $1
		AND `+sqlNoRebanho+`
		AND EXISTS (
			SELECT 1 FROM lactacoes l
			WHERE l.animal_id = a.id
			AND l.fazenda_id = a.fazenda_id
			AND l.data_fim IS NULL
			AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
		)
	`, fazendaID).Scan(&n)
	return n, err
}

const sqlLactacaoAtivaExists = `
		EXISTS (
			SELECT 1 FROM lactacoes l
			WHERE l.animal_id = a.id
			AND l.fazenda_id = a.fazenda_id
			AND l.data_fim IS NULL
			AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
		)`

// ListEmLactacaoByFazendaID retorna animais com lactação em andamento (data_fim nula e status EM_ANDAMENTO ou nulo).
func (r *AnimalRepository) ListEmLactacaoByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM animais a
		WHERE a.fazenda_id = $1
		AND `+sqlNoRebanho+`
		AND `+sqlLactacaoAtivaExists+`
		ORDER BY a.identificacao ASC
	`, animalSelectWithPrefix("a"))
	return r.queryList(ctx, query, fazendaID)
}

// SQLElegivelReproducao filtra fêmeas NOVILHA (≥12 meses) ou MATRIZ (BR-CICLO-016/017).
const SQLElegivelReproducao = `
		AND a.categoria IN ('NOVILHA', 'MATRIZ')
		AND (
			a.categoria = 'MATRIZ'
			OR (
				a.categoria = 'NOVILHA'
				AND a.data_nascimento IS NOT NULL
				AND a.data_nascimento <= CURRENT_DATE - interval '12 months'
			)
		)`

// ListParaCioByFazendaID retorna fêmeas elegíveis (NOVILHA ≥12m ou MATRIZ) no rebanho.
func (r *AnimalRepository) ListParaCioByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM animais a
		WHERE a.fazenda_id = $1
		AND a.sexo = $2
		AND `+sqlNoRebanho+`
		`+SQLElegivelReproducao+`
		ORDER BY a.identificacao ASC
	`, animalSelectWithPrefix("a"))
	return r.queryList(ctx, query, fazendaID, models.SexoFemea)
}

func (r *AnimalRepository) ListParaCoberturaByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM animais a
		WHERE a.fazenda_id = $1
		AND a.sexo = $2
		AND `+sqlNoRebanho+`
		`+SQLElegivelReproducao+`
		AND EXISTS (
			SELECT 1 FROM cios ci
			WHERE ci.animal_id = a.id AND ci.fazenda_id = a.fazenda_id
			AND NOT EXISTS (SELECT 1 FROM coberturas cb WHERE cb.cio_id = ci.id)
		)
		ORDER BY a.identificacao ASC
	`, animalSelectWithPrefix("a"))
	return r.queryList(ctx, query, fazendaID, models.SexoFemea)
}

// ListParaToqueByFazendaID retorna fêmeas com cobertura há diasMinimos+ dias sem diagnóstico de gestação.
func (r *AnimalRepository) ListParaToqueByFazendaID(ctx context.Context, fazendaID int64, diasMinimos int) ([]*models.Animal, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM animais a
		WHERE a.fazenda_id = $1
		AND a.sexo = $2
		AND `+sqlNoRebanho+`
		`+SQLElegivelReproducao+`
		AND EXISTS (
			SELECT 1 FROM coberturas cb
			WHERE cb.animal_id = a.id AND cb.fazenda_id = a.fazenda_id
			AND cb.data <= CURRENT_TIMESTAMP - ($3 * interval '1 day')
			AND NOT EXISTS (
				SELECT 1 FROM diagnosticos_gestacao dg WHERE dg.cobertura_id = cb.id
			)
		)
		ORDER BY a.identificacao ASC
	`, animalSelectWithPrefix("a"))
	return r.queryList(ctx, query, fazendaID, models.SexoFemea, diasMinimos)
}

// ListParaPartoByFazendaID retorna fêmeas com gestação confirmada sem parto registrado.
func (r *AnimalRepository) ListParaPartoByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM animais a
		WHERE a.fazenda_id = $1
		AND a.sexo = $2
		AND `+sqlNoRebanho+`
		`+SQLElegivelReproducao+`
		AND EXISTS (
			SELECT 1 FROM gestacoes g
			WHERE g.animal_id = a.id AND g.fazenda_id = a.fazenda_id
			AND g.status = $3
			AND NOT EXISTS (SELECT 1 FROM partos p WHERE p.gestacao_id = g.id)
		)
		ORDER BY a.identificacao ASC
	`, animalSelectWithPrefix("a"))
	return r.queryList(ctx, query, fazendaID, models.SexoFemea, models.GestacaoStatusConfirmada)
}

// ListParaAberturaLactacaoByFazendaID retorna fêmeas no rebanho sem lactação ativa.
func (r *AnimalRepository) ListParaAberturaLactacaoByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM animais a
		WHERE a.fazenda_id = $1
		AND a.sexo = $2
		AND `+sqlNoRebanho+`
		AND NOT `+strings.TrimSpace(sqlLactacaoAtivaExists)+`
		ORDER BY a.identificacao ASC
	`, animalSelectWithPrefix("a"))
	return r.queryList(ctx, query, fazendaID, models.SexoFemea)
}

func (r *AnimalRepository) GetByLoteID(ctx context.Context, loteID int64) ([]*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE lote_id = $1 ORDER BY identificacao ASC`, animalSelectColumns)
	return r.queryList(ctx, query, loteID)
}

func (r *AnimalRepository) GetByCategoria(ctx context.Context, fazendaID int64, categoria string) ([]*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE fazenda_id = $1 AND categoria = $2 ORDER BY created_at DESC`, animalSelectColumns)
	return r.queryList(ctx, query, fazendaID, categoria)
}

func (r *AnimalRepository) GetByStatusReprodutivo(ctx context.Context, fazendaID int64, status string) ([]*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE fazenda_id = $1 AND status_reprodutivo = $2 ORDER BY created_at DESC`, animalSelectColumns)
	return r.queryList(ctx, query, fazendaID, status)
}

func (r *AnimalRepository) Update(ctx context.Context, animal *models.Animal) error {
	if animal.ID <= 0 {
		return fmt.Errorf("id do animal inválido: %d", animal.ID)
	}
	query := `
		UPDATE animais
		SET identificacao = $1, raca = $2, data_nascimento = $3, sexo = $4, status_saude = $5, fazenda_id = $6, categoria = $7, status_reprodutivo = $8, mae_id = $9, pai_info = $10, lote_id = $11, peso_nascimento = $12, data_entrada = $13, data_saida = $14, motivo_saida = $15, observacao_saida = $16, origem_aquisicao = $17, updated_at = $18
		WHERE id = $19
	`

	cmd, err := r.db.Exec(
		ctx,
		query,
		animal.Identificacao,
		animal.Raca,
		animal.DataNascimento,
		animal.Sexo,
		animal.StatusSaude,
		animal.FazendaID,
		animal.Categoria,
		animal.StatusReprodutivo,
		animal.MaeID,
		animal.PaiInfo,
		animal.LoteID,
		animal.PesoNascimento,
		animal.DataEntrada,
		animal.DataSaida,
		animal.MotivoSaida,
		animal.ObservacaoSaida,
		animal.OrigemAquisicao,
		time.Now(),
		animal.ID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada (id não encontrado ou sem alteração)")
	}
	return nil
}

func (r *AnimalRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM animais WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *AnimalRepository) DeleteTx(ctx context.Context, tx pgx.Tx, id int64) error {
	query := `DELETE FROM animais WHERE id = $1`
	_, err := tx.Exec(ctx, query, id)
	return err
}

func (r *AnimalRepository) SearchByIdentificacao(ctx context.Context, identificacao string) ([]*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE identificacao ILIKE '%%' || $1 || '%%' ORDER BY created_at DESC`, animalSelectColumns)
	return r.queryList(ctx, query, identificacao)
}

func (r *AnimalRepository) GetByStatusSaude(ctx context.Context, statusSaude string) ([]*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE status_saude = $1 ORDER BY created_at DESC`, animalSelectColumns)
	return r.queryList(ctx, query, statusSaude)
}

func (r *AnimalRepository) GetBySexo(ctx context.Context, sexo string) ([]*models.Animal, error) {
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE sexo = $1 ORDER BY created_at DESC`, animalSelectColumns)
	return r.queryList(ctx, query, sexo)
}

func (r *AnimalRepository) UpdateLoteID(ctx context.Context, animalID int64, loteID *int64) error {
	query := `UPDATE animais SET lote_id = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, loteID, time.Now(), animalID)
	return err
}

func (r *AnimalRepository) UpdateStatusReprodutivo(ctx context.Context, animalID int64, status *string) error {
	query := `UPDATE animais SET status_reprodutivo = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, status, time.Now(), animalID)
	return err
}

func (r *AnimalRepository) UpdateStatusSaude(ctx context.Context, animalID int64, status *string) error {
	query := `UPDATE animais SET status_saude = $1, updated_at = $2 WHERE id = $3`
	tag, err := r.db.Exec(ctx, query, status, time.Now(), animalID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *AnimalRepository) UpdateStatusReprodutivoTx(ctx context.Context, tx pgx.Tx, animalID int64, status *string) error {
	query := `UPDATE animais SET status_reprodutivo = $1, updated_at = $2 WHERE id = $3`
	_, err := tx.Exec(ctx, query, status, time.Now(), animalID)
	return err
}

func (r *AnimalRepository) UpdateCategoria(ctx context.Context, animalID int64, categoria *string) error {
	query := `UPDATE animais SET categoria = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, categoria, time.Now(), animalID)
	return err
}

func (r *AnimalRepository) UpdateCategoriaTx(ctx context.Context, tx pgx.Tx, animalID int64, categoria *string) error {
	query := `UPDATE animais SET categoria = $1, updated_at = $2 WHERE id = $3`
	_, err := tx.Exec(ctx, query, categoria, time.Now(), animalID)
	return err
}

// ListBezerrasParaReclassificarPorIdade retorna bezerras com data_nascimento preenchida
// e idade >= mesesIdadeMinima (em meses), elegíveis para reclassificação em novilha.
func (r *AnimalRepository) ListBezerrasParaReclassificarPorIdade(ctx context.Context, mesesIdadeMinima int) ([]*models.Animal, error) {
	limite := time.Now().AddDate(0, -mesesIdadeMinima, 0)
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE categoria = $1 AND data_nascimento IS NOT NULL AND data_nascimento <= $2 AND (data_saida IS NULL OR data_saida > CURRENT_DATE) ORDER BY id`, animalSelectColumns)
	return r.queryList(ctx, query, models.CategoriaBezerra, limite)
}

func (r *AnimalRepository) Count(ctx context.Context) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM animais`).Scan(&n)
	return n, err
}

func (r *AnimalRepository) CountByFazenda(ctx context.Context, fazendaID int64) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM animais WHERE fazenda_id = $1`, fazendaID).Scan(&n)
	return n, err
}

// AnimalListFilters critérios opcionais para listagem paginada (FazendaIDs não vazio).
type AnimalListFilters struct {
	FazendaIDs         []int64
	IdentificacaoTerms []string
	PrimaryTerm        string
	EquivalentTerm     string
	Categoria          *string
	Sexo               *string
	StatusSaude        *string
	LoteID             *int64
	StatusReprodutivo  *string
	SomenteNoRebanho   bool
	SomenteBaixados    bool
}

// ListAnimaisFilteredPaginated lista animais com filtros; total reflete o COUNT antes do LIMIT.
func (r *AnimalRepository) ListAnimaisFilteredPaginated(ctx context.Context, f AnimalListFilters, limit, offset int) ([]*models.Animal, int64, error) {
	if len(f.FazendaIDs) == 0 {
		return []*models.Animal{}, 0, nil
	}
	if limit <= 0 {
		limit = 25
	}
	if offset < 0 {
		offset = 0
	}

	whereSQL, args := buildAnimalListWhereClause(f)
	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM animais WHERE %s`, whereSQL)
	var total int64
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append([]interface{}{}, args...)
	var orderSQL string
	if strings.TrimSpace(f.PrimaryTerm) != "" {
		var orderArgs []interface{}
		orderSQL, orderArgs = BuildAnimalListIdentificacaoOrderByClause(f.PrimaryTerm, f.EquivalentTerm, len(args))
		listArgs = append(listArgs, orderArgs...)
	} else {
		orderSQL = "created_at DESC"
	}

	nPlace := len(listArgs) + 1
	listSQL := fmt.Sprintf(`
		SELECT %s
		FROM animais
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, animalSelectColumns, whereSQL, orderSQL, nPlace, nPlace+1)

	listArgs = append(listArgs, limit, offset)
	list, err := r.queryList(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// AnimalSearchFilters critérios para busca paginada por identificação.
type AnimalSearchFilters struct {
	FazendaIDs         []int64
	IdentificacaoTerms []string
	PrimaryTerm        string
	EquivalentTerm     string
	SomenteNoRebanho   bool
}

// SearchByIdentificacaoPaginated busca por identificação com COUNT + LIMIT/OFFSET.
func (r *AnimalRepository) SearchByIdentificacaoPaginated(ctx context.Context, f AnimalSearchFilters, limit, offset int) ([]*models.Animal, int64, error) {
	if len(f.FazendaIDs) == 0 {
		return []*models.Animal{}, 0, nil
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	whereSQL, args := buildAnimalSearchWhereClause(f)
	if whereSQL == "" {
		return []*models.Animal{}, 0, nil
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM animais WHERE %s`, whereSQL)
	var total int64
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	orderSQL, orderArgs := BuildAnimalSearchOrderByClause(f.PrimaryTerm, f.EquivalentTerm, len(args))
	listArgs := append(append([]interface{}{}, args...), orderArgs...)
	nPlace := len(listArgs) + 1
	listSQL := fmt.Sprintf(`
		SELECT %s
		FROM animais
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, animalSelectColumns, whereSQL, orderSQL, nPlace, nPlace+1)

	listArgs = append(listArgs, limit, offset)
	list, err := r.queryList(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func buildAnimalSearchWhereClause(f AnimalSearchFilters) (string, []interface{}) {
	var parts []string
	var args []interface{}

	if len(f.FazendaIDs) > 0 {
		parts = append(parts, fmt.Sprintf("fazenda_id = ANY($%d::bigint[])", len(args)+1))
		args = append(args, f.FazendaIDs)
	}

	identPart, identArgs := appendIdentificacaoTermsWhere(f.IdentificacaoTerms, len(args))
	if identPart == "" {
		return "", nil
	}
	parts = append(parts, identPart)
	args = append(args, identArgs...)

	if f.SomenteNoRebanho {
		parts = append(parts, sqlNoRebanho)
	}

	return strings.Join(parts, " AND "), args
}

func appendIdentificacaoTermsWhere(terms []string, argOffset int) (string, []interface{}) {
	var cleaned []string
	for _, t := range terms {
		if s := strings.TrimSpace(t); s != "" {
			cleaned = append(cleaned, s)
		}
	}
	if len(cleaned) == 0 {
		return "", nil
	}
	var args []interface{}
	if len(cleaned) == 1 {
		return fmt.Sprintf("identificacao ILIKE '%%' || $%d || '%%'", argOffset+1), []interface{}{cleaned[0]}
	}
	var ors []string
	for _, t := range cleaned {
		ors = append(ors, fmt.Sprintf("identificacao ILIKE '%%' || $%d || '%%'", argOffset+len(args)+1))
		args = append(args, t)
	}
	return "(" + strings.Join(ors, " OR ") + ")", args
}

func buildAnimalListWhereClause(f AnimalListFilters) (string, []interface{}) {
	var parts []string
	var args []interface{}

	parts = append(parts, fmt.Sprintf("fazenda_id = ANY($%d::bigint[])", len(args)+1))
	args = append(args, f.FazendaIDs)

	identPart, identArgs := appendIdentificacaoTermsWhere(f.IdentificacaoTerms, len(args))
	if identPart != "" {
		parts = append(parts, identPart)
		args = append(args, identArgs...)
	}

	if f.Categoria != nil && *f.Categoria != "" {
		parts = append(parts, fmt.Sprintf("categoria = $%d", len(args)+1))
		args = append(args, *f.Categoria)
	}
	if f.Sexo != nil && *f.Sexo != "" {
		parts = append(parts, fmt.Sprintf("sexo = $%d", len(args)+1))
		args = append(args, *f.Sexo)
	}
	if f.StatusSaude != nil && *f.StatusSaude != "" {
		parts = append(parts, fmt.Sprintf("status_saude = $%d", len(args)+1))
		args = append(args, *f.StatusSaude)
	}
	if f.LoteID != nil && *f.LoteID > 0 {
		parts = append(parts, fmt.Sprintf("lote_id = $%d", len(args)+1))
		args = append(args, *f.LoteID)
	}
	if f.StatusReprodutivo != nil && *f.StatusReprodutivo != "" {
		parts = append(parts, fmt.Sprintf("status_reprodutivo = $%d", len(args)+1))
		args = append(args, *f.StatusReprodutivo)
	}
	if f.SomenteBaixados {
		parts = append(parts, `(data_saida IS NOT NULL AND data_saida <= CURRENT_DATE)`)
	} else if f.SomenteNoRebanho {
		parts = append(parts, sqlNoRebanho)
	}

	return strings.Join(parts, " AND "), args
}

func (r *AnimalRepository) UpdateSaidaTx(ctx context.Context, tx pgx.Tx, animalID int64, dataSaida time.Time, motivo string, observacao *string, registradoPor int64) error {
	var regPor *int64
	if registradoPor > 0 {
		regPor = &registradoPor
	}
	query := `
		UPDATE animais
		SET data_saida = $1, motivo_saida = $2, observacao_saida = $3,
		    baixa_registrado_por = $4, baixa_revertido_por = NULL, updated_at = $5
		WHERE id = $6
	`
	cmd, err := tx.Exec(ctx, query, dataSaida, motivo, observacao, regPor, time.Now(), animalID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("animal nao encontrado")
	}
	return nil
}

func (r *AnimalRepository) ClearSaidaTx(ctx context.Context, tx pgx.Tx, animalID int64, revertidoPor int64) error {
	var revPor *int64
	if revertidoPor > 0 {
		revPor = &revertidoPor
	}
	query := `
		UPDATE animais
		SET data_saida = NULL, motivo_saida = NULL, observacao_saida = NULL,
		    baixa_registrado_por = NULL, baixa_revertido_por = $1, updated_at = $2
		WHERE id = $3
	`
	cmd, err := tx.Exec(ctx, query, revPor, time.Now(), animalID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("animal nao encontrado")
	}
	return nil
}

func (r *AnimalRepository) SearchByIdentificacaoNoRebanho(ctx context.Context, identificacao string, fazendaIDs []int64) ([]*models.Animal, error) {
	if len(fazendaIDs) == 0 {
		return []*models.Animal{}, nil
	}
	query := fmt.Sprintf(`SELECT %s FROM animais WHERE identificacao ILIKE '%%' || $1 || '%%' AND fazenda_id = ANY($2::bigint[]) AND %s ORDER BY created_at DESC`, animalSelectColumns, sqlNoRebanho)
	return r.queryList(ctx, query, identificacao, fazendaIDs)
}

func (r *AnimalRepository) ExistsByIdentificacao(ctx context.Context, identificacao string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM animais WHERE identificacao = $1)`, identificacao).Scan(&exists)
	return exists, err
}

func (r *AnimalRepository) ExistsByIdentificacaoTx(ctx context.Context, tx pgx.Tx, identificacao string) (bool, error) {
	var exists bool
	err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM animais WHERE identificacao = $1)`, identificacao).Scan(&exists)
	return exists, err
}

func (r *AnimalRepository) queryList(ctx context.Context, query string, args ...interface{}) ([]*models.Animal, error) {
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Animal
	for rows.Next() {
		var a models.Animal
		err := scanAnimal(&a, rows)
		if err != nil {
			return nil, err
		}
		aCopy := a
		list = append(list, &aCopy)
	}
	return list, rows.Err()
}
