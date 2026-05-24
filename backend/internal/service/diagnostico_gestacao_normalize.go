package service

import (
	"errors"
	"strings"

	"github.com/ceialmilk/api/internal/models"
)

var (
	ErrResultadoOuClassificacaoObrigatorio = errors.New("informe resultado ou classificacao_operacional")
	ErrClassificacaoOperacionalInvalida    = errors.New("classificacao_operacional invalida")
	ErrMetodoDiagnosticoInvalido           = errors.New("metodo invalido")
)

func NormalizeDiagnosticoGestacao(d *models.DiagnosticoGestacao) error {
	resultado := strings.ToUpper(strings.TrimSpace(d.Resultado))
	var classificacao *string

	if d.ClassificacaoOperacional != nil {
		norm := models.NormalizeClassificacaoOperacional(*d.ClassificacaoOperacional)
		if norm == "" {
			d.ClassificacaoOperacional = nil
		} else {
			if !models.IsValidClassificacaoOperacional(norm) {
				return ErrClassificacaoOperacionalInvalida
			}
			classificacao = &norm
			d.ClassificacaoOperacional = classificacao
		}
	}

	if resultado == "" && classificacao == nil {
		return ErrResultadoOuClassificacaoObrigatorio
	}

	if resultado == "" && classificacao != nil {
		resolved, ok := models.ResolveResultadoFromClassificacao(*classificacao)
		if !ok {
			return ErrClassificacaoOperacionalInvalida
		}
		resultado = resolved
	}

	if classificacao != nil {
		expected, ok := models.ResolveResultadoFromClassificacao(*classificacao)
		if !ok {
			return ErrClassificacaoOperacionalInvalida
		}
		if resultado != "" && resultado != expected {
			return models.ErrClassificacaoResultadoInconsistente
		}
		resultado = expected
	}

	validRes := false
	for _, r := range models.ValidResultadosDiagnostico() {
		if r == resultado {
			validRes = true
			break
		}
	}
	if !validRes {
		return errors.New("resultado invalido")
	}
	d.Resultado = resultado

	if d.Metodo != nil {
		m := strings.ToUpper(strings.TrimSpace(*d.Metodo))
		if m == "" {
			d.Metodo = nil
		} else {
			validMetodo := false
			for _, v := range models.ValidMetodosDiagnostico() {
				if v == m {
					validMetodo = true
					break
				}
			}
			if !validMetodo {
				return ErrMetodoDiagnosticoInvalido
			}
			d.Metodo = &m
		}
	}

	return nil
}
