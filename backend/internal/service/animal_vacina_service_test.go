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

type fakeAnimalVacinaRepo struct {
	mu      sync.Mutex
	vacinas []*models.AnimalVacina
	nextID  int64
}

func newFakeAnimalVacinaRepo() *fakeAnimalVacinaRepo {
	return &fakeAnimalVacinaRepo{}
}

func (f *fakeAnimalVacinaRepo) ListByAnimalID(_ context.Context, animalID int64) ([]*models.AnimalVacina, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*models.AnimalVacina
	for _, v := range f.vacinas {
		if v.AnimalID == animalID {
			out = append(out, v)
		}
	}
	return out, nil
}

func (f *fakeAnimalVacinaRepo) GetByID(_ context.Context, animalID, vacinaID int64) (*models.AnimalVacina, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, v := range f.vacinas {
		if v.AnimalID == animalID && v.ID == vacinaID {
			copyV := *v
			return &copyV, nil
		}
	}
	return nil, pgx.ErrNoRows
}

func (f *fakeAnimalVacinaRepo) Create(_ context.Context, row *models.AnimalVacina) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	row.ID = f.nextID
	copyRow := *row
	f.vacinas = append(f.vacinas, &copyRow)
	return nil
}

func (f *fakeAnimalVacinaRepo) Update(_ context.Context, row *models.AnimalVacina) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, v := range f.vacinas {
		if v.ID == row.ID && v.AnimalID == row.AnimalID {
			copyRow := *row
			f.vacinas[i] = &copyRow
			return nil
		}
	}
	return pgx.ErrNoRows
}

func (f *fakeAnimalVacinaRepo) Delete(_ context.Context, animalID, vacinaID int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, v := range f.vacinas {
		if v.AnimalID == animalID && v.ID == vacinaID {
			f.vacinas = append(f.vacinas[:i], f.vacinas[i+1:]...)
			return nil
		}
	}
	return pgx.ErrNoRows
}

func (f *fakeAnimalVacinaRepo) ExistsPrevistaAbertaByAnimalTipo(_ context.Context, animalID int64, tipoVacina string, excludeID int64) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, v := range f.vacinas {
		if v.AnimalID == animalID && v.TipoVacina == tipoVacina && v.DataAplicacao == nil && v.ID != excludeID {
			return true, nil
		}
	}
	return false, nil
}

func newAnimalVacinaServiceForTest(
	vacinas *fakeAnimalVacinaRepo,
	animal *fakeAnimalRepoForSaude,
	saude *fakeAnimalSaudeRepo,
	resolver *fakeAlertaAutoResolver,
) *AnimalVacinaService {
	svc := &AnimalVacinaService{
		repo:       vacinas,
		animalRepo: animal,
		saudeRepo:  saude,
	}
	if resolver != nil {
		svc.alertaResolver = resolver
	}
	return svc
}

func vacinaAnimalFakes(animalID int64) (*fakeAnimalVacinaRepo, *fakeAnimalRepoForSaude, *fakeAnimalSaudeRepo, *fakeAlertaAutoResolver) {
	return newFakeAnimalVacinaRepo(),
		newFakeAnimalRepoForSaude(map[int64]*models.Animal{
			animalID: animalAtivoNoRebanho(animalID, 1),
		}),
		newFakeAnimalSaudeRepo(),
		&fakeAlertaAutoResolver{}
}

func ontem() time.Time {
	return CivilToday().AddDate(0, 0, -1)
}

func aplicadaInput(dataAplicacao time.Time) SaveAnimalVacinaInput {
	return SaveAnimalVacinaInput{
		TipoVacina:    models.VacinaTipoAftosa,
		DataAplicacao: &dataAplicacao,
	}
}

func previstaInput(dataPrevista time.Time) SaveAnimalVacinaInput {
	return SaveAnimalVacinaInput{
		TipoVacina:   models.VacinaTipoAftosa,
		DataPrevista: &dataPrevista,
	}
}

