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
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	SistemaAlertasEmail          = "sistema@interno.ceialmilk"
	diasTratamentoVencido        = 14
	diasPartoPrevistoJanela      = 14
	diasRestricaoLeiteAlerta      = 7
	diasGestacaoSemSecagemAlerta = 250
)

type GerarAlertasResultado struct {
	FazendasProcessadas int `json:"fazendas_processadas"`
	Criados             int `json:"criados"`
	IgnoradosDuplicata  int `json:"ignorados_duplicata"`
	ErrosRegra          int `json:"erros_regra"`
}

type AlertaGeracaoService struct {
	alertaRepo       *repository.AlertaRepository
	fazendaRepo      *repository.FazendaRepository
	animalSaudeRepo  *repository.AnimalSaudeRepository
	gestacaoRepo     *repository.GestacaoRepository
	restricaoRepo    *repository.RestricaoLeiteRepository
	cioRepo          *repository.CioRepository
	conformidadeSvc  *ConformidadeService
	estadoRepo       *repository.AlertasGeracaoEstadoRepository
	usuarioRepo      *repository.UsuarioRepository
	sistemaUserID    int64
	tz               *time.Location
}

func NewAlertaGeracaoService(
	alertaRepo *repository.AlertaRepository,
	fazendaRepo *repository.FazendaRepository,
	animalSaudeRepo *repository.AnimalSaudeRepository,
	gestacaoRepo *repository.GestacaoRepository,
	restricaoRepo *repository.RestricaoLeiteRepository,
	cioRepo *repository.CioRepository,
	conformidadeSvc *ConformidadeService,
	estadoRepo *repository.AlertasGeracaoEstadoRepository,
	usuarioRepo *repository.UsuarioRepository,
	tz *time.Location,
) (*AlertaGeracaoService, error) {
	if tz == nil {
		var err error
		tz, err = time.LoadLocation("America/Sao_Paulo")
		if err != nil {
			tz = time.UTC
		}
	}
	s := &AlertaGeracaoService{
		alertaRepo:      alertaRepo,
		fazendaRepo:     fazendaRepo,
		animalSaudeRepo: animalSaudeRepo,
		gestacaoRepo:    gestacaoRepo,
		restricaoRepo:   restricaoRepo,
		cioRepo:         cioRepo,
		conformidadeSvc: conformidadeSvc,
		estadoRepo:      estadoRepo,
		usuarioRepo:     usuarioRepo,
		tz:              tz,
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	u, err := usuarioRepo.GetByEmail(ctx, SistemaAlertasEmail)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("usuário sistema alertas não encontrado (migration 32)")
		}
		return nil, fmt.Errorf("resolver usuário sistema alertas: %w", err)
	}
	if u == nil {
		return nil, errors.New("usuário sistema alertas não encontrado (migration 32)")
	}
	s.sistemaUserID = u.ID
	return s, nil
}

func (s *AlertaGeracaoService) GerarAlertasDiarios(ctx context.Context, refDate time.Time) (GerarAlertasResultado, error) {
	refLocal := truncateToDateInTZ(refDate, s.tz)
	var total GerarAlertasResultado

	fazendas, err := s.fazendaRepo.GetAll(ctx)
	if err != nil {
		return total, err
	}

	for _, f := range fazendas {
		if f == nil {
			continue
		}
		total.FazendasProcessadas++
		criados, ignorados, erros := s.gerarPorFazenda(ctx, f.ID, refLocal)
		total.Criados += criados
		total.IgnoradosDuplicata += ignorados
		total.ErrosRegra += erros
	}
	return total, nil
}

func (s *AlertaGeracaoService) gerarPorFazenda(ctx context.Context, fazendaID int64, refDate time.Time) (criados, ignorados, erros int) {
	type regraFn func(context.Context, int64, time.Time) (int, int, error)
	regras := []regraFn{
		s.regraTratamentoVencido,
		s.regraPartoPrevisto,
		s.regraRestricaoLeiteAtiva,
		s.regraNaoConformidade,
		s.regraGestacaoSemSecagem,
		s.regraCioDetectado,
	}
	for _, fn := range regras {
		c, ig, err := fn(ctx, fazendaID, refDate)
		criados += c
		ignorados += ig
		if err != nil {
			erros++
			slog.Warn("alerta geracao: regra falhou",
				"fazenda_id", fazendaID,
				"error", err,
			)
		}
	}
	return criados, ignorados, erros
}

