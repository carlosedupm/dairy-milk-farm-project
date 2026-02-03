package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/observability"
)

const (
	intentCadastrarFazenda        = "cadastrar_fazenda"
	intentListarFazendas          = "listar_fazendas"
	intentBuscarFazenda           = "buscar_fazenda"
	intentEditarFazenda           = "editar_fazenda"
	intentExcluirFazenda          = "excluir_fazenda"
	intentConsultarAnimaisFazenda = "consultar_animais_fazenda"
	intentListarAnimaisFazenda    = "listar_animais_fazenda"
	intentDetalharAnimal          = "detalhar_animal"
	intentCadastrarAnimal         = "cadastrar_animal"
	intentEditarAnimal            = "editar_animal"
	intentExcluirAnimal           = "excluir_animal"
	intentRegistrarProducaoAnimal = "registrar_producao_animal"
)

// InterpretRequest contém o texto digitado ou transcrito da voz.
type InterpretRequest struct {
	Texto string `json:"texto"`
}

// InterpretResponse é a resposta do endpoint interpretar (intent + payload + resumo para confirmação).
type InterpretResponse struct {
	Intent  string                 `json:"intent"`
	Payload map[string]interface{} `json:"payload"`
	Resumo  string                 `json:"resumo"`
}

// ExecutarRequest contém intent e payload já confirmados pelo usuário.
type ExecutarRequest struct {
	Intent  string                 `json:"intent"`
	Payload map[string]interface{} `json:"payload"`
}

type AssistenteService struct {
	geminiAPIKey string
	fazendaSvc   *FazendaService
	animalSvc    *AnimalService
	producaoSvc  *ProducaoService
}

func NewAssistenteService(geminiAPIKey string, fazendaSvc *FazendaService, animalSvc *AnimalService, producaoSvc *ProducaoService) *AssistenteService {
	return &AssistenteService{
		geminiAPIKey: geminiAPIKey,
		fazendaSvc:   fazendaSvc,
		animalSvc:    animalSvc,
		producaoSvc:  producaoSvc,
	}
}

