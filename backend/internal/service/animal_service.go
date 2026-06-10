package service

import (
	"context"
	"errors"
	"strings"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

// equivalência número ↔ por extenso (pt-BR) para busca de identificação (ex.: "1" encontra "um", "dois" encontra "2")
var numeroParaExtenso = map[string]string{
	"0": "zero", "1": "um", "2": "dois", "3": "três", "4": "quatro", "5": "cinco",
	"6": "seis", "7": "sete", "8": "oito", "9": "nove", "10": "dez",
	"11": "onze", "12": "doze", "13": "treze", "14": "catorze", "15": "quinze",
	"16": "dezesseis", "17": "dezessete", "18": "dezoito", "19": "dezenove", "20": "vinte",
}
var extensoParaNumero map[string]string

func init() {
	extensoParaNumero = make(map[string]string, len(numeroParaExtenso))
	for n, ext := range numeroParaExtenso {
		extensoParaNumero[strings.ToLower(ext)] = n
	}
}

var ErrAnimalNotFound = errors.New("animal não encontrado")
var ErrAnimalIdentificacaoDuplicada = errors.New("identificação já existe")
var ErrStatusSaudeDerivado = errors.New("status de saúde é derivado dos casos clínicos ativos: conclua ou cancele os casos na tab Saúde ou aguarde a sincronização")

type animalSaudeAtivosLister interface {
	ListAtivosByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalSaude, error)
}

type AnimalService struct {
	repo              *repository.AnimalRepository
	fazendaRepo       *repository.FazendaRepository
	gestacaoRepo      *repository.GestacaoRepository
	animalSaudeAtivos animalSaudeAtivosLister
}

func NewAnimalService(repo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository, gestacaoRepo *repository.GestacaoRepository, animalSaudeAtivos animalSaudeAtivosLister) *AnimalService {
	return &AnimalService{repo: repo, fazendaRepo: fazendaRepo, gestacaoRepo: gestacaoRepo, animalSaudeAtivos: animalSaudeAtivos}
}

func effectiveStatusSaude(s *string) string {
	if s == nil || strings.TrimSpace(*s) == "" {
		return models.StatusSaudavel
	}
	return strings.TrimSpace(*s)
}

func (s *AnimalService) validateStatusSaudeUpdate(ctx context.Context, existing, incoming *models.Animal) error {
	if s.animalSaudeAtivos == nil {
		return nil
	}
	oldStatus := effectiveStatusSaude(existing.StatusSaude)
	newStatus := effectiveStatusSaude(incoming.StatusSaude)
	if newStatus == oldStatus {
		return nil
	}
	ativos, err := s.animalSaudeAtivos.ListAtivosByAnimalID(ctx, incoming.ID)
	if err != nil {
		return err
	}
	if len(ativos) == 0 {
		return nil
	}
	if newStatus == deriveAnimalStatusSaudeFromCasosAtivos(ativos) {
		return nil
	}
	return ErrStatusSaudeDerivado
}

func (s *AnimalService) Create(ctx context.Context, animal *models.Animal) error {
	// Validações básicas
	if animal.Identificacao == "" {
		return errors.New("identificação é obrigatória")
	}
	if animal.FazendaID <= 0 {
		return errors.New("fazenda_id é obrigatório")
	}

	// Verificar se a fazenda existe
	_, err := s.fazendaRepo.GetByID(ctx, animal.FazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("fazenda não encontrada")
		}
		return err
	}

	// Verificar identificação única
	exists, err := s.repo.ExistsByIdentificacao(ctx, animal.Identificacao)
	if err != nil {
		return err
	}
	if exists {
		return ErrAnimalIdentificacaoDuplicada
	}

	// Validar sexo se fornecido
	if animal.Sexo != nil && *animal.Sexo != "" && !models.IsValidSexo(*animal.Sexo) {
		return errors.New("sexo inválido (deve ser 'M' ou 'F')")
	}

	// Definir origem de aquisição padrão se não fornecido
	if animal.OrigemAquisicao == nil || *animal.OrigemAquisicao == "" {
		o := models.OrigemNascido
		animal.OrigemAquisicao = &o
	}
	// Para animal nascido na propriedade, data de nascimento é obrigatória
	if *animal.OrigemAquisicao == models.OrigemNascido && animal.DataNascimento == nil {
		return errors.New("data de nascimento é obrigatória para animais nascidos na propriedade")
	}

	// Cadastro genérico: sempre SAUDAVEL (BR-SAUDE-013); ignora body
	defaultStatus := models.StatusSaudavel
	animal.StatusSaude = &defaultStatus
	// Validar categoria, status reprodutivo e motivo saída se fornecidos
	if animal.Categoria != nil && *animal.Categoria != "" && !models.IsValidCategoria(*animal.Categoria) {
		return errors.New("categoria inválida")
	}
	if animal.StatusReprodutivo != nil && *animal.StatusReprodutivo != "" && !models.IsValidStatusReprodutivo(*animal.StatusReprodutivo) {
		return errors.New("status reprodutivo inválido")
	}
	if animal.MotivoSaida != nil && *animal.MotivoSaida != "" && !models.IsValidMotivoSaida(*animal.MotivoSaida) {
		return errors.New("motivo de saída inválido")
	}

	if err := ValidateAnimalDatasCadastro(animal); err != nil {
		return err
	}

	return s.repo.Create(ctx, animal)
}

