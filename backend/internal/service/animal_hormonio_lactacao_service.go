package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var (
	ErrHormonioNotFound          = errors.New("aplicação de hormônio não encontrada")
	ErrHormonioProtocoloNotFound = errors.New("protocolo de hormônio não encontrado")
	ErrHormonioSemToquePrenhe    = errors.New("animal sem toque prenhe após início da lactação")
	ErrHormonioSemGestacaoAtiva  = errors.New("animal sem gestação confirmada ativa")
	ErrHormonioSemLactacaoAtiva  = errors.New("animal sem lactação ativa")
	ErrHormonioIntervaloMinimo   = errors.New("intervalo mínimo de 14 dias entre aplicações")
	ErrHormonioJanelaPreParto    = errors.New("aplicação não permitida na janela de 70 dias antes do parto")
	ErrHormonioProtocoloEncerrado = errors.New("protocolo de hormônio encerrado")
	ErrHormonioProdutoInvalido   = errors.New("produto de hormônio inválido")
	ErrHormonioMotivoInvalido    = errors.New("motivo de encerramento inválido")
)

type SaveHormonioLactacaoInput struct {
	Produto       string
	DataAplicacao time.Time
	Lote          *string
	Observacoes   *string
	CreatedBy     *int64
}

type EncerrarHormonioProtocoloInput struct {
	MotivoEncerramento string
	Observacoes        *string
	DataEncerramento   *time.Time
}

type hormonioLactacaoStore interface {
	ListAplicacoesByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalHormonioLactacaoAplicacao, error)
	GetAplicacaoByID(ctx context.Context, animalID, aplicacaoID int64) (*models.AnimalHormonioLactacaoAplicacao, error)
	GetProtocoloAtivoByLactacaoID(ctx context.Context, lactacaoID int64) (*models.AnimalHormonioLactacaoProtocolo, error)
	GetUltimoProtocoloByLactacaoID(ctx context.Context, lactacaoID int64) (*models.AnimalHormonioLactacaoProtocolo, error)
	GetProtocoloByID(ctx context.Context, animalID, protocoloID int64) (*models.AnimalHormonioLactacaoProtocolo, error)
	GetProtocoloAtivoOuUltimoByAnimalID(ctx context.Context, animalID int64) (*models.AnimalHormonioLactacaoProtocolo, error)
	GetUltimaAplicacaoByProtocoloID(ctx context.Context, protocoloID int64) (*models.AnimalHormonioLactacaoAplicacao, error)
	CreateProtocolo(ctx context.Context, row *models.AnimalHormonioLactacaoProtocolo) error
	CreateAplicacao(ctx context.Context, row *models.AnimalHormonioLactacaoAplicacao) error
	UpdateAplicacao(ctx context.Context, row *models.AnimalHormonioLactacaoAplicacao) error
	DeleteAplicacao(ctx context.Context, animalID, aplicacaoID int64) error
	EncerrarProtocolo(ctx context.Context, protocoloID int64, motivo string, dataEncerramento time.Time, observacoes *string) error
	ListPendentesByFazendaID(ctx context.Context, fazendaID int64, refDate time.Time) ([]*models.HormonioLactacaoPendente, error)
}

type hormonioAnimalStore interface {
	GetByID(ctx context.Context, id int64) (*models.Animal, error)
}

type hormonioLactacaoLookup interface {
	GetEmAndamentoByAnimalID(ctx context.Context, animalID int64) (*models.Lactacao, error)
}

type hormonioGestacaoStore interface {
	GetAtivaConfirmadaByAnimalID(ctx context.Context, animalID int64) (*models.Gestacao, error)
	GetByID(ctx context.Context, id int64) (*models.Gestacao, error)
}

type hormonioToqueStore interface {
	GetPrimeiroPositivoAposData(ctx context.Context, animalID int64, dataInicio time.Time) (*models.DiagnosticoGestacao, error)
	GetByID(ctx context.Context, id int64) (*models.DiagnosticoGestacao, error)
}

type hormonioSaudeStore interface {
	Create(ctx context.Context, row *models.AnimalSaude) error
}