// Interpretar envia o texto ao LLM (Gemini) com contexto do usuário e do sistema, e retorna intent, payload e resumo para confirmação.
func (s *AssistenteService) Interpretar(ctx context.Context, texto string, userID int64, perfil string, nomeUsuario string) (*InterpretResponse, error) {
	texto = strings.TrimSpace(texto)
	if texto == "" {
		return nil, fmt.Errorf("texto é obrigatório")
	}

	// Contexto do sistema: fazendas vinculadas ao usuário (às quais ele tem acesso)
	fazendas, err := s.fazendaSvc.GetByUsuarioID(ctx, userID)
	if err != nil {
		slog.Warn("Assistente: falha ao carregar fazendas do usuário para contexto", "error", err)
		fazendas = nil
	}

	if nomeUsuario == "" {
		nomeUsuario = "Usuário"
	}
	if perfil == "" {
		perfil = "USER"
	}

	// Contexto condicional para reduzir tokens: só envia lista de fazendas quando há 2+ (desambiguar)
	var contextoSection string
	switch len(fazendas) {
	case 0:
		contextoSection = fmt.Sprintf(`Contexto do usuário: nome "%s", perfil %s.
Fazendas vinculadas ao usuário: nenhuma.
Se o perfil for USER, ofereça apenas intents de fazendas. Se ADMIN ou DEVELOPER, pode incluir intents administrativos quando implementados.

`, nomeUsuario, perfil)
	case 1:
		contextoSection = fmt.Sprintf(`Contexto do usuário: nome "%s", perfil %s.
O usuário tem apenas uma fazenda vinculada. Para cadastrar_animal, listar_animais_fazenda e consultar_animais_fazenda, não exija fazenda no payload se o usuário não mencionar (o sistema preenche automaticamente).
Se o perfil for USER, ofereça apenas intents de fazendas. Se ADMIN ou DEVELOPER, pode incluir intents administrativos quando implementados.

`, nomeUsuario, perfil)
	default:
		parts := make([]string, 0, len(fazendas))
		for _, f := range fazendas {
			parts = append(parts, fmt.Sprintf("[id: %d, nome: %s]", f.ID, f.Nome))
		}
		ctxoFazendas := strings.Join(parts, ", ")
		contextoSection = fmt.Sprintf(`Contexto do usuário: nome "%s", perfil %s.
Fazendas vinculadas ao usuário (às quais ele tem acesso): %s.
Use essa lista para desambiguar (ex.: "editar a fazenda X" quando há várias) e para respostas naturais ("você tem N fazendas: ...").
Para cadastrar_animal, listar_animais_fazenda e consultar_animais_fazenda: se o usuário NÃO mencionou fazenda na frase, inclua no payload fazenda_id (number) com o id da fazenda correspondente quando houver apenas uma, ou peça que especifique quando houver várias.
Se o perfil for USER, ofereça apenas intents de fazendas. Se ADMIN ou DEVELOPER, pode incluir intents administrativos quando implementados.

`, nomeUsuario, perfil, ctxoFazendas)
	}

	prompt := fmt.Sprintf(`Você é um assistente do sistema CeialMilk (gestão de fazendas leiteiras).

%s
A partir da frase do usuário abaixo, extraia a INTENÇÃO e os DADOS necessários.

Intenções possíveis:
- cadastrar_fazenda: quando o usuário quer registrar uma nova fazenda
- listar_fazendas: quando o usuário quer ver a lista de fazendas (ex: "listar fazendas", "quais minhas fazendas")
- buscar_fazenda: quando o usuário quer buscar ou pesquisar uma fazenda específica por nome (ex: "buscar fazenda Sítio X", "pesquisar fazenda X", "mostrar a fazenda Y")
- consultar_animais_fazenda: quando o usuário quer saber quantos animais ou vacas tem em uma fazenda (ex: "quantas vacas tem na fazenda X", "quantos animais na fazenda Y", "quantas vacas tem na fazenda Larissa")
- listar_animais_fazenda: quando o usuário quer listar ou ver os animais de uma fazenda (ex: "quais animais tem na fazenda X", "listar animais da fazenda Larissa", "me dá mais informações sobre os animais da fazenda Y")
- detalhar_animal: quando o usuário quer ver detalhes de um animal específico (ex: "detalhes do animal X", "qual a raça do animal 123?", "informações sobre o animal identificação Y", "quero saber mais sobre o animal Z")
- cadastrar_animal: quando o usuário quer cadastrar um novo animal em uma fazenda (ex: "cadastrar animal na fazenda X", "registrar vaca Vaca 01 na fazenda Larissa")
- editar_animal: quando o usuário quer alterar dados de um animal existente (ex: "editar o animal X", "alterar raça do animal 123", "mudar status de saúde do animal identificação Y")
- excluir_animal: quando o usuário quer excluir um animal (ex: "excluir o animal X", "remover animal 123")
- registrar_producao_animal: quando o usuário quer registrar produção de leite de um animal (ex: "registrar produção do animal X", "anotar 10 litros do animal 123", "produção de leite do animal Vaca 01: 15 litros")
- editar_fazenda: quando o usuário quer alterar dados de uma fazenda existente (identifique por id ou nome)
- excluir_fazenda: quando o usuário quer excluir uma fazenda (identifique por id ou nome)

Para cadastrar_fazenda, extraia: nome, quantidadeVacas (number, 0 se não mencionado), fundacao (string YYYY ou YYYY-MM-DD), localizacao (opcional).

Para listar_fazendas, payload pode ser {} e resumo algo como "Listar fazendas cadastradas" ou "Você tem N fazendas: ..." usando a lista acima.

Para buscar_fazenda, extraia: nome (string = parte do nome da fazenda para buscar). Resumo: "Buscar fazenda X" ou "Mostrar fazenda X."

Para consultar_animais_fazenda, extraia: nome (string = nome da fazenda para consultar). Resumo: "Consultar quantidade de animais na fazenda X." ou "Quantas vacas tem na fazenda X."

Para listar_animais_fazenda, extraia: nome (string = nome da fazenda) OU id (number = id da fazenda). Resumo: "Listar animais da fazenda X." ou "Quais animais tem na fazenda X."

Para detalhar_animal, extraia: id (number = id do animal) OU identificacao (string = identificação ou parte do nome do animal para buscar). Resumo: "Ver detalhes do animal X." ou "Informações sobre o animal Y."

Para cadastrar_animal, extraia: fazenda_id (number) OU nome_fazenda (string = nome da fazenda onde cadastrar), identificacao (string = identificação do animal), raca (string, opcional), data_nascimento (string YYYY-MM-DD ou YYYY, opcional), sexo (string M ou F, opcional), status_saude (string SAUDAVEL/DOENTE/EM_TRATAMENTO, opcional). Resumo: "Cadastrar animal X na fazenda Y."

Para editar_animal, extraia: id (number) OU identificacao (string) para identificar o animal; depois os campos a alterar: identificacaoNovo (string = nova identificação quando renomear), raca, data_nascimento, sexo, status_saude, fazenda_id (para transferir de fazenda). Resumo: "Editar animal X." ou "Alterar raça do animal Y."

Para excluir_animal, extraia: id (number) OU identificacao (string) para identificar o animal. Resumo: "Excluir o animal X."

Para registrar_producao_animal, extraia: id (number) OU identificacao (string) do animal, quantidade (number = litros), data_hora (string ISO opcional), qualidade (number 1-10 opcional). Resumo: "Registrar X litros de produção do animal Y."

Para editar_fazenda, extraia: id (number) OU nome (string = nome ATUAL da fazenda para identificar/buscar); depois os campos a alterar: nomeNovo (string = novo nome quando o usuário quiser RENOMEAR, ex: "editar fazenda X para se chamar Y" -> nome:"X", nomeNovo:"Y"), quantidadeVacas (number), fundacao (string), localizacao (string). Use sempre nomeNovo quando o usuário pedir para mudar o nome; use nome apenas para identificar a fazenda quando não houver id.

Para excluir_fazenda, extraia: id (number) OU nome (string) para identificar a fazenda a excluir. Resumo: "Excluir a fazenda X." (deixe claro que é exclusão).

Retorne APENAS um JSON válido, sem markdown, sem explicações. Exemplos de formato:
- cadastrar: {"intent":"cadastrar_fazenda","payload":{"nome":"...","quantidadeVacas":0,"fundacao":"...","localizacao":"..."},"resumo":"Criar fazenda X com Y vacas, fundada em Z."}
- listar: {"intent":"listar_fazendas","payload":{},"resumo":"Listar fazendas cadastradas."}
- buscar: {"intent":"buscar_fazenda","payload":{"nome":"Sítio X"},"resumo":"Buscar fazenda Sítio X."}
- consultar animais: {"intent":"consultar_animais_fazenda","payload":{"nome":"Larissa"},"resumo":"Consultar quantidade de animais na fazenda Larissa."}
- listar animais fazenda: {"intent":"listar_animais_fazenda","payload":{"nome":"Larissa"},"resumo":"Listar animais da fazenda Larissa."}
- detalhar animal: {"intent":"detalhar_animal","payload":{"identificacao":"Vaca 01"} ou {"id":123},"resumo":"Ver detalhes do animal Vaca 01."}
- cadastrar animal: {"intent":"cadastrar_animal","payload":{"nome_fazenda":"Larissa","identificacao":"Vaca 01","raca":"Holandesa","sexo":"F"},"resumo":"Cadastrar animal Vaca 01 na fazenda Larissa."}
- cadastrar animal (usuário com 1 fazenda, sem citar fazenda): {"intent":"cadastrar_animal","payload":{"fazenda_id":1,"identificacao":"Vaca 01"},"resumo":"Cadastrar animal Vaca 01 na sua fazenda."}
- editar animal: {"intent":"editar_animal","payload":{"identificacao":"Vaca 01","raca":"Girolando"} ou {"id":123,"status_saude":"SAUDAVEL"},"resumo":"Editar animal Vaca 01."}
- excluir animal: {"intent":"excluir_animal","payload":{"identificacao":"Vaca 01"} ou {"id":123},"resumo":"Excluir o animal Vaca 01."}
- registrar produção: {"intent":"registrar_producao_animal","payload":{"identificacao":"Vaca 01","quantidade":15} ou {"id":123,"quantidade":10},"resumo":"Registrar 15 litros de produção do animal Vaca 01."}
- editar (só quantidade): {"intent":"editar_fazenda","payload":{"nome":"Sítio X","quantidadeVacas":30},"resumo":"Alterar fazenda Sítio X para 30 vacas."}
- editar (renomear): {"intent":"editar_fazenda","payload":{"nome":"Sítio X","nomeNovo":"Sítio Novo"},"resumo":"Renomear fazenda Sítio X para Sítio Novo."}
- editar (por id): {"intent":"editar_fazenda","payload":{"id":1,"nome":"Nome Novo"} ou {"id":1,"quantidadeVacas":10},"resumo":"Alterar fazenda (id 1)."}
- excluir: {"intent":"excluir_fazenda","payload":{"nome":"Sítio X"} ou {"id":1},"resumo":"Excluir a fazenda Sítio X."}

Se não for possível identificar a intenção ou dados suficientes: {"intent":"desconhecido","payload":{},"resumo":"Não foi possível entender o pedido."}

Frase do usuário:
%s`, contextoSection, texto)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
	}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar payload: %w", err)
	}

	model := "gemini-2.0-flash"
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent?key=%s", model, s.geminiAPIKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro ao chamar Gemini: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		if resp.StatusCode == http.StatusForbidden {
			msg := strings.ToLower(string(bodyBytes))
			if strings.Contains(msg, "leaked") || strings.Contains(msg, "reported") {
				return nil, fmt.Errorf("chave da API Gemini inválida ou vazada. Atualize GEMINI_API_KEY")
			}
		}
		if resp.StatusCode == http.StatusTooManyRequests {
			return nil, fmt.Errorf("quota da API Gemini excedida. Tente novamente mais tarde")
		}
		return nil, fmt.Errorf("erro na API Gemini: status %d", resp.StatusCode)
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta Gemini: %w", err)
	}
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("resposta vazia da API Gemini")
	}

	text := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	text = cleanJSONResponse(text)

	var out InterpretResponse
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_interpret"}, nil)
		return nil, fmt.Errorf("não foi possível interpretar a resposta. Tente reformular o pedido")
	}

	if out.Intent == "" {
		out.Intent = "desconhecido"
	}
	if out.Payload == nil {
		out.Payload = make(map[string]interface{})
	}
	if out.Resumo == "" {
		out.Resumo = "Não foi possível entender o pedido."
	}

	return &out, nil
}

