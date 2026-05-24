package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

const (
	CodeCoberturaTipoInvalido         = "TIPO_INVALIDO"
	CodeCoberturaFemeaObrigatoria    = "FEMEA_OBRIGATORIA"
	CodeCoberturaReprodutorObrigatorio = "REPRODUTOR_OBRIGATORIO"
	CodeCoberturaReprodutorInvalido   = "REPRODUTOR_INVALIDO"
)

type IntegracaoCoberturaLoteService struct {
	animalSvc    *AnimalService
	coberturaSvc *CoberturaService
	allowedFarms map[int64]struct{}
	actorUserID  int64
}

func NewIntegracaoCoberturaLoteService(animalSvc *AnimalService, coberturaSvc *CoberturaService, fazendaIDs []int64, actorUserID int64) *IntegracaoCoberturaLoteService {
	m := make(map[int64]struct{}, len(fazendaIDs))
	for _, id := range fazendaIDs {
		m[id] = struct{}{}
	}
	return &IntegracaoCoberturaLoteService{
		animalSvc:    animalSvc,
		coberturaSvc: coberturaSvc,
		allowedFarms: m,
		actorUserID:  actorUserID,
	}
}

func (s *IntegracaoCoberturaLoteService) Process(ctx context.Context, fazendaID int64, itens []models.CoberturaLoteItem) (*models.CoberturaLoteResultado, error) {
	if _, ok := s.allowedFarms[fazendaID]; !ok {
		return nil, errors.New("fazenda nao autorizada para este cliente")
	}
	res := &models.CoberturaLoteResultado{
		Total:             len(itens),
		Falhas:            []models.CoberturaLoteFalha{},
		CoberturasCriadas: []*models.Cobertura{},
	}
	for i, item := range itens {
		linha := i + 1
		cob, fail := s.processOne(ctx, fazendaID, linha, item)
		if fail != nil {
			res.Falhas = append(res.Falhas, *fail)
			continue
		}
		res.Sucesso++
		res.CoberturasCriadas = append(res.CoberturasCriadas, cob)
	}
	return res, nil
}

func mapCoberturaErrorToCode(err error) string {
	switch {
	case errors.Is(err, ErrCoberturaTipoInvalido):
		return CodeCoberturaTipoInvalido
	case errors.Is(err, ErrCoberturaApenasFemea):
		return CodeCoberturaFemeaObrigatoria
	case errors.Is(err, ErrCoberturaReprodutorObrigatorio):
		return CodeCoberturaReprodutorObrigatorio
	case errors.Is(err, ErrCoberturaReprodutorNaoEncontrado), errors.Is(err, ErrCoberturaReprodutorInvalido):
		return CodeCoberturaReprodutorInvalido
	case errors.Is(err, ErrAnimalNotFound):
		return CodeAnimalNaoEncontrado
	default:
		return CodeErroInterno
	}
}

func (s *IntegracaoCoberturaLoteService) processOne(ctx context.Context, fazendaID int64, linha int, item models.CoberturaLoteItem) (*models.Cobertura, *models.CoberturaLoteFalha) {
	ident := strings.TrimSpace(item.Identificacao)
	if ident == "" {
		return nil, &models.CoberturaLoteFalha{Linha: linha, Identificacao: ident, Code: CodeResultadoInvalido, Message: "identificacao obrigatoria"}
	}
	if strings.TrimSpace(item.Tipo) == "" {
		return nil, &models.CoberturaLoteFalha{Linha: linha, Identificacao: ident, Code: CodeCoberturaTipoInvalido, Message: "tipo obrigatorio"}
	}
	animais, err := s.animalSvc.SearchByIdentificacao(ctx, ident)
	if err != nil {
		return nil, &models.CoberturaLoteFalha{Linha: linha, Identificacao: ident, Code: CodeErroInterno, Message: err.Error()}
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
		return nil, &models.CoberturaLoteFalha{Linha: linha, Identificacao: ident, Code: CodeAnimalNaoEncontrado, Message: "animal nao encontrado na fazenda"}
	}
	if len(matched) > 1 {
		ids := make([]int64, len(matched))
		for j, a := range matched {
			ids[j] = a.ID
		}
		return nil, &models.CoberturaLoteFalha{
			Linha: linha, Identificacao: ident, Code: CodeAnimalAmbiguo,
			Message: "mais de um animal corresponde a identificacao", AnimalIDs: ids,
		}
	}
	t, err := time.Parse(time.RFC3339, item.Data)
	if err != nil {
		return nil, &models.CoberturaLoteFalha{Linha: linha, Identificacao: ident, Code: CodeDataInvalida, Message: "data invalida (use RFC3339)"}
	}
	cob := &models.Cobertura{
		AnimalID:      matched[0].ID,
		Tipo:          item.Tipo,
		Data:          t,
		FazendaID:     fazendaID,
		CioID:         item.CioID,
		TouroAnimalID: item.TouroAnimalID,
		TouroInfo:     item.TouroInfo,
		SemenPartida:  item.SemenPartida,
		Tecnico:       item.Tecnico,
		ProtocoloID:   item.ProtocoloID,
		Observacoes:   item.Observacoes,
	}
	if s.actorUserID > 0 {
		uid := s.actorUserID
		cob.CreatedBy = &uid
	}
	if err := s.coberturaSvc.Create(ctx, cob); err != nil {
		return nil, &models.CoberturaLoteFalha{
			Linha: linha, Identificacao: ident,
			Code: mapCoberturaErrorToCode(err), Message: err.Error(),
		}
	}
	return cob, nil
}
