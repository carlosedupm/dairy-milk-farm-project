package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
)

type fakeHormonioRepo struct {
	mu         sync.Mutex
	protocolos []*models.AnimalHormonioLactacaoProtocolo
	aplicacoes []*models.AnimalHormonioLactacaoAplicacao
	nextProtID int64
	nextAppID  int64
	pendentes  []*models.HormonioLactacaoPendente
}

func newFakeHormonioRepo() *fakeHormonioRepo {
	return &fakeHormonioRepo{}
}

func (f *fakeHormonioRepo) ListAplicacoesByAnimalID(_ context.Context, animalID int64) ([]*models.AnimalHormonioLactacaoAplicacao, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*models.AnimalHormonioLactacaoAplicacao
	for _, a := range f.aplicacoes {
		if a.AnimalID == animalID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (f *fakeHormonioRepo) GetAplicacaoByID(_ context.Context, animalID, aplicacaoID int64) (*models.AnimalHormonioLactacaoAplicacao, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, a := range f.aplicacoes {
		if a.AnimalID == animalID && a.ID == aplicacaoID {
			copyA := *a
			return &copyA, nil
		}
	}
	return nil, pgx.ErrNoRows
}

func (f *fakeHormonioRepo) GetProtocoloAtivoByLactacaoID(_ context.Context, lactacaoID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, p := range f.protocolos {
		if p.LactacaoID == lactacaoID && p.Status == models.HormonioProtocoloStatusAtivo {
			copyP := *p
			return &copyP, nil
		}
	}
	return nil, nil
}

func (f *fakeHormonioRepo) GetUltimoProtocoloByLactacaoID(_ context.Context, lactacaoID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var ultimo *models.AnimalHormonioLactacaoProtocolo
	for _, p := range f.protocolos {
		if p.LactacaoID == lactacaoID {
			if ultimo == nil || p.DataInicio.After(ultimo.DataInicio) {
				copyP := *p
				ultimo = &copyP
			}
		}
	}
	return ultimo, nil
}

func (f *fakeHormonioRepo) GetProtocoloByID(_ context.Context, animalID, protocoloID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, p := range f.protocolos {
		if p.AnimalID == animalID && p.ID == protocoloID {
			copyP := *p
			return &copyP, nil
		}
	}
	return nil, pgx.ErrNoRows
}

func (f *fakeHormonioRepo) GetProtocoloAtivoOuUltimoByAnimalID(_ context.Context, animalID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	return f.GetProtocoloAtivoByLactacaoID(context.Background(), 0)
}

func (f *fakeHormonioRepo) GetUltimaAplicacaoByProtocoloID(_ context.Context, protocoloID int64) (*models.AnimalHormonioLactacaoAplicacao, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var ultima *models.AnimalHormonioLactacaoAplicacao
	for _, a := range f.aplicacoes {
		if a.ProtocoloID == protocoloID {
			if ultima == nil || a.DataAplicacao.After(ultima.DataAplicacao) {
				copyA := *a
				ultima = &copyA
			}
		}
	}
	return ultima, nil
}

func (f *fakeHormonioRepo) CreateProtocolo(_ context.Context, row *models.AnimalHormonioLactacaoProtocolo) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextProtID++
	row.ID = f.nextProtID
	copyP := *row
	f.protocolos = append(f.protocolos, &copyP)
	return nil
}

func (f *fakeHormonioRepo) CreateAplicacao(_ context.Context, row *models.AnimalHormonioLactacaoAplicacao) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextAppID++
	row.ID = f.nextAppID
	copyA := *row
	f.aplicacoes = append(f.aplicacoes, &copyA)
	return nil
}

func (f *fakeHormonioRepo) UpdateAplicacao(_ context.Context, row *models.AnimalHormonioLactacaoAplicacao) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, a := range f.aplicacoes {
		if a.ID == row.ID {
			copyA := *row
			f.aplicacoes[i] = &copyA
			return nil
		}
	}
	return pgx.ErrNoRows
}

func (f *fakeHormonioRepo) DeleteAplicacao(_ context.Context, animalID, aplicacaoID int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, a := range f.aplicacoes {
		if a.AnimalID == animalID && a.ID == aplicacaoID {
			f.aplicacoes = append(f.aplicacoes[:i], f.aplicacoes[i+1:]...)
			return nil
		}
	}
	return pgx.ErrNoRows
}