// Executar executa a ação conforme intent e payload (já confirmados pelo usuário).
func (s *AssistenteService) Executar(ctx context.Context, intent string, payload map[string]interface{}, userID int64) (interface{}, error) {
	switch intent {
	case intentCadastrarFazenda:
		return s.executarCadastrarFazenda(ctx, payload)
	case intentListarFazendas:
		return s.executarListarFazendas(ctx)
	case intentBuscarFazenda:
		return s.executarBuscarFazenda(ctx, payload)
	case intentConsultarAnimaisFazenda:
		return s.executarConsultarAnimaisFazenda(ctx, payload, userID)
	case intentListarAnimaisFazenda:
		return s.executarListarAnimaisFazenda(ctx, payload, userID)
	case intentDetalharAnimal:
		return s.executarDetalharAnimal(ctx, payload)
	case intentCadastrarAnimal:
		return s.executarCadastrarAnimal(ctx, payload, userID)
	case intentEditarAnimal:
		return s.executarEditarAnimal(ctx, payload)
	case intentExcluirAnimal:
		return s.executarExcluirAnimal(ctx, payload)
	case intentRegistrarProducaoAnimal:
		return s.executarRegistrarProducaoAnimal(ctx, payload)
	case intentEditarFazenda:
		return s.executarEditarFazenda(ctx, payload)
	case intentExcluirFazenda:
		return s.executarExcluirFazenda(ctx, payload)
	default:
		return nil, fmt.Errorf("intent não suportado: %s", intent)
	}
}

