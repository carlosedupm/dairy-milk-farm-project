package service

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

const maxTimelineItems = 50
const maxProducaoTimeline = 15

type timelineRepository interface {
	ListByAnimal(ctx context.Context, animalID int64, filter repository.TimelineFilterTipo, limit, offset int) ([]repository.TimelineRow, int64, error)
}

type AnimalCicloService struct {
	cioRepo         *repository.CioRepository
	coberturaRepo   *repository.CoberturaRepository
	diagnosticoRepo *repository.DiagnosticoGestacaoRepository
	gestacaoRepo    *repository.GestacaoRepository
	secagemRepo     *repository.SecagemRepository
	partoRepo       *repository.PartoRepository
	lactacaoRepo    *repository.LactacaoRepository
	producaoRepo    *repository.ProducaoRepository
	animalSaudeRepo *repository.AnimalSaudeRepository
	timelineRepo    timelineRepository
	usuarioRepo     *repository.UsuarioRepository
}

func NewAnimalCicloService(
	cioRepo *repository.CioRepository,
	coberturaRepo *repository.CoberturaRepository,
	diagnosticoRepo *repository.DiagnosticoGestacaoRepository,
	gestacaoRepo *repository.GestacaoRepository,
	secagemRepo *repository.SecagemRepository,
	partoRepo *repository.PartoRepository,
	lactacaoRepo *repository.LactacaoRepository,
	producaoRepo *repository.ProducaoRepository,
	animalSaudeRepo *repository.AnimalSaudeRepository,
	timelineRepo timelineRepository,
	usuarioRepo *repository.UsuarioRepository,
) *AnimalCicloService {
	return &AnimalCicloService{
		cioRepo:         cioRepo,
		coberturaRepo:   coberturaRepo,
		diagnosticoRepo: diagnosticoRepo,
		gestacaoRepo:    gestacaoRepo,
		secagemRepo:     secagemRepo,
		partoRepo:       partoRepo,
		lactacaoRepo:    lactacaoRepo,
		producaoRepo:    producaoRepo,
		animalSaudeRepo: animalSaudeRepo,
		timelineRepo:    timelineRepo,
		usuarioRepo:     usuarioRepo,
	}
}