// Caso briefing: registrar vacina aplicada com sucesso (BR-SAUDE-007 + BR-SAUDE-010).
func TestAnimalVacina_Create_AplicadaSucesso(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	dataAplicacao := ontem()
	row, err := svc.Create(ctx, animalID, aplicadaInput(dataAplicacao), false)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if row.ID == 0 {
		t.Fatal("expected vacina with ID assigned")
	}
	if row.Status != models.VacinaStatusAplicada {
		t.Fatalf("expected status APLICADA, got %s", row.Status)
	}
	// data_prevista assume data_aplicacao quando omitida
	if !row.DataPrevista.Equal(TruncateToCivilDate(dataAplicacao)) {
		t.Fatalf("expected data_prevista = data_aplicacao, got %v", row.DataPrevista)
	}
	// BR-SAUDE-010: caso PREVENTIVO CONCLUIDO criado com vacina_id
	casos, _ := saudeFake.ListByAnimalID(ctx, animalID)
	if len(casos) != 1 {
		t.Fatalf("expected 1 caso PREVENTIVO, got %d", len(casos))
	}
	caso := casos[0]
	if caso.TipoCaso != models.AnimalSaudeTipoPreventivo ||
		caso.Status != models.AnimalSaudeStatusConcluido {
		t.Fatalf("expected PREVENTIVO/CONCLUIDO, got %s/%s", caso.TipoCaso, caso.Status)
	}
	if caso.VacinaID == nil || *caso.VacinaID != row.ID {
		t.Fatalf("expected vacina_id %d no caso, got %v", row.ID, caso.VacinaID)
	}
	// Auto-resolve VACINA_VENCIDA + VACINA_REFORCO_VENCIDA
	if len(resolver.calls) != 2 {
		t.Fatalf("expected 2 resolver calls, got %d", len(resolver.calls))
	}
	tipos := map[string]bool{}
	for _, c := range resolver.calls {
		tipos[c.tipo] = true
	}
	if !tipos[models.AlertaTipoVacinaVencida] || !tipos[models.AlertaTipoVacinaReforcoVencido] {
		t.Fatalf("expected resolve de VACINA_VENCIDA e VACINA_REFORCO_VENCIDA, got %v", tipos)
	}
}

// Caso briefing: agendar vacina prevista (GERENTE+).
func TestAnimalVacina_Create_PrevistaSucesso(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	futura := CivilToday().AddDate(0, 0, 30)
	row, err := svc.Create(ctx, animalID, previstaInput(futura), true)
	if err != nil {
		t.Fatalf("Create prevista: %v", err)
	}
	if row.DataAplicacao != nil {
		t.Fatal("expected data_aplicacao nil")
	}
	if row.Status != models.VacinaStatusPrevista {
		t.Fatalf("expected status PREVISTA, got %s", row.Status)
	}
	// Sem aplicação não cria caso PREVENTIVO nem resolve alertas
	casos, _ := saudeFake.ListByAnimalID(ctx, animalID)
	if len(casos) != 0 {
		t.Fatalf("expected 0 casos, got %d", len(casos))
	}
	if len(resolver.calls) != 0 {
		t.Fatalf("expected 0 resolver calls, got %d", len(resolver.calls))
	}
}

// Caso briefing: FUNCIONARIO não pode agendar prevista (decisão G1 #4).
func TestAnimalVacina_Create_FuncionarioNaoAgenda(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	futura := CivilToday().AddDate(0, 0, 30)
	_, err := svc.Create(ctx, animalID, previstaInput(futura), false)
	if !errors.Is(err, ErrVacinaAgendamentoNaoPermitido) {
		t.Fatalf("expected ErrVacinaAgendamentoNaoPermitido, got %v", err)
	}
}

// Caso briefing: prevista duplicada do mesmo tipo → 409.
func TestAnimalVacina_Create_PrevistaDuplicada(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	futura := CivilToday().AddDate(0, 0, 30)
	if _, err := svc.Create(ctx, animalID, previstaInput(futura), true); err != nil {
		t.Fatalf("primeira prevista: %v", err)
	}
	_, err := svc.Create(ctx, animalID, previstaInput(futura.AddDate(0, 0, 10)), true)
	if !errors.Is(err, ErrVacinaDuplicada) {
		t.Fatalf("expected ErrVacinaDuplicada, got %v", err)
	}
}

// Caso briefing: data_aplicacao futura → TMP-001.
func TestAnimalVacina_Create_AplicacaoFutura(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	futura := CivilToday().AddDate(0, 0, 2)
	_, err := svc.Create(ctx, animalID, aplicadaInput(futura), false)
	ie, ok := AsIntegridadeCiclo(err)
	if !ok || ie.IntCodigo != "TMP-001" {
		t.Fatalf("expected TMP-001, got %v", err)
	}
}

// Caso briefing: data_aplicacao anterior à entrada do animal → TMP-002.
func TestAnimalVacina_Create_AplicacaoAntesEntrada(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	entrada := CivilToday().AddDate(0, 0, -10)
	animal := animalAtivoNoRebanho(animalID, 1)
	animal.DataEntrada = &entrada
	vacinasFake := newFakeAnimalVacinaRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{animalID: animal})
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, newFakeAnimalSaudeRepo(), &fakeAlertaAutoResolver{})

	antes := entrada.AddDate(0, 0, -5)
	_, err := svc.Create(ctx, animalID, aplicadaInput(antes), false)
	ie, ok := AsIntegridadeCiclo(err)
	if !ok || ie.IntCodigo != "TMP-002" {
		t.Fatalf("expected TMP-002, got %v", err)
	}
}