func (s *AssistenteService) executarCadastrarFazenda(ctx context.Context, payload map[string]interface{}) (*models.Fazenda, error) {
	nome, _ := payload["nome"].(string)
	nome = strings.TrimSpace(nome)
	if nome == "" {
		return nil, fmt.Errorf("nome da fazenda é obrigatório")
	}

	quantidadeVacas := 0
	switch v := payload["quantidadeVacas"].(type) {
	case float64:
		quantidadeVacas = int(v)
	case int:
		quantidadeVacas = v
	}
	if quantidadeVacas < 0 {
		quantidadeVacas = 0
	}

	var localizacao *string
	if v, ok := payload["localizacao"].(string); ok && strings.TrimSpace(v) != "" {
		s := strings.TrimSpace(v)
		localizacao = &s
	}

	var fundacao *time.Time
	if v, ok := payload["fundacao"].(string); ok && strings.TrimSpace(v) != "" {
		t, err := parseFundacaoAssistente(strings.TrimSpace(v))
		if err != nil {
			slog.Warn("Data de fundação inválida no assistente", "value", v, "error", err)
		} else if t != nil {
			fundacao = t
		}
	}

	fazenda := &models.Fazenda{
		Nome:            nome,
		QuantidadeVacas: quantidadeVacas,
		Localizacao:     localizacao,
		Fundacao:        fundacao,
	}
	if err := s.fazendaSvc.Create(ctx, fazenda); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_cadastrar_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao criar fazenda: %w", err)
	}
	slog.Info("Fazenda criada via assistente", "fazenda_id", fazenda.ID, "nome", fazenda.Nome)
	return fazenda, nil
}

func (s *AssistenteService) executarListarFazendas(ctx context.Context) ([]*models.Fazenda, error) {
	list, err := s.fazendaSvc.GetAll(ctx)
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_listar_fazendas"}, nil)
		return nil, fmt.Errorf("erro ao listar fazendas: %w", err)
	}
	slog.Info("Fazendas listadas via assistente", "count", len(list))
	return list, nil
}

func (s *AssistenteService) executarBuscarFazenda(ctx context.Context, payload map[string]interface{}) (interface{}, error) {
	nome, ok := payload["nome"].(string)
	if !ok || strings.TrimSpace(nome) == "" {
		return nil, fmt.Errorf("informe o nome ou parte do nome da fazenda para buscar")
	}
	list, err := s.fazendaSvc.SearchByNome(ctx, strings.TrimSpace(nome))
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_buscar_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao buscar fazendas: %w", err)
	}
	if len(list) == 0 {
		return nil, fmt.Errorf("nenhuma fazenda encontrada com o nome \"%s\"", nome)
	}
	slog.Info("Fazendas buscadas via assistente", "termo", nome, "count", len(list))
	if len(list) == 1 {
		return list[0], nil
	}
	return list, nil
}