type AnimalHormonioLactacaoService struct {
	repo         hormonioLactacaoStore
	animalRepo   hormonioAnimalStore
	lactacaoRepo hormonioLactacaoLookup
	gestacaoRepo hormonioGestacaoStore
	toqueRepo    hormonioToqueStore
	saudeRepo    hormonioSaudeStore
}

func NewAnimalHormonioLactacaoService(
	repo *repository.AnimalHormonioLactacaoRepository,
	animalRepo *repository.AnimalRepository,
	lactacaoRepo *repository.LactacaoRepository,
	gestacaoRepo *repository.GestacaoRepository,
	toqueRepo *repository.DiagnosticoGestacaoRepository,
	saudeRepo *repository.AnimalSaudeRepository,
) *AnimalHormonioLactacaoService {
	return &AnimalHormonioLactacaoService{
		repo:         repo,
		animalRepo:   animalRepo,
		lactacaoRepo: lactacaoRepo,
		gestacaoRepo: gestacaoRepo,
		toqueRepo:    toqueRepo,
		saudeRepo:    saudeRepo,
	}
}

func (s *AnimalHormonioLactacaoService) ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalHormonioLactacaoAplicacao, error) {
	if _, err := s.getAnimal(ctx, animalID); err != nil {
		return nil, err
	}
	list, err := s.repo.ListAplicacoesByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []*models.AnimalHormonioLactacaoAplicacao{}
	}
	return list, nil
}

func (s *AnimalHormonioLactacaoService) GetByID(ctx context.Context, animalID, aplicacaoID int64) (*models.AnimalHormonioLactacaoAplicacao, error) {
	if _, err := s.getAnimal(ctx, animalID); err != nil {
		return nil, err
	}
	row, err := s.repo.GetAplicacaoByID(ctx, animalID, aplicacaoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHormonioNotFound
		}
		return nil, err
	}
	return row, nil
}

func (s *AnimalHormonioLactacaoService) GetProtocolo(ctx context.Context, animalID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	if _, err := s.getAnimal(ctx, animalID); err != nil {
		return nil, err
	}
	protocolo, err := s.repo.GetProtocoloAtivoOuUltimoByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if protocolo == nil {
		return nil, nil
	}
	s.enrichProtocolo(ctx, protocolo)
	return protocolo, nil
}

func (s *AnimalHormonioLactacaoService) ListPendentes(ctx context.Context, fazendaID int64) ([]*models.HormonioLactacaoPendente, error) {
	return s.repo.ListPendentesByFazendaID(ctx, fazendaID, CivilToday())
}

