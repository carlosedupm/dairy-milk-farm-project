package models

import "time"

// CicloTimelineItem representa um evento na linha do tempo do animal.
type CicloTimelineItem struct {
	Tipo          string    `json:"tipo"`
	Data          time.Time `json:"data"`
	Titulo        string    `json:"titulo"`
	Detalhe       string    `json:"detalhe,omitempty"`
	RefID         int64     `json:"ref_id,omitempty"`
	CreatedBy     *int64    `json:"created_by,omitempty"`
	RegistradoPor string    `json:"registrado_por,omitempty"`
}

// ProximaAcao sugere o próximo passo operacional para o animal.
type ProximaAcao struct {
	Codigo   string `json:"codigo"`
	Label    string `json:"label"`
	HrefPath string `json:"href_path"`
}

const (
	AcaoRegistrarToque     = "REGISTRAR_TOQUE"
	AcaoRegistrarCobertura = "REGISTRAR_COBERTURA"
	AcaoRegistrarSecagem   = "REGISTRAR_SECAGEM"
	AcaoRegistrarParto     = "REGISTRAR_PARTO"
	AcaoRegistrarProducao  = "REGISTRAR_PRODUCAO"
)