func (s *AnimalService) GetByID(ctx context.Context, id int64) (*models.Animal, error) {
	animal, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	return animal, nil
}

func (s *AnimalService) GetAll(ctx context.Context) ([]*models.Animal, error) {
	return s.repo.GetAll(ctx)
}

func (s *AnimalService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	// Verificar se a fazenda existe
	_, err := s.fazendaRepo.GetByID(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFazendaNotFound
		}
		return nil, err
	}

	return s.repo.GetByFazendaID(ctx, fazendaID, false)
}

func (s *AnimalService) GetByFazendaIDNoRebanho(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	_, err := s.fazendaRepo.GetByID(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFazendaNotFound
		}
		return nil, err
	}
	return s.repo.GetByFazendaID(ctx, fazendaID, true)
}

// DiasMinimosToque é o intervalo mínimo entre cobertura e diagnóstico de gestação (dias).
const DiasMinimosToque = 15

func (s *AnimalService) validateFazendaExists(ctx context.Context, fazendaID int64) error {
	_, err := s.fazendaRepo.GetByID(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}
	return nil
}

func (s *AnimalService) ListEmLactacaoByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	if err := s.validateFazendaExists(ctx, fazendaID); err != nil {
		return nil, err
	}
	return s.repo.ListEmLactacaoByFazendaID(ctx, fazendaID)
}

func (s *AnimalService) ListParaCoberturaByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	if err := s.validateFazendaExists(ctx, fazendaID); err != nil {
		return nil, err
	}
	return s.repo.ListParaCoberturaByFazendaID(ctx, fazendaID)
}

func (s *AnimalService) ListParaCioByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	if err := s.validateFazendaExists(ctx, fazendaID); err != nil {
		return nil, err
	}
	return s.repo.ListParaCioByFazendaID(ctx, fazendaID)
}

func (s *AnimalService) ListParaToqueByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	if err := s.validateFazendaExists(ctx, fazendaID); err != nil {
		return nil, err
	}
	return s.repo.ListParaToqueByFazendaID(ctx, fazendaID, DiasMinimosToque)
}

func (s *AnimalService) ListParaPartoByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	if err := s.validateFazendaExists(ctx, fazendaID); err != nil {
		return nil, err
	}
	return s.repo.ListParaPartoByFazendaID(ctx, fazendaID)
}

func (s *AnimalService) ListParaAberturaLactacaoByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	if err := s.validateFazendaExists(ctx, fazendaID); err != nil {
		return nil, err
	}
	return s.repo.ListParaAberturaLactacaoByFazendaID(ctx, fazendaID)
}

func (s *AnimalService) Update(ctx context.Context, animal *models.Animal) error {
	// Validações básicas
	if animal.Identificacao == "" {
		return errors.New("identificação é obrigatória")
	}
	if animal.FazendaID <= 0 {
		return errors.New("fazenda_id é obrigatório")
	}

	// Verificar se o animal existe e está no rebanho (BR-BAIXA-011)
	existing, err := s.repo.GetByID(ctx, animal.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if err := EnsureAnimalNoRebanho(existing); err != nil {
		return err
	}

	// Verificar se a fazenda existe
	_, err = s.fazendaRepo.GetByID(ctx, animal.FazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("fazenda não encontrada")
		}
		return err
	}

	// Para animal nascido na propriedade, data de nascimento é obrigatória
	if animal.OrigemAquisicao != nil && *animal.OrigemAquisicao == models.OrigemNascido && animal.DataNascimento == nil {
		return errors.New("data de nascimento é obrigatória para animais nascidos na propriedade")
	}

	// Validar sexo se fornecido
	if animal.Sexo != nil && *animal.Sexo != "" && !models.IsValidSexo(*animal.Sexo) {
		return errors.New("sexo inválido (deve ser 'M' ou 'F')")
	}
	if animal.Categoria != nil && *animal.Categoria != "" && !models.IsValidCategoria(*animal.Categoria) {
		return errors.New("categoria inválida")
	}
	if animal.StatusReprodutivo != nil && *animal.StatusReprodutivo != "" && !models.IsValidStatusReprodutivo(*animal.StatusReprodutivo) {
		return errors.New("status reprodutivo inválido")
	}
	if animal.MotivoSaida != nil && *animal.MotivoSaida != "" && !models.IsValidMotivoSaida(*animal.MotivoSaida) {
		return errors.New("motivo de saída inválido")
	}

	if err := ValidateAnimalDatasCadastro(animal); err != nil {
		return err
	}
	if err := ValidateStatusReprodutivoPrenhe(ctx, s.gestacaoRepo, animal.FazendaID, animal.ID, animal.StatusReprodutivo); err != nil {
		return err
	}
	if err := s.validateStatusSaudeUpdate(ctx, existing, animal); err != nil {
		return err
	}

	return s.repo.Update(ctx, animal)
}