func (s *AssistenteService) executarConsultarAnimaisFazenda(ctx context.Context, payload map[string]interface{}, userID int64) (map[string]interface{}, error) {
	fazenda, err := s.resolveFazendaForUser(ctx, payload, userID, "id", "nome")
	if err != nil {
		return nil, err
	}
	count, err := s.animalSvc.CountByFazenda(ctx, fazenda.ID)
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_consultar_animais_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao contar animais da fazenda: %w", err)
	}
	var msg string
	switch count {
	case 0:
		msg = fmt.Sprintf("A fazenda %s não tem animais cadastrados.", fazenda.Nome)
	case 1:
		msg = fmt.Sprintf("A fazenda %s tem 1 animal (vaca).", fazenda.Nome)
	default:
		msg = fmt.Sprintf("A fazenda %s tem %d animais (vacas).", fazenda.Nome, count)
	}
	slog.Info("Animais consultados via assistente", "fazenda_id", fazenda.ID, "fazenda_nome", fazenda.Nome, "count", count)
	return map[string]interface{}{
		"message":      msg,
		"count":        count,
		"fazenda_nome": fazenda.Nome,
	}, nil
}

func (s *AssistenteService) executarListarAnimaisFazenda(ctx context.Context, payload map[string]interface{}, userID int64) (map[string]interface{}, error) {
	fazenda, err := s.resolveFazendaForUser(ctx, payload, userID, "id", "nome")
	if err != nil {
		return nil, err
	}
	animais, err := s.animalSvc.GetByFazendaID(ctx, fazenda.ID)
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_listar_animais_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao listar animais da fazenda: %w", err)
	}
	var msg string
	if len(animais) == 0 {
		msg = fmt.Sprintf("A fazenda %s não tem animais cadastrados.", fazenda.Nome)
	} else if len(animais) == 1 {
		a := animais[0]
		msg = fmt.Sprintf("A fazenda %s tem 1 animal: %s (raça: %s, sexo: %s, status: %s).",
			fazenda.Nome, a.Identificacao, strOrEmpty(a.Raca), strOrEmpty(a.Sexo), strOrEmpty(a.StatusSaude))
	} else {
		parts := make([]string, 0, len(animais))
		for _, a := range animais {
			parts = append(parts, fmt.Sprintf("%s (raça %s, %s)", a.Identificacao, strOrEmpty(a.Raca), strOrEmpty(a.Sexo)))
		}
		msg = fmt.Sprintf("A fazenda %s tem %d animais: %s.", fazenda.Nome, len(animais), strings.Join(parts, "; "))
	}
	slog.Info("Animais listados via assistente", "fazenda_id", fazenda.ID, "fazenda_nome", fazenda.Nome, "count", len(animais))
	return map[string]interface{}{
		"message":      msg,
		"animais":      animais,
		"fazenda_nome": fazenda.Nome,
		"fazenda_id":   fazenda.ID,
	}, nil
}

func strOrEmpty(s *string) string {
	if s == nil || *s == "" {
		return "—"
	}
	return *s
}

func (s *AssistenteService) executarDetalharAnimal(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	if idNum, ok := payload["id"].(float64); ok && idNum > 0 {
		id := int64(idNum)
		animal, err := s.animalSvc.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("animal com ID %d não encontrado", id)
		}
		msg := formatAnimalMessage(animal)
		slog.Info("Animal detalhado via assistente", "animal_id", animal.ID, "identificacao", animal.Identificacao)
		return map[string]interface{}{
			"message": msg,
			"animal":  animal,
		}, nil
	}
	identificacao, ok := payload["identificacao"].(string)
	if !ok || strings.TrimSpace(identificacao) == "" {
		return nil, fmt.Errorf("informe o id ou a identificação do animal")
	}
	list, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(identificacao))
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_detalhar_animal"}, nil)
		return nil, fmt.Errorf("erro ao buscar animal: %w", err)
	}
	if len(list) == 0 {
		return nil, fmt.Errorf("nenhum animal encontrado com a identificação \"%s\"", identificacao)
	}
	if len(list) > 1 {
		return nil, fmt.Errorf("mais de um animal encontrado com \"%s\"; use o ID para identificar", identificacao)
	}
	animal := list[0]
	msg := formatAnimalMessage(animal)
	slog.Info("Animal detalhado via assistente", "animal_id", animal.ID, "identificacao", animal.Identificacao)
	return map[string]interface{}{
		"message": msg,
		"animal":  animal,
	}, nil
}

func formatAnimalMessage(a *models.Animal) string {
	nasc := "—"
	if a.DataNascimento != nil {
		nasc = a.DataNascimento.Format("02/01/2006")
	}
	return fmt.Sprintf("Animal: identificação %s, raça %s, nascimento %s, sexo %s, status de saúde %s.",
		a.Identificacao, strOrEmpty(a.Raca), nasc, strOrEmpty(a.Sexo), strOrEmpty(a.StatusSaude))
}