func TestAnimalVacina_Create_TipoInvalido(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	in := aplicadaInput(ontem())
	in.TipoVacina = "GRIPE"
	_, err := svc.Create(ctx, animalID, in, false)
	if !errors.Is(err, ErrVacinaTipoInvalido) {
		t.Fatalf("expected ErrVacinaTipoInvalido, got %v", err)
	}
}

func TestAnimalVacina_Create_ValidadeInvalida(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	zero := 0
	in := aplicadaInput(ontem())
	in.ValidadeDias = &zero
	_, err := svc.Create(ctx, animalID, in, false)
	if !errors.Is(err, ErrVacinaValidadeInvalida) {
		t.Fatalf("expected ErrVacinaValidadeInvalida, got %v", err)
	}
}

func TestAnimalVacina_Create_AnimalBaixado(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake := newFakeAnimalVacinaRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalBaixado(animalID, 1),
	})
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, newFakeAnimalSaudeRepo(), &fakeAlertaAutoResolver{})

	_, err := svc.Create(ctx, animalID, aplicadaInput(ontem()), false)
	if !errors.Is(err, ErrAnimalForaDoRebanho) {
		t.Fatalf("expected ErrAnimalForaDoRebanho, got %v", err)
	}
}

// BR-SAUDE-011: validade_dias calcula data_proximo_reforco.
func TestAnimalVacina_Create_ReforcoCalculado(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	dataAplicacao := ontem()
	validade := 180
	in := aplicadaInput(dataAplicacao)
	in.ValidadeDias = &validade
	row, err := svc.Create(ctx, animalID, in, false)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	want := TruncateToCivilDate(dataAplicacao.AddDate(0, 0, validade))
	if row.DataProximoReforco == nil || !row.DataProximoReforco.Equal(want) {
		t.Fatalf("expected reforço %v, got %v", want, row.DataProximoReforco)
	}
}

// BR-SAUDE-011: data_proximo_reforco manual prevalece sobre o cálculo.
func TestAnimalVacina_Create_ReforcoManualPrevalece(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	dataAplicacao := ontem()
	validade := 180
	manual := CivilToday().AddDate(0, 1, 0)
	in := aplicadaInput(dataAplicacao)
	in.ValidadeDias = &validade
	in.DataProximoReforco = &manual
	row, err := svc.Create(ctx, animalID, in, false)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if row.DataProximoReforco == nil || !row.DataProximoReforco.Equal(TruncateToCivilDate(manual)) {
		t.Fatalf("expected reforço manual %v, got %v", manual, row.DataProximoReforco)
	}
}

// Caso briefing: aplicar vacina prevista (PATCH) resolve alerta e cria caso PREVENTIVO.
func TestAnimalVacina_Aplicar_Sucesso(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	prevista := CivilToday().AddDate(0, 0, -20)
	created, err := svc.Create(ctx, animalID, previstaInput(prevista), true)
	if err != nil {
		t.Fatalf("Create prevista: %v", err)
	}
	if created.Status != models.VacinaStatusAtrasada {
		t.Fatalf("expected status ATRASADA antes de aplicar, got %s", created.Status)
	}

	validade := 365
	row, err := svc.Aplicar(ctx, animalID, created.ID, AplicarVacinaInput{
		DataAplicacao: ontem(),
		ValidadeDias:  &validade,
	})
	if err != nil {
		t.Fatalf("Aplicar: %v", err)
	}
	if row.DataAplicacao == nil {
		t.Fatal("expected data_aplicacao preenchida")
	}
	if row.Status != models.VacinaStatusAplicada {
		t.Fatalf("expected status APLICADA, got %s", row.Status)
	}
	if row.DataProximoReforco == nil {
		t.Fatal("expected data_proximo_reforco calculada")
	}
	casos, _ := saudeFake.ListByAnimalID(ctx, animalID)
	if len(casos) != 1 {
		t.Fatalf("expected 1 caso PREVENTIVO, got %d", len(casos))
	}
	if len(resolver.calls) != 2 {
		t.Fatalf("expected 2 resolver calls, got %d", len(resolver.calls))
	}
}

// Caso briefing: aplicar vacina já aplicada → 400.
func TestAnimalVacina_Aplicar_JaAplicada(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	created, err := svc.Create(ctx, animalID, aplicadaInput(ontem()), false)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	_, err = svc.Aplicar(ctx, animalID, created.ID, AplicarVacinaInput{DataAplicacao: ontem()})
	if !errors.Is(err, ErrVacinaJaAplicada) {
		t.Fatalf("expected ErrVacinaJaAplicada, got %v", err)
	}
}

