package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

const (
	CodeAnimalNaoEncontrado     = "ANIMAL_NAO_ENCONTRADO"
	CodeAnimalAmbiguo           = "ANIMAL_AMBIGUO"
	CodeToquePositivoSemCobertura = "TOQUE_POSITIVO_SEM_COBERTURA"
	CodeToqueGestacaoAtiva      = "TOQUE_POSITIVO_GESTACAO_ATIVA"
	CodeDataInvalida            = "DATA_INVALIDA"
	CodeResultadoInvalido       = "RESULTADO_INVALIDO"
	CodeErroInterno             = "ERRO_INTERNO"
)

type IntegracaoToqueLoteService struct {
	animalSvc    *AnimalService
	toqueSvc     *DiagnosticoGestacaoService
	allowedFarms map[int64]struct{}
	actorUserID  int64
}

func NewIntegracaoToqueLoteService(animalSvc *AnimalService, toqueSvc *DiagnosticoGestacaoService, fazendaIDs []int64, actorUserID int64) *IntegracaoToqueLoteService {
	m := make(map[int64]struct{}, len(fazendaIDs))
	for _, id := range fazendaIDs {
		m[id] = struct{}{}
	}
	return &IntegracaoToqueLoteService{
		animalSvc:    animalSvc,
		toqueSvc:     toqueSvc,
		allowedFarms: m,
		actorUserID:  actorUserID,
	}
}

func (s *IntegracaoToqueLoteService) Process(ctx context.Context, fazendaID int64, itens []models.ToqueLoteItem) (*models.ToqueLoteResultado, error) {
	if _, ok := s.allowedFarms[fazendaID]; !ok {
		return nil, errors.New("fazenda nao autorizada para este cliente")
	}
	res := &models.ToqueLoteResultado{
		Total:         len(itens),
		Falhas:        []models.ToqueLoteFalha{},
		ToquesCriados: []*models.DiagnosticoGestacao{},
	}
	for i, item := range itens {
		linha := i + 1
		d, fail := s.processOne(ctx, fazendaID, linha, item)
		if fail != nil {
			res.Falhas = append(res.Falhas, *fail)
			continue
		}
		res.Sucesso++
		res.ToquesCriados = append(res.ToquesCriados, d)
	}
	return res, nil
}

func (s *IntegracaoToqueLoteService) processOne(ctx context.Context, fazendaID int64, linha int, item models.ToqueLoteItem) (*models.DiagnosticoGestacao, *models.ToqueLoteFalha) {
	ident := strings.TrimSpace(item.Identificacao)
	if ident == "" {
		return nil, &models.ToqueLoteFalha{Linha: linha, Identificacao: ident, Code: CodeResultadoInvalido, Message: "identificacao obrigatoria"}
	}
	animais, err := s.animalSvc.SearchByIdentificacao(ctx, ident)
	if err != nil {
		return nil, &models.ToqueLoteFalha{Linha: linha, Identificacao: ident, Code: CodeErroInterno, Message: err.Error()}
	}
	var matched []*models.Animal
	for _, a := range animais {
		if _, ok := s.allowedFarms[a.FazendaID]; !ok {
			continue
		}
		if a.FazendaID != fazendaID {
			continue
		}
		matched = append(matched, a)
	}
	if len(matched) == 0 {
		return nil, &models.ToqueLoteFalha{Linha: linha, Identificacao: ident, Code: CodeAnimalNaoEncontrado, Message: "animal nao encontrado na fazenda"}
	}
	if len(matched) > 1 {
		ids := make([]int64, len(matched))
		for j, a := range matched {
			ids[j] = a.ID
		}
		return nil, &models.ToqueLoteFalha{
			Linha: linha, Identificacao: ident, Code: CodeAnimalAmbiguo,
			Message: "mais de um animal corresponde a identificacao", AnimalIDs: ids,
		}
	}
	t, err := time.Parse(time.RFC3339, item.Data)
	if err != nil {
		return nil, &models.ToqueLoteFalha{Linha: linha, Identificacao: ident, Code: CodeDataInvalida, Message: "data invalida (use RFC3339)"}
	}
	d := &models.DiagnosticoGestacao{
		AnimalID:    matched[0].ID,
		Data:        t,
		Resultado:   item.Resultado,
		FazendaID:   fazendaID,
		CoberturaID: item.CoberturaID,
		Veterinario: item.Veterinario,
		Observacoes: item.Observacoes,
	}
	if s.actorUserID > 0 {
		uid := s.actorUserID
		d.CreatedBy = &uid
	}
	if err := s.toqueSvc.Create(ctx, d); err != nil {
		code := CodeErroInterno
		msg := err.Error()
		switch {
		case errors.Is(err, ErrToquePositivoSemCobertura):
			code = CodeToquePositivoSemCobertura
		case errors.Is(err, ErrToquePositivoGestacaoAtiva):
			code = CodeToqueGestacaoAtiva
		case errors.Is(err, ErrAnimalNotFound):
			code = CodeAnimalNaoEncontrado
		}
		return nil, &models.ToqueLoteFalha{Linha: linha, Identificacao: ident, Code: code, Message: msg}
	}
	return d, nil
}