func (f *fakeHormonioRepo) EncerrarProtocolo(_ context.Context, protocoloID int64, motivo string, dataEncerramento time.Time, observacoes *string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, p := range f.protocolos {
		if p.ID == protocoloID && p.Status == models.HormonioProtocoloStatusAtivo {
			p.Status = models.HormonioProtocoloStatusEncerrado
			p.MotivoEncerramento = &motivo
			p.DataEncerramento = &dataEncerramento
			p.ObservacoesEncerramento = observacoes
			return nil
		}
	}
	return pgx.ErrNoRows
}

func (f *fakeHormonioRepo) ListPendentesByFazendaID(_ context.Context, _ int64, _ time.Time) ([]*models.HormonioLactacaoPendente, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.pendentes, nil
}

type fakeHormonioLactacaoRepo struct {
	lactacao *models.Lactacao
}

func (f *fakeHormonioLactacaoRepo) GetEmAndamentoByAnimalID(_ context.Context, animalID int64) (*models.Lactacao, error) {
	if f.lactacao != nil && f.lactacao.AnimalID == animalID {
		copyL := *f.lactacao
		return &copyL, nil
	}
	return nil, nil
}

type fakeHormonioLactacaoRepoErrNoRows struct{}

func (f *fakeHormonioLactacaoRepoErrNoRows) GetEmAndamentoByAnimalID(_ context.Context, _ int64) (*models.Lactacao, error) {
	return nil, pgx.ErrNoRows
}

type fakeHormonioGestacaoRepo struct {
	gestacao *models.Gestacao
}

func (f *fakeHormonioGestacaoRepo) GetAtivaConfirmadaByAnimalID(_ context.Context, animalID int64) (*models.Gestacao, error) {
	if f.gestacao != nil && f.gestacao.AnimalID == animalID {
		copyG := *f.gestacao
		return &copyG, nil
	}
	return nil, nil
}

func (f *fakeHormonioGestacaoRepo) GetByID(_ context.Context, id int64) (*models.Gestacao, error) {
	if f.gestacao != nil && f.gestacao.ID == id {
		copyG := *f.gestacao
		return &copyG, nil
	}
	return nil, pgx.ErrNoRows
}

type fakeHormonioToqueRepo struct {
	primeiro *models.DiagnosticoGestacao
	byID     map[int64]*models.DiagnosticoGestacao
}

func (f *fakeHormonioToqueRepo) GetPrimeiroPositivoAposData(_ context.Context, _ int64, _ time.Time) (*models.DiagnosticoGestacao, error) {
	if f.primeiro == nil {
		return nil, nil
	}
	copyD := *f.primeiro
	return &copyD, nil
}

func (f *fakeHormonioToqueRepo) GetByID(_ context.Context, id int64) (*models.DiagnosticoGestacao, error) {
	if f.byID != nil {
		if d, ok := f.byID[id]; ok {
			copyD := *d
			return &copyD, nil
		}
	}
	return nil, pgx.ErrNoRows
}

func mustDate(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}

func newHormonioTestSvc(
	animalID int64,
	lactInicio string,
	partoPrevisto string,
	toqueData *string,
) (*AnimalHormonioLactacaoService, *fakeHormonioRepo, *fakeAnimalSaudeRepo) {
	const fazendaID int64 = 1
	hormonioFake := newFakeHormonioRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalAtivoNoRebanho(animalID, fazendaID),
	})
	saudeFake := newFakeAnimalSaudeRepo()

	lactacao := &models.Lactacao{
		ID:         1,
		AnimalID:   animalID,
		FazendaID:  fazendaID,
		DataInicio: mustDate(lactInicio),
	}
	parto := mustDate(partoPrevisto)
	gestacao := &models.Gestacao{
		ID:                1,
		AnimalID:          animalID,
		FazendaID:         fazendaID,
		Status:            models.GestacaoStatusConfirmada,
		DataPrevistaParto: &parto,
	}

	var toqueFake *fakeHormonioToqueRepo
	if toqueData != nil {
		toqueFake = &fakeHormonioToqueRepo{
			primeiro: &models.DiagnosticoGestacao{
				ID:       1,
				AnimalID: animalID,
				Data:     mustDate(*toqueData),
				Resultado: models.DiagnosticoResultadoPositivo,
			},
			byID: map[int64]*models.DiagnosticoGestacao{
				1: {
					ID:        1,
					AnimalID:  animalID,
					Data:      mustDate(*toqueData),
					Resultado: models.DiagnosticoResultadoPositivo,
				},
			},
		}
	} else {
		toqueFake = &fakeHormonioToqueRepo{}
	}

	svc := &AnimalHormonioLactacaoService{
		repo:         hormonioFake,
		animalRepo:   animalFake,
		lactacaoRepo: &fakeHormonioLactacaoRepo{lactacao: lactacao},
		gestacaoRepo: &fakeHormonioGestacaoRepo{gestacao: gestacao},
		toqueRepo:    toqueFake,
		saudeRepo:    saudeFake,
	}
	return svc, hormonioFake, saudeFake
}

