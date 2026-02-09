package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/google/generative-ai-go/genai"
	"github.com/gorilla/websocket"
	"google.golang.org/api/option"
)

// AssistenteLiveService gerencia a interação em tempo real com o Gemini Multimodal Live.
type AssistenteLiveService struct {
	geminiAPIKey string
	geminiModel  string
	fazendaSvc   *FazendaService
	animalSvc    *AnimalService
	producaoSvc  *ProducaoService
	client       *genai.Client
}

func NewAssistenteLiveService(geminiAPIKey, geminiModel string, fazendaSvc *FazendaService, animalSvc *AnimalService, producaoSvc *ProducaoService) (*AssistenteLiveService, error) {
	if geminiModel == "" {
		geminiModel = "gemini-2.0-flash" // Modelo que suporta Live API
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(geminiAPIKey))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cliente Gemini: %w", err)
	}

	return &AssistenteLiveService{
		geminiAPIKey: geminiAPIKey,
		geminiModel:  geminiModel,
		fazendaSvc:   fazendaSvc,
		animalSvc:    animalSvc,
		producaoSvc:  producaoSvc,
		client:       client,
	}, nil
}

// Session representa uma sessão ativa de conversação live.
type Session struct {
	ctx          context.Context
	cancel       context.CancelFunc
	model        *genai.GenerativeModel
	session      *genai.ChatSession
	UserID       int64
	Perfil       string
	NomeUsuario  string
	FazendaAtiva int64
	mu           sync.Mutex
	wsMu         sync.Mutex // Mutex para proteger a escrita no WebSocket
}

// StartSession inicia uma nova sessão de chat com o Gemini.
func (s *AssistenteLiveService) StartSession(ctx context.Context, userID int64, perfil, nomeUsuario string, fazendaAtiva int64) (*Session, error) {
	if s.geminiAPIKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY não configurada")
	}
	model := s.client.GenerativeModel(s.geminiModel)

	// Configurar ferramentas (Function Calling)
	model.Tools = []*genai.Tool{
		{
			FunctionDeclarations: s.getFunctionDeclarations(),
		},
	}

	// Buscar nome da fazenda ativa se houver
	fazendaAtivaMsg := "Nenhuma fazenda selecionada no momento."
	if fazendaAtiva > 0 {
		if f, err := s.fazendaSvc.GetByID(ctx, fazendaAtiva); err == nil && f != nil {
			fazendaAtivaMsg = fmt.Sprintf("A fazenda ativa selecionada pelo usuário é: %s (ID: %d). Use-a como contexto padrão para consultas de animais e produção se o usuário não especificar outra.", f.Nome, f.ID)
		}
	}

	// Prompt do sistema para definir a personalidade
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(fmt.Sprintf(`Você é o assistente técnico do CeialMilk.
DIRETRIZ CRÍTICA: Você não tem acesso direto ao banco de dados, exceto através das funções fornecidas.
Sempre que o usuário perguntar sobre fazendas, animais ou produção, você DEVE OBRIGATORIAMENTE chamar a função correspondente antes de responder.
NUNCA diga que o usuário não tem dados sem antes tentar listar_fazendas().
A função listar_animais retorna, para cada animal, identificação, raça e data de nascimento (Nascimento: YYYY-MM-DD ou "não informada"). Use esses dados para responder perguntas como "qual o animal mais novo", "qual o mais velho" ou "idade dos animais".

Contexto do Usuário:
- Nome: %s
- ID: %d
- Perfil: %s
- %s

Responda de forma natural, empática e concisa.`, nomeUsuario, userID, perfil, fazendaAtivaMsg)),
		},
	}

	session := model.StartChat()

	ctx, cancel := context.WithCancel(ctx)
	return &Session{
		ctx:          ctx,
		cancel:       cancel,
		model:        model,
		session:      session,
		UserID:       userID,
		Perfil:       perfil,
		NomeUsuario:  nomeUsuario,
		FazendaAtiva: fazendaAtiva,
	}, nil
}

// SendMessage é um helper para enviar mensagens na sessão do Gemini.
func (s *Session) SendMessage(ctx context.Context, parts ...genai.Part) (*genai.GenerateContentResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.session.SendMessage(ctx, parts...)
}

// WriteWSJSON envia um JSON via WebSocket de forma segura (thread-safe).
func (s *Session) WriteWSJSON(ws *websocket.Conn, v interface{}) error {
	s.wsMu.Lock()
	defer s.wsMu.Unlock()
	return ws.WriteJSON(v)
}