func (s *AnimalService) Delete(ctx context.Context, id int64) error {
	// Verificar se existe e está no rebanho (BR-BAIXA-011)
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if err := EnsureAnimalNoRebanho(existing); err != nil {
		return err
	}

	return s.repo.Delete(ctx, id)
}

// equivalenteIdentificacao retorna a forma alternativa (número ↔ por extenso) para busca; "" se não houver.
func equivalenteIdentificacao(ident string) string {
	ident = strings.TrimSpace(ident)
	if ident == "" {
		return ""
	}
	if eq, ok := numeroParaExtenso[ident]; ok {
		return eq
	}
	if eq, ok := extensoParaNumero[strings.ToLower(ident)]; ok {
		return eq
	}
	return ""
}

func (s *AnimalService) SearchByIdentificacao(ctx context.Context, identificacao string) ([]*models.Animal, error) {
	return s.SearchByIdentificacaoForFazendas(ctx, identificacao, nil, false)
}

func (s *AnimalService) SearchByIdentificacaoForFazendas(ctx context.Context, identificacao string, fazendaIDs []int64, noRebanho bool) ([]*models.Animal, error) {
	var list []*models.Animal
	var err error
	if noRebanho && len(fazendaIDs) > 0 {
		list, err = s.repo.SearchByIdentificacaoNoRebanho(ctx, identificacao, fazendaIDs)
	} else {
		list, err = s.repo.SearchByIdentificacao(ctx, identificacao)
	}
	if err != nil {
		return nil, err
	}
	if len(list) > 0 {
		return list, nil
	}
	// Nenhum resultado: tentar equivalente número ↔ por extenso (ex.: "1" ↔ "um")
	equiv := equivalenteIdentificacao(identificacao)
	if equiv != "" {
		if noRebanho && len(fazendaIDs) > 0 {
			list, err = s.repo.SearchByIdentificacaoNoRebanho(ctx, equiv, fazendaIDs)
		} else {
			list, err = s.repo.SearchByIdentificacao(ctx, equiv)
		}
		if err != nil {
			return nil, err
		}
	}
	return list, nil
}