func hormonioInput(data, produto string) SaveHormonioLactacaoInput {
	return SaveHormonioLactacaoInput{
		Produto:       produto,
		DataAplicacao: mustDate(data),
	}
}

func TestHormonio_Create_SemLactacaoAtiva(t *testing.T) {
	ctx := context.Background()
	toque := "2026-03-27"
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	svc.lactacaoRepo = &fakeHormonioLactacaoRepo{}
	_, err := svc.Create(ctx, 10, hormonioInput("2026-04-01", models.HormonioProdutoLactropin))
	if !errors.Is(err, ErrHormonioSemLactacaoAtiva) {
		t.Fatalf("expected ErrHormonioSemLactacaoAtiva, got %v", err)
	}
}

func TestHormonio_Create_SemLactacaoAtiva_ErrNoRows(t *testing.T) {
	ctx := context.Background()
	toque := "2026-03-27"
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	svc.lactacaoRepo = &fakeHormonioLactacaoRepoErrNoRows{}
	_, err := svc.Create(ctx, 10, hormonioInput("2026-04-01", models.HormonioProdutoLactropin))
	if !errors.Is(err, ErrHormonioSemLactacaoAtiva) {
		t.Fatalf("expected ErrHormonioSemLactacaoAtiva, got %v", err)
	}
}

func TestHormonio_Create_AntesInicioLactacao(t *testing.T) {
	ctx := context.Background()
	toque := "2026-03-27"
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	_, err := svc.Create(ctx, 10, hormonioInput("2025-12-15", models.HormonioProdutoLactropin))
	var dom *CicloIntegridadeError
	if !errors.As(err, &dom) || dom.IntCodigo != "TMP-003" {
		t.Fatalf("expected TMP-003 antes lactação, got %v", err)
	}
}

func TestHormonio_Create_SemToquePrenhe(t *testing.T) {
	ctx := context.Background()
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", nil)
	_, err := svc.Create(ctx, 10, hormonioInput("2026-04-01", models.HormonioProdutoLactropin))
	if !errors.Is(err, ErrHormonioSemToquePrenhe) {
		t.Fatalf("expected ErrHormonioSemToquePrenhe, got %v", err)
	}
}

func TestHormonio_Create_TMP003(t *testing.T) {
	ctx := context.Background()
	toque := "2026-04-10"
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	_, err := svc.Create(ctx, 10, hormonioInput("2026-02-20", models.HormonioProdutoLactropin))
	var dom *CicloIntegridadeError
	if !errors.As(err, &dom) || dom.IntCodigo != "TMP-003" {
		t.Fatalf("expected TMP-003, got %v", err)
	}
}

func TestHormonio_Create_CaminhoFeliz(t *testing.T) {
	ctx := context.Background()
	toque := "2026-03-26"
	svc, repo, saudeFake := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	row, err := svc.Create(ctx, 10, hormonioInput("2026-03-31", models.HormonioProdutoLactropin))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if row.NumeroDose != 1 {
		t.Fatalf("numero_dose=%d", row.NumeroDose)
	}
	if row.DataProximaAplicacao == nil || row.DataProximaAplicacao.Format("2006-01-02") != "2026-04-14" {
		t.Fatalf("data_proxima=%v", row.DataProximaAplicacao)
	}
	if len(repo.protocolos) != 1 || repo.protocolos[0].Status != models.HormonioProtocoloStatusAtivo {
		t.Fatalf("protocolo não criado ATIVO")
	}
	if len(saudeFake.casos) != 1 {
		t.Fatalf("expected caso PREVENTIVO")
	}
}

func TestHormonio_Create_SegundaDoseEBust(t *testing.T) {
	ctx := context.Background()
	toque := "2026-03-27"
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	if _, err := svc.Create(ctx, 10, hormonioInput("2026-04-01", models.HormonioProdutoLactropin)); err != nil {
		t.Fatalf("1a dose: %v", err)
	}
	row2, err := svc.Create(ctx, 10, hormonioInput("2026-04-15", models.HormonioProdutoLactropin))
	if err != nil {
		t.Fatalf("2a dose: %v", err)
	}
	if row2.NumeroDose != 2 {
		t.Fatalf("numero_dose=%d", row2.NumeroDose)
	}
	row3, err := svc.Create(ctx, 10, hormonioInput("2026-04-29", models.HormonioProdutoBust))
	if err != nil {
		t.Fatalf("3a dose BUST: %v", err)
	}
	if row3.NumeroDose != 3 || row3.Produto != models.HormonioProdutoBust {
		t.Fatalf("3a dose: %+v", row3)
	}
}