// resolveAnimalByPayload retorna o animal identificado por id ou identificacao no payload.
func (s *AssistenteService) resolveAnimalByPayload(ctx context.Context, payload map[string]interface{}) (*models.Animal, error) {
	if idNum, ok := payload["id"].(float64); ok && idNum > 0 {
		id := int64(idNum)
		a, err := s.animalSvc.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("animal com ID %d não encontrado", id)
		}
		return a, nil
	}
	if ident, ok := payload["identificacao"].(string); ok && strings.TrimSpace(ident) != "" {
		list, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(ident))
		if err != nil {
			return nil, fmt.Errorf("erro ao buscar animal por identificação: %w", err)
		}
		if len(list) == 0 {
			return nil, fmt.Errorf("nenhum animal encontrado com a identificação \"%s\"", ident)
		}
		if len(list) > 1 {
			return nil, fmt.Errorf("mais de um animal encontrado com \"%s\"; use o ID para identificar", ident)
		}
		return list[0], nil
	}
	return nil, fmt.Errorf("informe o id ou a identificação do animal")
}

func (s *AssistenteService) executarCadastrarAnimal(ctx context.Context, payload map[string]interface{}, userID int64) (map[string]interface{}, error) {
	fazenda, err := s.resolveFazendaForUser(ctx, payload, userID, "fazenda_id", "nome_fazenda")
	if err != nil {
		return nil, err
	}
	fazendaID := fazenda.ID
	identificacao, _ := payload["identificacao"].(string)
	identificacao = strings.TrimSpace(identificacao)
	if identificacao == "" {
		return nil, fmt.Errorf("identificação do animal é obrigatória")
	}
	animal := &models.Animal{
		FazendaID:     fazendaID,
		Identificacao: identificacao,
	}
	if v, ok := payload["raca"].(string); ok && strings.TrimSpace(v) != "" {
		s := strings.TrimSpace(v)
		animal.Raca = &s
	}
	if v, ok := payload["data_nascimento"].(string); ok && strings.TrimSpace(v) != "" {
		t, err := parseFundacaoAssistente(strings.TrimSpace(v))
		if err != nil {
			slog.Warn("Data de nascimento inválida no assistente cadastrar animal", "value", v, "error", err)
		} else if t != nil {
			animal.DataNascimento = t
		}
	}
	if v, ok := payload["sexo"].(string); ok && strings.TrimSpace(v) != "" {
		s := strings.TrimSpace(strings.ToUpper(v))
		if s == "M" || s == "F" {
			animal.Sexo = &s
		}
	}
	if v, ok := payload["status_saude"].(string); ok && strings.TrimSpace(v) != "" {
		s := strings.TrimSpace(strings.ToUpper(v))
		if models.IsValidStatusSaude(s) {
			animal.StatusSaude = &s
		}
	}
	if animal.StatusSaude == nil {
		defaultStatus := models.StatusSaudavel
		animal.StatusSaude = &defaultStatus
	}
	if err := s.animalSvc.Create(ctx, animal); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_cadastrar_animal"}, nil)
		return nil, fmt.Errorf("erro ao cadastrar animal: %w", err)
	}
	slog.Info("Animal cadastrado via assistente", "animal_id", animal.ID, "identificacao", animal.Identificacao)
	msg := fmt.Sprintf("Animal \"%s\" cadastrado com sucesso na fazenda.", animal.Identificacao)
	return map[string]interface{}{"message": msg, "animal": animal}, nil
}

func (s *AssistenteService) executarEditarAnimal(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	animal, err := s.resolveAnimalByPayload(ctx, payload)
	if err != nil {
		return nil, err
	}
	if animal.ID <= 0 {
		return nil, fmt.Errorf("animal resolvido sem ID válido")
	}
	if v, ok := payload["identificacaoNovo"].(string); ok && strings.TrimSpace(v) != "" {
		animal.Identificacao = strings.TrimSpace(v)
	}
	if v, ok := payload["raca"].(string); ok {
		s := strings.TrimSpace(v)
		if s == "" {
			animal.Raca = nil
		} else {
			animal.Raca = &s
		}
	}
	if v, ok := payload["data_nascimento"].(string); ok && strings.TrimSpace(v) != "" {
		t, err := parseFundacaoAssistente(strings.TrimSpace(v))
		if err != nil {
			slog.Warn("Data de nascimento inválida no assistente editar animal", "value", v, "error", err)
		} else if t != nil {
			animal.DataNascimento = t
		}
	}
	if v, ok := payload["sexo"].(string); ok {
		s := strings.TrimSpace(strings.ToUpper(v))
		if s == "" {
			animal.Sexo = nil
		} else if s == "M" || s == "F" {
			animal.Sexo = &s
		}
	}
	if v, ok := payload["status_saude"].(string); ok {
		s := strings.TrimSpace(strings.ToUpper(v))
		if s == "" {
			animal.StatusSaude = nil
		} else if models.IsValidStatusSaude(s) {
			animal.StatusSaude = &s
		}
	}
	if animal.StatusSaude == nil {
		defaultStatus := models.StatusSaudavel
		animal.StatusSaude = &defaultStatus
	}
	if idNum, ok := payload["fazenda_id"].(float64); ok && idNum > 0 {
		animal.FazendaID = int64(idNum)
	}
	if err := s.animalSvc.Update(ctx, animal); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_editar_animal"}, nil)
		return nil, fmt.Errorf("erro ao atualizar animal: %w", err)
	}
	slog.Info("Animal editado via assistente", "animal_id", animal.ID, "identificacao", animal.Identificacao)
	msg := fmt.Sprintf("Animal \"%s\" atualizado com sucesso.", animal.Identificacao)
	return map[string]interface{}{"message": msg, "animal": animal}, nil
}