func TestAnimalVacina_Aplicar_NaoEncontrada(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	_, err := svc.Aplicar(ctx, animalID, 999, AplicarVacinaInput{DataAplicacao: ontem()})
	if !errors.Is(err, ErrVacinaNotFound) {
		t.Fatalf("expected ErrVacinaNotFound, got %v", err)
	}
}

// Update prevista → aplicada dispara efeitos de aplicação (BR-SAUDE-010).
func TestAnimalVacina_Update_PrevistaParaAplicada(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	prevista := CivilToday().AddDate(0, 0, -5)
	created, err := svc.Create(ctx, animalID, previstaInput(prevista), true)
	if err != nil {
		t.Fatalf("Create prevista: %v", err)
	}

	dataAplicacao := ontem()
	in := SaveAnimalVacinaInput{
		TipoVacina:    models.VacinaTipoAftosa,
		DataPrevista:  &prevista,
		DataAplicacao: &dataAplicacao,
	}
	row, err := svc.Update(ctx, animalID, created.ID, in)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if row.DataAplicacao == nil {
		t.Fatal("expected data_aplicacao preenchida")
	}
	casos, _ := saudeFake.ListByAnimalID(ctx, animalID)
	if len(casos) != 1 {
		t.Fatalf("expected 1 caso PREVENTIVO após update, got %d", len(casos))
	}
	if len(resolver.calls) != 2 {
		t.Fatalf("expected 2 resolver calls, got %d", len(resolver.calls))
	}
}

func TestAnimalVacina_Delete_NaoEncontrada(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	vacinasFake, animalFake, saudeFake, resolver := vacinaAnimalFakes(animalID)
	svc := newAnimalVacinaServiceForTest(vacinasFake, animalFake, saudeFake, resolver)

	if err := svc.Delete(ctx, animalID, 999); !errors.Is(err, ErrVacinaNotFound) {
		t.Fatalf("expected ErrVacinaNotFound, got %v", err)
	}
}

// BR-SAUDE-009: status derivado para timeline/listagem.
func TestDeriveVacinaStatus(t *testing.T) {
	ref := time.Date(2026, 6, 9, 0, 0, 0, 0, time.UTC)
	aplicada := ref.AddDate(0, 0, -10)
	reforcoVencido := ref.AddDate(0, 0, -2)
	reforcoFuturo := ref.AddDate(0, 0, 30)

	cases := []struct {
		name string
		v    models.AnimalVacina
		want string
	}{
		{
			name: "prevista futura",
			v:    models.AnimalVacina{DataPrevista: ref.AddDate(0, 0, 5)},
			want: models.VacinaStatusPrevista,
		},
		{
			name: "prevista hoje",
			v:    models.AnimalVacina{DataPrevista: ref},
			want: models.VacinaStatusPrevista,
		},
		{
			name: "atrasada",
			v:    models.AnimalVacina{DataPrevista: ref.AddDate(0, 0, -1)},
			want: models.VacinaStatusAtrasada,
		},
		{
			name: "aplicada sem reforço",
			v:    models.AnimalVacina{DataPrevista: aplicada, DataAplicacao: &aplicada},
			want: models.VacinaStatusAplicada,
		},
		{
			name: "aplicada com reforço futuro",
			v: models.AnimalVacina{
				DataPrevista: aplicada, DataAplicacao: &aplicada, DataProximoReforco: &reforcoFuturo,
			},
			want: models.VacinaStatusAplicada,
		},
		{
			name: "reforço vencido",
			v: models.AnimalVacina{
				DataPrevista: aplicada, DataAplicacao: &aplicada, DataProximoReforco: &reforcoVencido,
			},
			want: models.VacinaStatusReforcoVencido,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := models.DeriveVacinaStatus(&tc.v, ref); got != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, got)
			}
		})
	}
}

// BR-ALERTA-016/017: novos tipos no modelo com severidade ALTA + push.
func TestAlertaTiposVacina(t *testing.T) {
	for _, tipo := range []string{models.AlertaTipoVacinaVencida, models.AlertaTipoVacinaReforcoVencido} {
		if !models.IsValidAlertaTipo(tipo) {
			t.Fatalf("tipo %s deveria ser válido", tipo)
		}
		sev, ok := models.SeveridadePadraoPorTipo(tipo)
		if !ok || sev != models.AlertaSeveridadeAlta {
			t.Fatalf("tipo %s: esperava severidade ALTA, got %s (ok=%v)", tipo, sev, ok)
		}
		if !models.ShouldNotifyPushForSeveridade(sev) {
			t.Fatalf("tipo %s deveria disparar push", tipo)
		}
	}
}