func (s *AnimalHormonioLactacaoService) Create(ctx context.Context, animalID int64, in SaveHormonioLactacaoInput) (*models.AnimalHormonioLactacaoAplicacao, error) {
	animal, err := s.ensureAnimalAtivo(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if !models.IsValidHormonioProduto(in.Produto) {
		return nil, ErrHormonioProdutoInvalido
	}
	if err := ValidateDataNaoFutura(in.DataAplicacao); err != nil {
		return nil, err
	}
	if err := ValidateEventoAposReferenciaAnimal(animal, in.DataAplicacao); err != nil {
		return nil, err
	}

	ctxEleg, err := s.resolveElegibilidade(ctx, animalID, in.DataAplicacao)
	if err != nil {
		return nil, err
	}

	protocolo := ctxEleg.protocolo
	if protocolo != nil && protocolo.Status == models.HormonioProtocoloStatusEncerrado {
		return nil, ErrHormonioProtocoloEncerrado
	}

	var toqueRefID int64
	var numeroDose int

	if protocolo == nil {
		toque := ctxEleg.toqueRef
		if toque == nil {
			return nil, ErrHormonioSemToquePrenhe
		}
		if err := validateHormonioAplicacaoAposToque(in.DataAplicacao, toque.Data); err != nil {
			return nil, err
		}
		toqueRefID = toque.ID
		numeroDose = 1

		protocolo = &models.AnimalHormonioLactacaoProtocolo{
			AnimalID:          animalID,
			FazendaID:         animal.FazendaID,
			LactacaoID:        ctxEleg.lactacao.ID,
			GestacaoID:        ctxEleg.gestacao.ID,
			ToqueReferenciaID: toqueRefID,
			Produto:           in.Produto,
			Status:            models.HormonioProtocoloStatusAtivo,
			DataInicio:        TruncateToCivilDate(in.DataAplicacao),
			CreatedBy:         in.CreatedBy,
		}
		if err := s.repo.CreateProtocolo(ctx, protocolo); err != nil {
			return nil, err
		}
	} else {
		ultima, err := s.repo.GetUltimaAplicacaoByProtocoloID(ctx, protocolo.ID)
		if err != nil {
			return nil, err
		}
		if ultima != nil {
			minProxima := TruncateToCivilDate(ultima.DataAplicacao.AddDate(0, 0, 14))
			if TruncateToCivilDate(in.DataAplicacao).Before(minProxima) {
				return nil, ErrHormonioIntervaloMinimo
			}
			numeroDose = ultima.NumeroDose + 1
		} else {
			numeroDose = 1
		}
	}

	proxima := calcDataProximaAplicacao(in.DataAplicacao, ctxEleg.gestacao.DataPrevistaParto)
	aplicacao := &models.AnimalHormonioLactacaoAplicacao{
		ProtocoloID:          protocolo.ID,
		AnimalID:             animalID,
		FazendaID:            animal.FazendaID,
		Produto:              in.Produto,
		DataAplicacao:        TruncateToCivilDate(in.DataAplicacao),
		DataProximaAplicacao: proxima,
		NumeroDose:           numeroDose,
		Lote:                 in.Lote,
		Observacoes:          in.Observacoes,
		CreatedBy:            in.CreatedBy,
	}
	if err := s.repo.CreateAplicacao(ctx, aplicacao); err != nil {
		return nil, err
	}
	s.createCasoPreventivo(ctx, aplicacao)
	return aplicacao, nil
}

func (s *AnimalHormonioLactacaoService) Update(ctx context.Context, animalID, aplicacaoID int64, in SaveHormonioLactacaoInput) (*models.AnimalHormonioLactacaoAplicacao, error) {
	animal, err := s.ensureAnimalAtivo(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if !models.IsValidHormonioProduto(in.Produto) {
		return nil, ErrHormonioProdutoInvalido
	}
	existing, err := s.repo.GetAplicacaoByID(ctx, animalID, aplicacaoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHormonioNotFound
		}
		return nil, err
	}
	if err := ValidateDataNaoFutura(in.DataAplicacao); err != nil {
		return nil, err
	}
	if err := ValidateEventoAposReferenciaAnimal(animal, in.DataAplicacao); err != nil {
		return nil, err
	}

	ctxEleg, err := s.resolveElegibilidade(ctx, animalID, in.DataAplicacao)
	if err != nil {
		return nil, err
	}
	protocolo, err := s.repo.GetProtocoloByID(ctx, animalID, existing.ProtocoloID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHormonioProtocoloNotFound
		}
		return nil, err
	}
	if protocolo.Status == models.HormonioProtocoloStatusEncerrado {
		return nil, ErrHormonioProtocoloEncerrado
	}

	if existing.NumeroDose == 1 {
		toque, err := s.toqueRepo.GetByID(ctx, protocolo.ToqueReferenciaID)
		if err == nil && toque != nil {
			if err := validateHormonioAplicacaoAposToque(in.DataAplicacao, toque.Data); err != nil {
				return nil, err
			}
		}
	}

	ultima, err := s.repo.GetUltimaAplicacaoByProtocoloID(ctx, existing.ProtocoloID)
	if err != nil {
		return nil, err
	}
	if ultima != nil && ultima.ID != existing.ID {
		minProxima := TruncateToCivilDate(ultima.DataAplicacao.AddDate(0, 0, 14))
		if TruncateToCivilDate(in.DataAplicacao).Before(minProxima) && ultima.NumeroDose < existing.NumeroDose {
			return nil, ErrHormonioIntervaloMinimo
		}
	}

	existing.Produto = in.Produto
	existing.DataAplicacao = TruncateToCivilDate(in.DataAplicacao)
	existing.DataProximaAplicacao = calcDataProximaAplicacao(in.DataAplicacao, ctxEleg.gestacao.DataPrevistaParto)
	existing.Lote = in.Lote
	existing.Observacoes = in.Observacoes

	if err := s.repo.UpdateAplicacao(ctx, existing); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHormonioNotFound
		}
		return nil, err
	}
	return existing, nil
}