func TestHormonio_Create_Teto70Dias(t *testing.T) {
	ctx := context.Background()
	hoje := CivilToday()
	parto := hoje.AddDate(0, 0, 50)
	teto := parto.AddDate(0, 0, -70)
	lactInicio := hoje.AddDate(0, 0, -120).Format("2006-01-02")
	toque := hoje.AddDate(0, 0, -40).Format("2006-01-02")
	svc, _, _ := newHormonioTestSvc(10, lactInicio, parto.Format("2006-01-02"), &toque)
	_, err := svc.Create(ctx, 10, hormonioInput(hoje.Format("2006-01-02"), models.HormonioProdutoLactropin))
	if !errors.Is(err, ErrHormonioJanelaPreParto) {
		t.Fatalf("expected ErrHormonioJanelaPreParto, got %v", err)
	}
	row, err := svc.Create(ctx, 10, hormonioInput(teto.Format("2006-01-02"), models.HormonioProdutoLactropin))
	if err != nil {
		t.Fatalf("dose no teto: %v", err)
	}
	if row.DataProximaAplicacao != nil {
		t.Fatalf("expected data_proxima NULL, got %v", row.DataProximaAplicacao)
	}
}

func TestHormonio_Create_IntervaloMinimo(t *testing.T) {
	ctx := context.Background()
	toque := "2026-03-27"
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	if _, err := svc.Create(ctx, 10, hormonioInput("2026-04-01", models.HormonioProdutoLactropin)); err != nil {
		t.Fatalf("1a: %v", err)
	}
	_, err := svc.Create(ctx, 10, hormonioInput("2026-04-08", models.HormonioProdutoLactropin))
	if !errors.Is(err, ErrHormonioIntervaloMinimo) {
		t.Fatalf("expected ErrHormonioIntervaloMinimo, got %v", err)
	}
}

func TestHormonio_EncerrarEProtocoloEncerrado(t *testing.T) {
	ctx := context.Background()
	hoje := CivilToday()
	lactInicio := hoje.AddDate(0, 0, -60).Format("2006-01-02")
	parto := hoje.AddDate(0, 0, 200).Format("2006-01-02")
	toque := hoje.AddDate(0, 0, -20).Format("2006-01-02")
	dose1 := hoje.AddDate(0, 0, -10).Format("2006-01-02")
	dose2 := hoje.AddDate(0, 0, -5).Format("2006-01-02")
	svc, _, _ := newHormonioTestSvc(10, lactInicio, parto, &toque)
	if _, err := svc.Create(ctx, 10, hormonioInput(dose1, models.HormonioProdutoLactropin)); err != nil {
		t.Fatalf("create: %v", err)
	}
	prot, err := svc.EncerrarProtocolo(ctx, 10, EncerrarHormonioProtocoloInput{
		MotivoEncerramento: models.HormonioMotivoBaixaProducao,
	})
	if err != nil {
		t.Fatalf("encerrar: %v", err)
	}
	if prot.Status != models.HormonioProtocoloStatusEncerrado {
		t.Fatalf("status=%s", prot.Status)
	}
	_, err = svc.Create(ctx, 10, hormonioInput(dose2, models.HormonioProdutoLactropin))
	if !errors.Is(err, ErrHormonioProtocoloEncerrado) {
		t.Fatalf("expected PROTOCOLO_ENCERRADO, got %v", err)
	}
}

func TestHormonio_Create_ProdutoInvalido(t *testing.T) {
	ctx := context.Background()
	toque := "2026-03-27"
	svc, _, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", &toque)
	_, err := svc.Create(ctx, 10, hormonioInput("2026-04-01", "INVALIDO"))
	if !errors.Is(err, ErrHormonioProdutoInvalido) {
		t.Fatalf("expected PRODUTO_INVALIDO, got %v", err)
	}
}

func TestHormonio_ListPendentes(t *testing.T) {
	ctx := context.Background()
	svc, repo, _ := newHormonioTestSvc(10, "2026-01-01", "2026-12-01", nil)
	repo.pendentes = []*models.HormonioLactacaoPendente{
		{AnimalID: 10, TipoPendencia: models.HormonioPendenciaPrimeiraDose},
	}
	list, err := svc.ListPendentes(ctx, 1)
	if err != nil {
		t.Fatalf("ListPendentes: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("len=%d", len(list))
	}
}