// WriteWSMessage envia uma mensagem bruta via WebSocket de forma segura (thread-safe).
func (s *Session) WriteWSMessage(ws *websocket.Conn, messageType int, data []byte) error {
	s.wsMu.Lock()
	defer s.wsMu.Unlock()
	return ws.WriteMessage(messageType, data)
}

func (s *AssistenteLiveService) getFunctionDeclarations() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{
			Name:        "listar_fazendas",
			Description: "Lista todas as fazendas vinculadas ao usuário.",
		},
		{
			Name:        "cadastrar_fazenda",
			Description: "Cadastra uma nova fazenda no sistema.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"nome":            {Type: genai.TypeString, Description: "Nome da fazenda"},
					"quantidadeVacas": {Type: genai.TypeInteger, Description: "Quantidade inicial de vacas"},
					"localizacao":     {Type: genai.TypeString, Description: "Localização da fazenda (opcional)"},
					"fundacao":        {Type: genai.TypeString, Description: "Data de fundação (YYYY-MM-DD)"},
				},
				Required: []string{"nome"},
			},
		},
		{
			Name:        "listar_animais",
			Description: "Lista os animais de uma fazenda específica, com identificação, raça e data de nascimento. Use para perguntas como 'qual o animal mais novo', 'qual o mais velho', 'quantos animais', 'listar animais da fazenda'.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"fazenda_id":   {Type: genai.TypeInteger, Description: "ID da fazenda (se não informado, usa a ativa)"},
					"nome_fazenda": {Type: genai.TypeString, Description: "Nome da fazenda (alternativa ao ID)"},
				},
			},
		},
		{
			Name:        "cadastrar_animal",
			Description: "Cadastra um novo animal em uma fazenda.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação única do animal (brinco, nome)"},
					"fazenda_id":    {Type: genai.TypeInteger, Description: "ID da fazenda"},
					"raca":          {Type: genai.TypeString, Description: "Raça do animal"},
					"sexo":          {Type: genai.TypeString, Description: "Sexo (M ou F)"},
				},
				Required: []string{"identificacao", "fazenda_id"},
			},
		},
		{
			Name:        "registrar_producao",
			Description: "Registra a produção de leite de um animal.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação do animal"},
					"quantidade":    {Type: genai.TypeNumber, Description: "Quantidade de leite em litros"},
				},
				Required: []string{"identificacao", "quantidade"},
			},
		},
		{
			Name:        "buscar_fazenda",
			Description: "Busca uma fazenda específica pelo nome.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"nome": {Type: genai.TypeString, Description: "Nome ou parte do nome da fazenda"},
				},
				Required: []string{"nome"},
			},
		},
		{
			Name:        "detalhar_animal",
			Description: "Mostra detalhes de um animal específico.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação do animal"},
				},
				Required: []string{"identificacao"},
			},
		},
		{
			Name:        "excluir_animal",
			Description: "Remove um animal do sistema.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação do animal"},
				},
				Required: []string{"identificacao"},
			},
		},
		{
			Name:        "finalizar_conversa",
			Description: "Fecha o assistente e encerra a conversa atual quando o usuário se despede ou pede para sair.",
		},
		{
			Name:        "editar_animal",
			Description: "Altera dados de um animal existente: identificação/nome, raça, data de nascimento, sexo, status de saúde ou transferir para outra fazenda.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao":      {Type: genai.TypeString, Description: "Identificação ATUAL do animal para localizá-lo"},
					"identificacaoNovo":  {Type: genai.TypeString, Description: "Nova identificação/nome (se desejar renomear)"},
					"raca":               {Type: genai.TypeString, Description: "Nova raça"},
					"data_nascimento":    {Type: genai.TypeString, Description: "Nova data de nascimento (YYYY-MM-DD ou apenas YYYY)"},
					"sexo":               {Type: genai.TypeString, Description: "Novo sexo (M ou F)"},
					"status_saude":       {Type: genai.TypeString, Description: "Novo status (SAUDAVEL, DOENTE, EM_TRATAMENTO)"},
					"fazenda_id":         {Type: genai.TypeInteger, Description: "ID da fazenda para transferir o animal (trocar de fazenda)"},
				},
				Required: []string{"identificacao"},
			},
		},
		{
			Name:        "editar_fazenda",
			Description: "Altera dados de uma fazenda existente.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"id":               {Type: genai.TypeInteger, Description: "ID da fazenda"},
					"nome":             {Type: genai.TypeString, Description: "Nome atual ou novo nome"},
					"quantidadeVacas":  {Type: genai.TypeInteger, Description: "Nova quantidade de vacas"},
					"localizacao":      {Type: genai.TypeString, Description: "Nova localização"},
				},
			},
		},
	}
}