func (s *AnimalHormonioLactacaoService) Delete(ctx context.Context, animalID, aplicacaoID int64) error {
	if _, err := s.ensureAnimalAtivo(ctx, animalID); err != nil {
		return err
	}
	if err := s.repo.DeleteAplicacao(ctx, animalID, aplicacaoID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrHormonioNotFound
		}
		return err
	}
	return nil
}

func (s *AnimalHormonioLactacaoService) EncerrarProtocolo(ctx context.Context, animalID int64, in EncerrarHormonioProtocoloInput) (*models.AnimalHormonioLactacaoProtocolo, error) {
	if _, err := s.ensureAnimalAtivo(ctx, animalID); err != nil {
		return nil, err
	}
	if !models.IsValidHormonioMotivoEncerramentoManual(in.MotivoEncerramento) {
		return nil, ErrHormonioMotivoInvalido
	}
	lactacao, err := s.lactacaoRepo.GetEmAndamentoByAnimalID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHormonioSemLactacaoAtiva
		}
		return nil, err
	}
	if lactacao == nil {
		return nil, ErrHormonioSemLactacaoAtiva
	}
	protocolo, err := s.repo.GetProtocoloAtivoByLactacaoID(ctx, lactacao.ID)
	if err != nil {
		return nil, err
	}
	if protocolo == nil {
		return nil, ErrHormonioProtocoloNotFound
	}
	dataEnc := CivilToday()
	if in.DataEncerramento != nil {
		dataEnc = TruncateToCivilDate(*in.DataEncerramento)
	}
	if err := s.repo.EncerrarProtocolo(ctx, protocolo.ID, in.MotivoEncerramento, dataEnc, in.Observacoes); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHormonioProtocoloNotFound
		}
		return nil, err
	}
	protocolo.Status = models.HormonioProtocoloStatusEncerrado
	motivo := in.MotivoEncerramento
	protocolo.MotivoEncerramento = &motivo
	protocolo.DataEncerramento = &dataEnc
	protocolo.ObservacoesEncerramento = in.Observacoes
	s.enrichProtocolo(ctx, protocolo)
	return protocolo, nil
}

type hormonioElegibilidade struct {
	lactacao  *models.Lactacao
	gestacao  *models.Gestacao
	toqueRef  *models.DiagnosticoGestacao
	protocolo *models.AnimalHormonioLactacaoProtocolo
}

func (s *AnimalHormonioLactacaoService) resolveElegibilidade(ctx context.Context, animalID int64, dataAplicacao time.Time) (*hormonioElegibilidade, error) {
	lactacao, err := s.lactacaoRepo.GetEmAndamentoByAnimalID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHormonioSemLactacaoAtiva
		}
		return nil, err
	}
	if lactacao == nil {
		return nil, ErrHormonioSemLactacaoAtiva
	}
	if err := validateHormonioAplicacaoAposInicioLactacao(dataAplicacao, lactacao.DataInicio); err != nil {
		return nil, err
	}

	gestacao, err := s.gestacaoRepo.GetAtivaConfirmadaByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if gestacao == nil || gestacao.DataPrevistaParto == nil {
		return nil, ErrHormonioSemGestacaoAtiva
	}

	if err := validateHormonioJanelaPreParto(dataAplicacao, gestacao.DataPrevistaParto); err != nil {
		return nil, err
	}

	protocolo, err := s.repo.GetProtocoloAtivoByLactacaoID(ctx, lactacao.ID)
	if err != nil {
		return nil, err
	}
	if protocolo == nil {
		ultimo, err := s.repo.GetUltimoProtocoloByLactacaoID(ctx, lactacao.ID)
		if err != nil {
			return nil, err
		}
		if ultimo != nil && ultimo.Status == models.HormonioProtocoloStatusEncerrado {
			return nil, ErrHormonioProtocoloEncerrado
		}
	}

	var toque *models.DiagnosticoGestacao
	if protocolo == nil {
		toque, err = s.toqueRepo.GetPrimeiroPositivoAposData(ctx, animalID, lactacao.DataInicio)
		if err != nil {
			return nil, err
		}
	}

	return &hormonioElegibilidade{
		lactacao:  lactacao,
		gestacao:  gestacao,
		toqueRef:  toque,
		protocolo: protocolo,
	}, nil
}