// ListTimelinePaginated retorna eventos da ficha ordenados por data DESC (BR-CICLO-008).
func (s *AnimalCicloService) ListTimelinePaginated(
	ctx context.Context,
	animalID int64,
	filter repository.TimelineFilterTipo,
	limit, offset int,
) ([]models.CicloTimelineItem, int64, error) {
	if s.timelineRepo == nil {
		return nil, 0, fmt.Errorf("timeline repository indisponível")
	}
	rows, total, err := s.timelineRepo.ListByAnimal(ctx, animalID, filter, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	items := make([]models.CicloTimelineItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, models.CicloTimelineItem{
			Tipo:      row.Tipo,
			Data:      row.Data,
			Titulo:    row.Titulo,
			Detalhe:   row.Detalhe,
			RefID:     row.RefID,
			CreatedBy: row.CreatedBy,
		})
	}
	if err := s.enrichRegistradoPor(ctx, items); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *AnimalCicloService) GetLactacaoAtiva(ctx context.Context, animalID int64) (*models.Lactacao, error) {
	l, err := s.lactacaoRepo.GetEmAndamentoByAnimalID(ctx, animalID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return l, nil
}

func (s *AnimalCicloService) BuildTimeline(ctx context.Context, animalID int64) ([]models.CicloTimelineItem, error) {
	var items []models.CicloTimelineItem

	cios, err := s.cioRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, c := range cios {
		det := ""
		if c.MetodoDeteccao != nil {
			det = *c.MetodoDeteccao
		}
		items = append(items, models.CicloTimelineItem{
			Tipo: "CIO", Data: c.DataDetectado, Titulo: "Cio detectado", Detalhe: det, RefID: c.ID,
			CreatedBy: c.UsuarioID,
		})
	}

	cobs, err := s.coberturaRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, c := range cobs {
		items = append(items, models.CicloTimelineItem{
			Tipo: "COBERTURA", Data: c.Data, Titulo: fmt.Sprintf("Cobertura (%s)", c.Tipo), RefID: c.ID,
			CreatedBy: c.CreatedBy,
		})
	}

	diags, err := s.diagnosticoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, d := range diags {
		titulo := fmt.Sprintf("Toque %s", d.Resultado)
		if d.ClassificacaoOperacional != nil && *d.ClassificacaoOperacional != "" {
			titulo = fmt.Sprintf("Toque %s", formatClassificacaoOperacionalLabel(*d.ClassificacaoOperacional))
		}
		detalhe := formatToqueDetalhe(d)
		items = append(items, models.CicloTimelineItem{
			Tipo: "TOQUE", Data: d.Data, Titulo: titulo, Detalhe: detalhe, RefID: d.ID,
			CreatedBy: d.CreatedBy,
		})
	}

	gests, err := s.gestacaoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, g := range gests {
		titulo := fmt.Sprintf("Gestação %s", g.Status)
		items = append(items, models.CicloTimelineItem{
			Tipo: "GESTACAO", Data: g.DataConfirmacao, Titulo: titulo, RefID: g.ID,
			CreatedBy: g.CreatedBy,
		})
	}

	secs, err := s.secagemRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, sec := range secs {
		items = append(items, models.CicloTimelineItem{
			Tipo: "SECAGEM", Data: sec.DataSecagem, Titulo: "Secagem", RefID: sec.ID,
			CreatedBy: sec.CreatedBy,
		})
	}

	partos, err := s.partoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, p := range partos {
		items = append(items, models.CicloTimelineItem{
			Tipo: "PARTO", Data: p.Data, Titulo: fmt.Sprintf("Parto (%d cria(s))", p.NumeroCrias), RefID: p.ID,
			CreatedBy: p.CreatedBy,
		})
	}

	lacts, err := s.lactacaoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	for _, l := range lacts {
		d := l.DataInicio
		titulo := fmt.Sprintf("Lactação #%d iniciada", l.NumeroLactacao)
		if l.DataFim != nil {
			d = *l.DataFim
			titulo = fmt.Sprintf("Lactação #%d encerrada", l.NumeroLactacao)
		}
		items = append(items, models.CicloTimelineItem{
			Tipo: "LACTACAO", Data: d, Titulo: titulo, RefID: l.ID,
			CreatedBy: l.CreatedBy,
		})
	}

	prods, err := s.producaoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	n := 0
	for _, p := range prods {
		if n >= maxProducaoTimeline {
			break
		}
		items = append(items, models.CicloTimelineItem{
			Tipo:    "PRODUCAO",
			Data:    p.DataHora,
			Titulo:  "Produção de leite",
			Detalhe: fmt.Sprintf("%.1f L", p.Quantidade),
			RefID:   p.ID,
			CreatedBy: p.CreatedBy,
		})
		n++
	}

	if s.animalSaudeRepo != nil {
		casos, err := s.animalSaudeRepo.ListByAnimalID(ctx, animalID)
		if err != nil {
			return nil, err
		}
		items = appendCasosSaudeToTimeline(items, casos)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Data.After(items[j].Data)
	})
	if len(items) > maxTimelineItems {
		items = items[:maxTimelineItems]
	}
	if err := s.enrichRegistradoPor(ctx, items); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *AnimalCicloService) enrichRegistradoPor(ctx context.Context, items []models.CicloTimelineItem) error {
	if s.usuarioRepo == nil {
		return nil
	}
	seen := make(map[int64]struct{})
	var ids []int64
	for i := range items {
		if items[i].CreatedBy == nil || *items[i].CreatedBy <= 0 {
			continue
		}
		id := *items[i].CreatedBy
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil
	}
	names, err := s.usuarioRepo.GetNamesByIDs(ctx, ids)
	if err != nil {
		return err
	}
	for i := range items {
		if items[i].CreatedBy == nil {
			continue
		}
		if nome, ok := names[*items[i].CreatedBy]; ok && nome != "" {
			items[i].RegistradoPor = nome
		}
	}
	return nil
}