func (s *AlertaGeracaoService) regraTratamentoVencido(ctx context.Context, fazendaID int64, refDate time.Time) (int, int, error) {
	limite := refDate.AddDate(0, 0, -diasTratamentoVencido)
	itens, err := s.animalSaudeRepo.ListTratamentosSemFimVencidosByFazendaID(ctx, fazendaID, limite)
	if err != nil {
		return 0, 0, err
	}
	return s.criarAlertasAnimais(ctx, fazendaID, models.AlertaTipoTratamentoVencido, itens, func(ident string) string {
		return fmt.Sprintf("Tratamento vencido — Animal %s", ident)
	}, nil)
}

func (s *AlertaGeracaoService) regraPartoPrevisto(ctx context.Context, fazendaID int64, refDate time.Time) (int, int, error) {
	ate := refDate.AddDate(0, 0, diasPartoPrevistoJanela)
	itens, err := s.gestacaoRepo.ListPartosPrevistosNaJanelaByFazendaID(ctx, fazendaID, refDate, ate)
	if err != nil {
		return 0, 0, err
	}
	var criados, ignorados int
	for _, item := range itens {
		titulo := fmt.Sprintf("Parto previsto — Animal %s", item.Identificacao)
		var dp *time.Time
		if item.DataPrevistaParto != nil {
			t := truncateToDateUTC(*item.DataPrevistaParto)
			dp = &t
		}
		c, ig, err := s.tryCreateAlerta(ctx, fazendaID, models.AlertaTipoPartoPrevisto, &item.AnimalID, titulo, nil, dp)
		if err != nil {
			return criados, ignorados, err
		}
		criados += c
		ignorados += ig
	}
	return criados, ignorados, nil
}

func (s *AlertaGeracaoService) regraRestricaoLeiteAtiva(ctx context.Context, fazendaID int64, refDate time.Time) (int, int, error) {
	limite := refDate.AddDate(0, 0, -diasRestricaoLeiteAlerta)
	itens, err := s.restricaoRepo.ListAtivasAguardandoAntigasByFazendaID(ctx, fazendaID, limite)
	if err != nil {
		return 0, 0, err
	}
	return s.criarAlertasAnimais(ctx, fazendaID, models.AlertaTipoRestricaoLeiteAtiva, itens, func(ident string) string {
		return fmt.Sprintf("Restrição de leite há 7+ dias — Animal %s", ident)
	}, nil)
}

func (s *AlertaGeracaoService) regraGestacaoSemSecagem(ctx context.Context, fazendaID int64, refDate time.Time) (int, int, error) {
	limite := refDate.AddDate(0, 0, -diasGestacaoSemSecagemAlerta)
	itens, err := s.gestacaoRepo.ListConfirmadasSemSecagemByFazendaID(ctx, fazendaID, limite)
	if err != nil {
		return 0, 0, err
	}
	return s.criarAlertasAnimais(ctx, fazendaID, models.AlertaTipoGestacaoSemSecagem, itens, func(ident string) string {
		return fmt.Sprintf("Gestação sem secagem — Animal %s", ident)
	}, nil)
}

func (s *AlertaGeracaoService) regraCioDetectado(ctx context.Context, fazendaID int64, refDate time.Time) (int, int, error) {
	itens, err := s.cioRepo.ListDetectadosNaDataByFazendaID(ctx, fazendaID, refDate)
	if err != nil {
		return 0, 0, err
	}
	return s.criarAlertasAnimais(ctx, fazendaID, models.AlertaTipoCioDetectado, itens, func(ident string) string {
		return fmt.Sprintf("Cio detectado — Animal %s", ident)
	}, nil)
}