// SearchByIdentificacaoPaginatedForFazendas busca paginada por identificação (termo + equivalente em OR).
func (s *AnimalService) SearchByIdentificacaoPaginatedForFazendas(ctx context.Context, identificacao string, fazendaIDs []int64, noRebanho bool, limit, offset int) ([]*models.Animal, int64, error) {
	if len(fazendaIDs) == 0 {
		return []*models.Animal{}, 0, nil
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var terms []string
	var primaryTerm, equivalentTerm string
	if t := strings.TrimSpace(identificacao); t != "" {
		primaryTerm = t
		terms = append(terms, t)
		if eq := equivalenteIdentificacao(t); eq != "" && !strings.EqualFold(eq, t) {
			equivalentTerm = eq
			terms = append(terms, eq)
		}
	}
	if len(terms) == 0 {
		return []*models.Animal{}, 0, nil
	}

	f := repository.AnimalSearchFilters{
		FazendaIDs:         fazendaIDs,
		IdentificacaoTerms: terms,
		PrimaryTerm:        primaryTerm,
		EquivalentTerm:     equivalentTerm,
		SomenteNoRebanho:   noRebanho,
	}
	return s.repo.SearchByIdentificacaoPaginated(ctx, f, limit, offset)
}

func (s *AnimalService) GetByStatusSaude(ctx context.Context, statusSaude string) ([]*models.Animal, error) {
	return s.repo.GetByStatusSaude(ctx, statusSaude)
}

func (s *AnimalService) GetBySexo(ctx context.Context, sexo string) ([]*models.Animal, error) {
	if !models.IsValidSexo(sexo) {
		return nil, errors.New("sexo inválido (deve ser 'M' ou 'F')")
	}
	return s.repo.GetBySexo(ctx, sexo)
}

func (s *AnimalService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *AnimalService) CountByFazenda(ctx context.Context, fazendaID int64) (int64, error) {
	return s.repo.CountByFazenda(ctx, fazendaID)
}

func (s *AnimalService) GetByLoteID(ctx context.Context, loteID int64) ([]*models.Animal, error) {
	return s.repo.GetByLoteID(ctx, loteID)
}

func (s *AnimalService) GetByCategoria(ctx context.Context, fazendaID int64, categoria string) ([]*models.Animal, error) {
	if categoria != "" && !models.IsValidCategoria(categoria) {
		return nil, errors.New("categoria inválida")
	}
	return s.repo.GetByCategoria(ctx, fazendaID, categoria)
}

func (s *AnimalService) GetByStatusReprodutivo(ctx context.Context, fazendaID int64, status string) ([]*models.Animal, error) {
	if status != "" && !models.IsValidStatusReprodutivo(status) {
		return nil, errors.New("status reprodutivo inválido")
	}
	return s.repo.GetByStatusReprodutivo(ctx, fazendaID, status)
}

// AnimalListQuery parâmetros de listagem paginada e filtros opcionais (strings vazias ignoradas).
type AnimalListQuery struct {
	Limit             int
	Offset            int
	Identificacao     string
	Categoria         string
	Sexo              string
	StatusSaude       string
	LoteID            int64 // 0 = sem filtro
	StatusReprodutivo string
	NoRebanho         bool // true = só animais no rebanho (default no handler)
	RebanhoFiltro     string // ativos | baixa | todos
}

// ListAnimaisPaginatedForFazendas lista animais restritos às fazendas informadas (já validadas no handler).
func (s *AnimalService) ListAnimaisPaginatedForFazendas(ctx context.Context, fazendaIDs []int64, q AnimalListQuery) ([]*models.Animal, int64, error) {
	if len(fazendaIDs) == 0 {
		return []*models.Animal{}, 0, nil
	}

	limit := q.Limit
	if limit <= 0 {
		limit = 25
	}
	offset := q.Offset
	if offset < 0 {
		offset = 0
	}

	var terms []string
	var primaryTerm, equivalentTerm string
	if t := strings.TrimSpace(q.Identificacao); t != "" {
		primaryTerm = t
		terms = append(terms, t)
		if eq := equivalenteIdentificacao(t); eq != "" && !strings.EqualFold(eq, t) {
			equivalentTerm = eq
			terms = append(terms, eq)
		}
	}

	f := repository.AnimalListFilters{
		FazendaIDs:         fazendaIDs,
		IdentificacaoTerms: terms,
		PrimaryTerm:        primaryTerm,
		EquivalentTerm:     equivalentTerm,
	}

	if q.Categoria != "" {
		if !models.IsValidCategoria(q.Categoria) {
			return nil, 0, errors.New("categoria inválida")
		}
		c := q.Categoria
		f.Categoria = &c
	}
	if q.Sexo != "" {
		if !models.IsValidSexo(q.Sexo) {
			return nil, 0, errors.New("sexo inválido (deve ser 'M' ou 'F')")
		}
		sx := q.Sexo
		f.Sexo = &sx
	}
	if q.StatusSaude != "" {
		if !models.IsValidStatusSaude(q.StatusSaude) {
			return nil, 0, errors.New("status de saúde inválido")
		}
		ss := q.StatusSaude
		f.StatusSaude = &ss
	}
	if q.LoteID > 0 {
		lid := q.LoteID
		f.LoteID = &lid
	}
	if q.StatusReprodutivo != "" {
		if !models.IsValidStatusReprodutivo(q.StatusReprodutivo) {
			return nil, 0, errors.New("status reprodutivo inválido")
		}
		sr := q.StatusReprodutivo
		f.StatusReprodutivo = &sr
	}
	switch q.RebanhoFiltro {
	case "baixa":
		f.SomenteBaixados = true
	case "todos":
		// sem filtro de saída
	default:
		if q.NoRebanho || q.RebanhoFiltro == "" || q.RebanhoFiltro == "ativos" {
			f.SomenteNoRebanho = true
		}
	}

	return s.repo.ListAnimaisFilteredPaginated(ctx, f, limit, offset)
}