func (s *AnimalHormonioLactacaoService) enrichProtocolo(ctx context.Context, protocolo *models.AnimalHormonioLactacaoProtocolo) {
	gestacao, err := s.gestacaoRepo.GetByID(ctx, protocolo.GestacaoID)
	if err != nil || gestacao == nil || gestacao.DataPrevistaParto == nil {
		return
	}
	protocolo.DataPrevistaParto = gestacao.DataPrevistaParto
	teto := calcTeto70Dias(*gestacao.DataPrevistaParto)
	hoje := CivilToday()
	dias := int(teto.Sub(hoje).Hours() / 24)
	if dias < 0 {
		dias = 0
	}
	protocolo.DiasAteTeto70 = &dias
}

func (s *AnimalHormonioLactacaoService) getAnimal(ctx context.Context, animalID int64) (*models.Animal, error) {
	animal, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	return animal, nil
}

func (s *AnimalHormonioLactacaoService) ensureAnimalAtivo(ctx context.Context, animalID int64) (*models.Animal, error) {
	animal, err := s.getAnimal(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if err := EnsureAnimalNoRebanho(animal); err != nil {
		return nil, err
	}
	return animal, nil
}

func (s *AnimalHormonioLactacaoService) createCasoPreventivo(ctx context.Context, aplicacao *models.AnimalHormonioLactacaoAplicacao) {
	if s.saudeRepo == nil {
		return
	}
	obs := fmt.Sprintf("Hormônio lactação %s — dose %d", models.LabelHormonioProduto(aplicacao.Produto), aplicacao.NumeroDose)
	caso := &models.AnimalSaude{
		AnimalID:                    aplicacao.AnimalID,
		TipoCaso:                    models.AnimalSaudeTipoPreventivo,
		DataInicio:                  aplicacao.DataAplicacao,
		DataFim:                     &aplicacao.DataAplicacao,
		Status:                      models.AnimalSaudeStatusConcluido,
		Observacoes:                 &obs,
		HormonioLactacaoAplicacaoID: &aplicacao.ID,
		CreatedBy:                   aplicacao.CreatedBy,
	}
	if err := s.saudeRepo.Create(ctx, caso); err != nil {
		slog.Warn("hormonio_lactacao: falha ao criar caso PREVENTIVO (BR-HORM-011)",
			"animal_id", aplicacao.AnimalID,
			"aplicacao_id", aplicacao.ID,
			"error", err,
		)
	}
}

func validateHormonioAplicacaoAposInicioLactacao(dataAplicacao, lactacaoInicio time.Time) error {
	if civilBefore(dataAplicacao, lactacaoInicio) {
		return newIntegridade("TMP-003",
			"A data da aplicação não pode ser anterior ao início da lactação ativa (BR-HORM-003).")
	}
	return nil
}

func validateHormonioAplicacaoAposToque(dataAplicacao, toqueData time.Time) error {
	if civilBefore(dataAplicacao, toqueData) {
		return newIntegridade("TMP-003",
			"A data da aplicação não pode ser anterior ao 1º toque prenhe da lactação (BR-HORM-004).")
	}
	return nil
}

func validateHormonioJanelaPreParto(dataAplicacao time.Time, dataPrevistaParto *time.Time) error {
	if dataPrevistaParto == nil {
		return ErrHormonioSemGestacaoAtiva
	}
	teto := calcTeto70Dias(*dataPrevistaParto)
	if civilAfter(dataAplicacao, teto) {
		return ErrHormonioJanelaPreParto
	}
	return nil
}

func calcTeto70Dias(dataPrevistaParto time.Time) time.Time {
	return TruncateToCivilDate(dataPrevistaParto.AddDate(0, 0, -70))
}

func calcDataProximaAplicacao(dataAplicacao time.Time, dataPrevistaParto *time.Time) *time.Time {
	if dataPrevistaParto == nil {
		return nil
	}
	proxima := TruncateToCivilDate(dataAplicacao.AddDate(0, 0, 14))
	teto := calcTeto70Dias(*dataPrevistaParto)
	if proxima.After(teto) {
		return nil
	}
	return &proxima
}