// PrependBaixaTimeline acrescenta o evento BAIXA no topo da timeline com auditoria (BR-AUDIT-008).
func (s *AnimalCicloService) PrependBaixaTimeline(ctx context.Context, animal *models.Animal, items []models.CicloTimelineItem) ([]models.CicloTimelineItem, error) {
	if animal == nil || !animal.IsForaDoRebanho() || animal.DataSaida == nil {
		return items, nil
	}
	detalhe := ""
	if animal.MotivoSaida != nil {
		detalhe = MotivoBaixaLabel(*animal.MotivoSaida)
	}
	baixaItem := models.CicloTimelineItem{
		Tipo:      "BAIXA",
		Data:      *animal.DataSaida,
		Titulo:    "Baixa do rebanho",
		Detalhe:   detalhe,
		CreatedBy: animal.BaixaRegistradoPor,
	}
	items = append([]models.CicloTimelineItem{baixaItem}, items...)
	if err := s.enrichRegistradoPor(ctx, items); err != nil {
		return nil, err
	}
	return items, nil
}

const maxProximasAcoes = 4

var proximaAcaoPriority = []string{
	models.AcaoRegistrarParto,
	models.AcaoRegistrarSecagem,
	models.AcaoRegistrarCobertura,
	models.AcaoRegistrarToque,
	models.AcaoRegistrarProducao,
}

func prioritizeProximasAcoes(acoes []models.ProximaAcao, max int) []models.ProximaAcao {
	if len(acoes) == 0 || max <= 0 {
		return nil
	}
	rank := make(map[string]int, len(proximaAcaoPriority))
	for i, codigo := range proximaAcaoPriority {
		rank[codigo] = i
	}
	sorted := make([]models.ProximaAcao, len(acoes))
	copy(sorted, acoes)
	sort.Slice(sorted, func(i, j int) bool {
		ri, okI := rank[sorted[i].Codigo]
		rj, okJ := rank[sorted[j].Codigo]
		if !okI {
			ri = len(proximaAcaoPriority)
		}
		if !okJ {
			rj = len(proximaAcaoPriority)
		}
		return ri < rj
	})
	if len(sorted) > max {
		sorted = sorted[:max]
	}
	return sorted
}

func buildProximasAcoesCandidates(
	animalID int64,
	lact *models.Lactacao,
	gest *models.Gestacao,
	pendenteToque bool,
	statusReprodutivo string,
	secagemPendente bool,
) []models.ProximaAcao {
	var acoes []models.ProximaAcao
	if lact != nil {
		acoes = append(acoes, models.ProximaAcao{
			Codigo:   models.AcaoRegistrarProducao,
			Label:    "Registrar produção",
			HrefPath: fmt.Sprintf("/producao/novo?animal_id=%d", animalID),
		})
	}
	if gest != nil {
		if secagemPendente {
			acoes = append(acoes, models.ProximaAcao{
				Codigo:   models.AcaoRegistrarSecagem,
				Label:    "Registrar secagem",
				HrefPath: fmt.Sprintf("/gestao/secagens/novo?animal_id=%d", animalID),
			})
		}
		acoes = append(acoes, models.ProximaAcao{
			Codigo:   models.AcaoRegistrarParto,
			Label:    "Registrar parto",
			HrefPath: fmt.Sprintf("/gestao/partos/novo?animal_id=%d&gestacao_id=%d", animalID, gest.ID),
		})
	}
	if pendenteToque && gest == nil {
		acoes = append(acoes, models.ProximaAcao{
			Codigo:   models.AcaoRegistrarToque,
			Label:    "Registrar toque",
			HrefPath: fmt.Sprintf("/gestao/toques/novo?animal_id=%d", animalID),
		})
	}
	if statusReprodutivo == "" ||
		statusReprodutivo == models.StatusReprodutivoVazia ||
		statusReprodutivo == models.StatusReprodutivoParida {
		if lact == nil && gest == nil {
			acoes = append(acoes, models.ProximaAcao{
				Codigo:   models.AcaoRegistrarCobertura,
				Label:    "Registrar cobertura",
				HrefPath: fmt.Sprintf("/gestao/coberturas/novo?animal_id=%d", animalID),
			})
		}
	}
	return prioritizeProximasAcoes(acoes, maxProximasAcoes)
}

