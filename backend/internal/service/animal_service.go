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

type AnimalService struct {
	repo        *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewAnimalService(repo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *AnimalService {
	return &AnimalService{repo: repo, fazendaRepo: fazendaRepo}
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

	// Definir status de saúde padrão se não fornecido
	if animal.StatusSaude == nil {
		defaultStatus := models.StatusSaudavel
		animal.StatusSaude = &defaultStatus
	}
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

	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *AnimalService) Update(ctx context.Context, animal *models.Animal) error {
	// Validações básicas
	if animal.Identificacao == "" {
		return errors.New("identificação é obrigatória")
	}
	if animal.FazendaID <= 0 {
		return errors.New("fazenda_id é obrigatório")
	}

	// Verificar se o animal existe
	_, err := s.repo.GetByID(ctx, animal.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
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

	return s.repo.Update(ctx, animal)
}

func (s *AnimalService) Delete(ctx context.Context, id int64) error {
	// Verificar se existe
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
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
	list, err := s.repo.SearchByIdentificacao(ctx, identificacao)
	if err != nil {
		return nil, err
	}
	if len(list) > 0 {
		return list, nil
	}
	// Nenhum resultado: tentar equivalente número ↔ por extenso (ex.: "1" ↔ "um")
	equiv := equivalenteIdentificacao(identificacao)
	if equiv != "" {
		list, err = s.repo.SearchByIdentificacao(ctx, equiv)
		if err != nil {
			return nil, err
		}
	}
	return list, nil
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