func (s *AlertaGeracaoService) regraNaoConformidade(ctx context.Context, fazendaID int64, refDate time.Time) (int, int, error) {
	anomalias, err := s.conformidadeSvc.ListByFazenda(ctx, fazendaID)
	if err != nil {
		return 0, 0, err
	}

	estado, err := s.estadoRepo.Get(ctx, fazendaID)
	if err != nil {
		return 0, 0, err
	}
	anterior := map[string]struct{}{}
	if estado != nil {
		for _, k := range estado.ConformidadeChaves {
			anterior[k] = struct{}{}
		}
	}

	chavesAtuais := make([]string, 0, len(anomalias))
	for _, a := range anomalias {
		k := conformidadeChave(a.Codigo, a.AnimalID)
		chavesAtuais = append(chavesAtuais, k)
	}

	var criados, ignorados int
	for _, a := range anomalias {
		k := conformidadeChave(a.Codigo, a.AnimalID)
		if _, ok := anterior[k]; ok {
			continue
		}
		titulo := fmt.Sprintf("Não conformidade detectada — %s", a.Descricao)
		desc := fmt.Sprintf("%s (%s)", a.Descricao, a.Codigo)
		c, ig, err := s.tryCreateAlerta(ctx, fazendaID, models.AlertaTipoNaoConformidade, &a.AnimalID, titulo, &desc, nil)
		if err != nil {
			return criados, ignorados, err
		}
		criados += c
		ignorados += ig
	}

	if err := s.estadoRepo.Upsert(ctx, fazendaID, chavesAtuais, time.Now().UTC()); err != nil {
		return criados, ignorados, err
	}
	return criados, ignorados, nil
}

func conformidadeChave(codigo string, animalID int64) string {
	return fmt.Sprintf("%s:%d", codigo, animalID)
}

func (s *AlertaGeracaoService) criarAlertasAnimais(
	ctx context.Context,
	fazendaID int64,
	tipo string,
	itens []repository.AlertaAnimalIdentificacao,
	tituloFn func(ident string) string,
	dataPrevista *time.Time,
) (int, int, error) {
	var criados, ignorados int
	for _, item := range itens {
		animalID := item.AnimalID
		c, ig, err := s.tryCreateAlerta(ctx, fazendaID, tipo, &animalID, tituloFn(item.Identificacao), nil, dataPrevista)
		if err != nil {
			return criados, ignorados, err
		}
		criados += c
		ignorados += ig
	}
	return criados, ignorados, nil
}

func (s *AlertaGeracaoService) tryCreateAlerta(
	ctx context.Context,
	fazendaID int64,
	tipo string,
	animalID *int64,
	titulo string,
	descricao *string,
	dataPrevista *time.Time,
) (criados, ignorados int, err error) {
	if animalID == nil {
		return 0, 0, errors.New("animal_id obrigatório para alerta automático")
	}
	open, err := s.alertaRepo.ExistsOpenByFazendaTipoAnimal(ctx, fazendaID, tipo, *animalID)
	if err != nil {
		return 0, 0, err
	}
	if open {
		return 0, 1, nil
	}
	severidade, ok := models.SeveridadePadraoPorTipo(tipo)
	if !ok {
		return 0, 0, ErrAlertaTipoInvalido
	}
	row := &models.Alerta{
		FazendaID:    fazendaID,
		AnimalID:     animalID,
		Tipo:         tipo,
		Severidade:   severidade,
		Titulo:       titulo,
		Descricao:    descricao,
		DataPrevista: dataPrevista,
		Status:       models.AlertaStatusAberto,
		CreatedBy:    s.sistemaUserID,
	}
	if err := s.alertaRepo.Create(ctx, row); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return 0, 1, nil
		}
		return 0, 0, err
	}
	return 1, 0, nil
}

// ResolveOpenByAnimal resolve alertas abertos do tipo informado para o animal (resolução automática).
func (s *AlertaGeracaoService) ResolveOpenByAnimal(ctx context.Context, fazendaID, animalID int64, tipo string) error {
	return s.alertaRepo.ResolveOpenByFazendaTipoAnimal(ctx, fazendaID, tipo, animalID)
}

func truncateToDateInTZ(t time.Time, loc *time.Location) time.Time {
	local := t.In(loc)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, time.UTC)
}