// ExecuteFunction executa a lógica de negócio baseada na chamada de função do Gemini.
func (s *AssistenteLiveService) ExecuteFunction(ctx context.Context, call genai.FunctionCall, userID int64, fazendaAtivaID int64) (interface{}, error) {
	slog.Info("Assistente Live: executando função", "name", call.Name, "args", call.Args, "user_id", userID)

	switch call.Name {
	case "listar_fazendas":
		fazendas, err := s.fazendaSvc.GetByUsuarioID(ctx, userID)
		if err != nil {
			return nil, err
		}
		slog.Info("Assistente Live: fazendas encontradas", "count", len(fazendas))

		// Se não houver fazendas, retornar uma string simples em um mapa
		if len(fazendas) == 0 {
			return map[string]any{"status": "nenhuma fazenda encontrada"}, nil
		}

		// Para evitar erros de Protocol Buffers com slices complexos,
		// vamos retornar apenas os nomes e IDs das fazendas como uma string formatada
		var resumo strings.Builder
		resumo.WriteString("Fazendas encontradas: ")
		for i, f := range fazendas {
			if i > 0 {
				resumo.WriteString(", ")
			}
			resumo.WriteString(fmt.Sprintf("%s (ID: %d)", f.Nome, f.ID))
		}

		return map[string]any{"lista_fazendas": resumo.String()}, nil

	case "cadastrar_fazenda":
		var f models.Fazenda
		data, _ := json.Marshal(call.Args)
		json.Unmarshal(data, &f)
		err := s.fazendaSvc.Create(ctx, &f)
		return f, err

	case "listar_animais":
		// Lógica simplificada de resolução de fazenda
		fID := fazendaAtivaID
		if v, ok := call.Args["fazenda_id"].(float64); ok && v > 0 {
			fID = int64(v)
		}

		// Se ainda não tem fID, tentar buscar pelo nome se fornecido
		if fID <= 0 {
			if nome, ok := call.Args["nome_fazenda"].(string); ok && nome != "" {
				fazendas, _ := s.fazendaSvc.SearchByNome(ctx, nome)
				if len(fazendas) > 0 {
					fID = fazendas[0].ID
				}
			}
		}

		if fID <= 0 {
			return map[string]any{"erro": "Por favor, especifique a fazenda ou selecione uma no sistema."}, nil
		}

		animais, err := s.animalSvc.GetByFazendaID(ctx, fID)
		if err != nil {
			return nil, err
		}

		if len(animais) == 0 {
			return map[string]any{"status": "nenhum animal encontrado nesta fazenda"}, nil
		}

		var resumo strings.Builder
		resumo.WriteString(fmt.Sprintf("Animais encontrados (%d): ", len(animais)))
		for i, a := range animais {
			if i > 0 {
				resumo.WriteString("; ")
			}
			nasc := "não informada"
			if a.DataNascimento != nil {
				nasc = a.DataNascimento.Format("2006-01-02")
			}
			resumo.WriteString(fmt.Sprintf("%s (Raça: %s, Nascimento: %s)", a.Identificacao, strOrEmpty(a.Raca), nasc))
		}
		return map[string]any{"lista_animais": resumo.String()}, nil

	case "cadastrar_animal":
		var a models.Animal
		data, _ := json.Marshal(call.Args)
		json.Unmarshal(data, &a)

		// Garantir fazenda_id se não informado mas houver ativa
		if a.FazendaID <= 0 {
			a.FazendaID = fazendaAtivaID
		}

		if a.FazendaID <= 0 {
			return map[string]any{"erro": "Por favor, especifique em qual fazenda cadastrar o animal."}, nil
		}

		err := s.animalSvc.Create(ctx, &a)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"status":        "sucesso",
			"mensagem":      "Animal cadastrado com sucesso",
			"identificacao": a.Identificacao,
		}, nil

	case "registrar_producao":
		ident, _ := call.Args["identificacao"].(string)
		quant, _ := call.Args["quantidade"].(float64)

		// Buscar animal por identificação
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, ident)
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal não encontrado"}, nil
		}

		producao := &models.ProducaoLeite{
			AnimalID:   animais[0].ID,
			Quantidade: quant,
			DataHora:   time.Now(),
		}
		err = s.producaoSvc.Create(ctx, producao)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"status":     "sucesso",
			"mensagem":   "Produção registrada com sucesso",
			"animal":     ident,
			"quantidade": quant,
		}, nil

	case "buscar_fazenda":
		nome, _ := call.Args["nome"].(string)
		fazendas, err := s.fazendaSvc.SearchByNome(ctx, nome)
		if err != nil {
			return nil, err
		}
		if len(fazendas) == 0 {
			return map[string]any{"status": "nenhuma fazenda encontrada"}, nil
		}
		var resumo strings.Builder
		for i, f := range fazendas {
			if i > 0 {
				resumo.WriteString("; ")
			}
			resumo.WriteString(fmt.Sprintf("%s (ID: %d, Local: %s)", f.Nome, f.ID, strOrEmpty(f.Localizacao)))
		}
		return map[string]any{"resultado_busca": resumo.String()}, nil

	case "detalhar_animal":
		ident, _ := call.Args["identificacao"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, ident)
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal não encontrado"}, nil
		}
		a := animais[0]
		return map[string]any{
			"identificacao":   a.Identificacao,
			"raca":            strOrEmpty(a.Raca),
			"sexo":            sexoParaExibicao(a.Sexo),
			"status_saude":    strOrEmpty(a.StatusSaude),
			"data_nascimento": timeToStr(a.DataNascimento),
		}, nil

	case "excluir_animal":
		ident, _ := call.Args["identificacao"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, ident)
		if err != nil || len(animais) == 0 {
			return nil, fmt.Errorf("animal não encontrado")
		}
		err = s.animalSvc.Delete(ctx, animais[0].ID)
		return map[string]any{"message": "Animal excluído com sucesso"}, err

	case "finalizar_conversa":
		return map[string]any{"status": "encerrar", "mensagem": "Até logo! O assistente será fechado."}, nil

	case "editar_animal":
		ident, _ := call.Args["identificacao"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, ident)
		if err != nil || len(animais) == 0 {
			return nil, fmt.Errorf("animal não encontrado")
		}
		a := animais[0]

		if v, ok := call.Args["identificacaoNovo"].(string); ok && strings.TrimSpace(v) != "" {
			a.Identificacao = strings.TrimSpace(v)
		}
		if v, ok := call.Args["raca"].(string); ok {
			s := strings.TrimSpace(v)
			if s == "" {
				a.Raca = nil
			} else {
				a.Raca = &s
			}
		}
		if v, ok := call.Args["data_nascimento"].(string); ok && strings.TrimSpace(v) != "" {
			t, errParse := parseFundacaoAssistente(strings.TrimSpace(v))
			if errParse != nil {
				slog.Warn("Data de nascimento inválida no assistente Live editar animal", "value", v, "error", errParse)
			} else if t != nil {
				a.DataNascimento = t
			}
		}
		if v, ok := call.Args["sexo"].(string); ok {
			s := strings.TrimSpace(v)
			if s == "" {
				a.Sexo = nil
			} else if norm := normalizarSexoPayload(s); norm != "" {
				a.Sexo = &norm
			}
		}
		if v, ok := call.Args["status_saude"].(string); ok {
			s := strings.TrimSpace(strings.ToUpper(v))
			if s == "" {
				a.StatusSaude = nil
			} else if models.IsValidStatusSaude(s) {
				a.StatusSaude = &s
			}
		}
		if idNum, ok := call.Args["fazenda_id"].(float64); ok && idNum > 0 {
			a.FazendaID = int64(idNum)
		}

		errUpdateAnimal := s.animalSvc.Update(ctx, a)
		return map[string]any{"status": "sucesso", "mensagem": "Animal atualizado com sucesso", "animal": a.Identificacao}, errUpdateAnimal

	case "editar_fazenda":
		var f *models.Fazenda
		if id, ok := call.Args["id"].(float64); ok && id > 0 {
			f, _ = s.fazendaSvc.GetByID(ctx, int64(id))
		}
		if f == nil {
			if nome, ok := call.Args["nome"].(string); ok && nome != "" {
				list, _ := s.fazendaSvc.SearchByNome(ctx, nome)
				if len(list) > 0 {
					f = list[0]
				}
			}
		}

		if f == nil {
			return nil, fmt.Errorf("fazenda não encontrada")
		}

		if v, ok := call.Args["nome"].(string); ok && v != "" {
			f.Nome = v
		}
		if v, ok := call.Args["quantidadeVacas"].(float64); ok {
			f.QuantidadeVacas = int(v)
		}
		if v, ok := call.Args["localizacao"].(string); ok {
			f.Localizacao = &v
		}

		errUpdate := s.fazendaSvc.Update(ctx, f)
		return map[string]any{"status": "sucesso", "mensagem": "Fazenda atualizada com sucesso", "fazenda": f.Nome}, errUpdate

	default:
		return nil, fmt.Errorf("função não implementada: %s", call.Name)
	}
}

// timeToStr converte *time.Time em valor serializável para o Gemini (proto Struct não aceita time.Time).
func timeToStr(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return t.Format(time.RFC3339)
}