func (s *AnimalCicloService) BuildProximasAcoes(ctx context.Context, animal *models.Animal) ([]models.ProximaAcao, error) {
	if animal.IsForaDoRebanho() {
		return nil, nil
	}
	if animal.Sexo != nil && *animal.Sexo != models.SexoFemea {
		return nil, nil
	}
	aid := animal.ID

	lact, err := s.GetLactacaoAtiva(ctx, aid)
	if err != nil {
		return nil, err
	}

	gest, err := s.gestacaoRepo.GetAtivaConfirmadaByAnimalID(ctx, aid)
	if err != nil {
		return nil, err
	}

	pendenteToque := false
	if gest == nil {
		pendenteToque, err = s.coberturaRepo.HasPendenteToqueByAnimalID(ctx, aid, animal.FazendaID, DiasMinimosToque)
		if err != nil {
			return nil, err
		}
	}

	st := ""
	if animal.StatusReprodutivo != nil {
		st = *animal.StatusReprodutivo
	}

	secagemPendente := false
	if gest != nil {
		secagemPendente, err = secagemPendenteForAnimal(ctx, s.secagemRepo, st, gest)
		if err != nil {
			return nil, err
		}
	}

	return buildProximasAcoesCandidates(aid, lact, gest, pendenteToque, st, secagemPendente), nil
}

func formatClassificacaoOperacionalLabel(classificacao string) string {
	switch classificacao {
	case models.ClassificacaoOperacionalVaziaPEV:
		return "VAZIA PEV"
	default:
		return classificacao
	}
}

func formatToqueDetalhe(d *models.DiagnosticoGestacao) string {
	if d.Observacoes != nil && *d.Observacoes != "" {
		return *d.Observacoes
	}
	if d.DiasGestacaoEstimados != nil && *d.DiasGestacaoEstimados > 0 {
		dias := *d.DiasGestacaoEstimados
		if dias >= 30 && dias%30 == 0 {
			meses := dias / 30
			return fmt.Sprintf("%d meses", meses)
		}
		return fmt.Sprintf("%d dias", dias)
	}
	return ""
}

func appendCasosSaudeToTimeline(items []models.CicloTimelineItem, casos []*models.AnimalSaude) []models.CicloTimelineItem {
	for _, c := range casos {
		if c == nil {
			continue
		}
		detalhe := truncateTimelineDetalhe(c.Observacoes)
		items = append(items, models.CicloTimelineItem{
			Tipo:      "SAUDE",
			Data:      c.DataInicio,
			Titulo:    formatSaudeTimelineTitulo(c.TipoCaso, c.Status),
			Detalhe:   detalhe,
			RefID:     c.ID,
			CreatedBy: c.CreatedBy,
		})
	}
	return items
}

func formatSaudeTimelineTitulo(tipoCaso, status string) string {
	return fmt.Sprintf("%s (%s)", animalSaudeTipoLabel(tipoCaso), animalSaudeStatusLabel(status))
}

func animalSaudeTipoLabel(tipo string) string {
	switch tipo {
	case models.AnimalSaudeTipoTratamento:
		return "Tratamento"
	case models.AnimalSaudeTipoPreventivo:
		return "Preventivo"
	case models.AnimalSaudeTipoCirurgia:
		return "Cirurgia"
	case models.AnimalSaudeTipoOutro:
		return "Outro"
	default:
		return tipo
	}
}

func animalSaudeStatusLabel(status string) string {
	switch status {
	case models.AnimalSaudeStatusAtivo:
		return "Ativo"
	case models.AnimalSaudeStatusConcluido:
		return "Concluído"
	case models.AnimalSaudeStatusCancelado:
		return "Cancelado"
	default:
		return status
	}
}

func truncateTimelineDetalhe(obs *string) string {
	if obs == nil {
		return ""
	}
	s := strings.TrimSpace(*obs)
	if s == "" {
		return ""
	}
	const maxLen = 120
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "…"
}