func (s *AssistenteService) executarExcluirAnimal(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	animal, err := s.resolveAnimalByPayload(ctx, payload)
	if err != nil {
		return nil, err
	}
	id := animal.ID
	identificacao := animal.Identificacao
	if err := s.animalSvc.Delete(ctx, id); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_excluir_animal"}, nil)
		return nil, fmt.Errorf("erro ao excluir animal: %w", err)
	}
	slog.Info("Animal excluído via assistente", "animal_id", id, "identificacao", identificacao)
	msg := fmt.Sprintf("Animal \"%s\" excluído com sucesso.", identificacao)
	return map[string]interface{}{"message": msg, "id": id}, nil
}

func (s *AssistenteService) executarRegistrarProducaoAnimal(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	animal, err := s.resolveAnimalByPayload(ctx, payload)
	if err != nil {
		return nil, err
	}
	quantidade := 0.0
	switch v := payload["quantidade"].(type) {
	case float64:
		quantidade = v
	case int:
		quantidade = float64(v)
	}
	if quantidade <= 0 {
		return nil, fmt.Errorf("informe a quantidade de litros (maior que zero)")
	}
	producao := &models.ProducaoLeite{
		AnimalID:   animal.ID,
		Quantidade: quantidade,
		DataHora:   time.Now(),
	}
	if v, ok := payload["data_hora"].(string); ok && strings.TrimSpace(v) != "" {
		t, err := time.Parse(time.RFC3339, strings.TrimSpace(v))
		if err != nil {
			t, err = time.Parse("2006-01-02T15:04:05", strings.TrimSpace(v))
		}
		if err == nil {
			producao.DataHora = t
		}
	}
	if v, ok := payload["qualidade"].(float64); ok && v >= 1 && v <= 10 {
		q := int(v)
		producao.Qualidade = &q
	} else if v, ok := payload["qualidade"].(int); ok && v >= 1 && v <= 10 {
		producao.Qualidade = &v
	}
	if err := s.producaoSvc.Create(ctx, producao); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_registrar_producao_animal"}, nil)
		return nil, fmt.Errorf("erro ao registrar produção: %w", err)
	}
	slog.Info("Produção registrada via assistente", "producao_id", producao.ID, "animal_id", animal.ID, "quantidade", quantidade)
	msg := fmt.Sprintf("Produção de %.1f litros registrada para o animal \"%s\".", quantidade, animal.Identificacao)
	return map[string]interface{}{
		"message":   msg,
		"animal_id": animal.ID,
		"producao":  producao,
	}, nil
}

// resolveFazendaForUser retorna a fazenda identificada por id ou nome no payload, validando que pertence ao usuário.
// keyID e keyNome são as chaves do payload (ex.: "fazenda_id"/"nome_fazenda" para cadastrar_animal, "id"/"nome" para listar/consultar).
// Se o payload não tiver id nem nome e o usuário tiver exatamente uma fazenda vinculada, retorna essa fazenda.
func (s *AssistenteService) resolveFazendaForUser(ctx context.Context, payload map[string]interface{}, userID int64, keyID, keyNome string) (*models.Fazenda, error) {
	userFazendas, err := s.fazendaSvc.GetByUsuarioID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar fazendas do usuário: %w", err)
	}

	var payloadID int64
	if v, ok := payload[keyID].(float64); ok && v > 0 {
		payloadID = int64(v)
	}
	nomeVal, _ := payload[keyNome].(string)
	nomeVal = strings.TrimSpace(nomeVal)

	if payloadID > 0 {
		for _, f := range userFazendas {
			if f.ID == payloadID {
				return f, nil
			}
		}
		return nil, fmt.Errorf("fazenda não encontrada ou você não tem acesso a ela")
	}

	if nomeVal != "" {
		list, err := s.fazendaSvc.SearchByNome(ctx, nomeVal)
		if err != nil {
			return nil, fmt.Errorf("erro ao buscar fazenda por nome: %w", err)
		}
		var match *models.Fazenda
		for _, f := range list {
			for _, uf := range userFazendas {
				if uf.ID == f.ID {
					if match != nil {
						return nil, fmt.Errorf("mais de uma fazenda com nome parecido; use o ID para identificar")
					}
					match = f
					break
				}
			}
		}
		if match != nil {
			return match, nil
		}
		return nil, fmt.Errorf("nenhuma fazenda encontrada com o nome \"%s\" ou você não tem acesso a ela", nomeVal)
	}

	if len(userFazendas) == 1 {
		return userFazendas[0], nil
	}
	return nil, fmt.Errorf("informe o id ou o nome da fazenda")
}

// resolveFazendaByPayload retorna a fazenda identificada por id ou nome no payload.
func (s *AssistenteService) resolveFazendaByPayload(ctx context.Context, payload map[string]interface{}) (*models.Fazenda, error) {
	if idNum, ok := payload["id"].(float64); ok && idNum > 0 {
		id := int64(idNum)
		f, err := s.fazendaSvc.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("fazenda com ID %d não encontrada", id)
		}
		return f, nil
	}
	if nome, ok := payload["nome"].(string); ok && strings.TrimSpace(nome) != "" {
		list, err := s.fazendaSvc.SearchByNome(ctx, strings.TrimSpace(nome))
		if err != nil {
			return nil, fmt.Errorf("erro ao buscar fazenda por nome: %w", err)
		}
		if len(list) == 0 {
			return nil, fmt.Errorf("nenhuma fazenda encontrada com o nome \"%s\"", nome)
		}
		if len(list) > 1 {
			return nil, fmt.Errorf("mais de uma fazenda com nome parecido; use o ID para identificar")
		}
		return list[0], nil
	}
	return nil, fmt.Errorf("informe o id ou o nome da fazenda")
}

func (s *AssistenteService) executarEditarFazenda(ctx context.Context, payload map[string]interface{}) (*models.Fazenda, error) {
	fazenda, err := s.resolveFazendaByPayload(ctx, payload)
	if err != nil {
		return nil, err
	}
	if fazenda.ID <= 0 {
		return nil, fmt.Errorf("fazenda resolvida sem ID válido")
	}

	slog.Info("Assistente editar: fazenda resolvida", "id", fazenda.ID, "nome_atual", fazenda.Nome, "payload", payload)

	// Aplicar alterações do payload (campos opcionais)
	// Nome novo: use nomeNovo quando o usuário pedir para renomear; senão use nome apenas se identificou por id (payload tem id e nome = novo nome).
	if v, ok := payload["nomeNovo"].(string); ok && strings.TrimSpace(v) != "" {
		fazenda.Nome = strings.TrimSpace(v)
	} else if _, byID := payload["id"].(float64); byID {
		if v, ok := payload["nome"].(string); ok && strings.TrimSpace(v) != "" {
			fazenda.Nome = strings.TrimSpace(v)
		}
	}
	if v, ok := payload["quantidadeVacas"]; ok {
		switch n := v.(type) {
		case float64:
			fazenda.QuantidadeVacas = int(n)
		case int:
			fazenda.QuantidadeVacas = n
		}
	}
	if fazenda.QuantidadeVacas < 0 {
		fazenda.QuantidadeVacas = 0
	}
	if v, ok := payload["localizacao"].(string); ok {
		s := strings.TrimSpace(v)
		if s == "" {
			fazenda.Localizacao = nil
		} else {
			fazenda.Localizacao = &s
		}
	}
	if v, ok := payload["fundacao"].(string); ok && strings.TrimSpace(v) != "" {
		t, err := parseFundacaoAssistente(strings.TrimSpace(v))
		if err != nil {
			slog.Warn("Data de fundação inválida no assistente editar", "value", v, "error", err)
		} else if t != nil {
			fazenda.Fundacao = t
		}
	}

	if err := s.fazendaSvc.Update(ctx, fazenda); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_editar_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao atualizar fazenda: %w", err)
	}
	slog.Info("Fazenda editada via assistente", "fazenda_id", fazenda.ID, "nome", fazenda.Nome)
	return fazenda, nil
}

func (s *AssistenteService) executarExcluirFazenda(ctx context.Context, payload map[string]interface{}) (interface{}, error) {
	fazenda, err := s.resolveFazendaByPayload(ctx, payload)
	if err != nil {
		return nil, err
	}
	id := fazenda.ID
	nome := fazenda.Nome
	if err := s.fazendaSvc.Delete(ctx, id); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_excluir_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao excluir fazenda: %w", err)
	}
	slog.Info("Fazenda excluída via assistente", "fazenda_id", id, "nome", nome)
	return map[string]interface{}{"message": "Fazenda excluída com sucesso", "id": id}, nil
}

// parseFundacaoAssistente aceita "1998" ou "1998-01-01" e retorna *time.Time.
func parseFundacaoAssistente(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	// Apenas ano
	if regexp.MustCompile(`^\d{4}$`).MatchString(s) {
		t, err := time.Parse("2006", s)
		if err != nil {
			return nil, err
		}
		return &t, nil
	}
	// Data completa
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func cleanJSONResponse(text string) string {
	text = strings.TrimSpace(text)
	if strings.HasPrefix(text, "```json") {
		text = strings.TrimPrefix(text, "```json")
	}
	if strings.HasPrefix(text, "```") {
		text = strings.TrimPrefix(text, "```")
	}
	if strings.HasSuffix(text, "```") {
		text = strings.TrimSuffix(text, "```")
	}
	return strings.TrimSpace(text)
}
