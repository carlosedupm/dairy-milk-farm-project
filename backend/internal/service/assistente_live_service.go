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
	geminiAPIKey        string
	geminiModel         string
	fazendaSvc          *FazendaService
	animalSvc           *AnimalService
	producaoSvc         *ProducaoService
	loteSvc             *LoteService
	cioSvc              *CioService
	coberturaSvc        *CoberturaService
	diagnosticoGestSvc  *DiagnosticoGestacaoService
	gestacaoSvc         *GestacaoService
	partoSvc            *PartoService
	secagemSvc          *SecagemService
	lactacaoSvc         *LactacaoService
	movimentacaoLoteSvc *MovimentacaoLoteService
	client              *genai.Client
}

func NewAssistenteLiveService(
	geminiAPIKey, geminiModel string,
	fazendaSvc *FazendaService, animalSvc *AnimalService, producaoSvc *ProducaoService,
	loteSvc *LoteService, cioSvc *CioService, coberturaSvc *CoberturaService,
	diagnosticoGestSvc *DiagnosticoGestacaoService, gestacaoSvc *GestacaoService,
	partoSvc *PartoService, secagemSvc *SecagemService, lactacaoSvc *LactacaoService,
	movimentacaoLoteSvc *MovimentacaoLoteService,
) (*AssistenteLiveService, error) {
	if geminiModel == "" {
		geminiModel = "gemini-2.0-flash" // Modelo que suporta Live API
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(geminiAPIKey))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cliente Gemini: %w", err)
	}

	return &AssistenteLiveService{
		geminiAPIKey:        geminiAPIKey,
		geminiModel:         geminiModel,
		fazendaSvc:          fazendaSvc,
		animalSvc:           animalSvc,
		producaoSvc:         producaoSvc,
		loteSvc:             loteSvc,
		cioSvc:              cioSvc,
		coberturaSvc:        coberturaSvc,
		diagnosticoGestSvc:  diagnosticoGestSvc,
		gestacaoSvc:         gestacaoSvc,
		partoSvc:            partoSvc,
		secagemSvc:          secagemSvc,
		lactacaoSvc:         lactacaoSvc,
		movimentacaoLoteSvc: movimentacaoLoteSvc,
		client:              client,
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
	RedirectPath string // Tela sugerida ao fechar o assistente (ex.: /animais/5, /fazendas/1/animais)
	mu           sync.Mutex
	wsMu         sync.Mutex // Mutex para proteger a escrita no WebSocket
	turnMu       sync.Mutex
	turnID       uint64
	turnCtx      context.Context
	turnCancel   context.CancelFunc
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

Formato de resposta: use sempre texto puro. Não use markdown: não use asteriscos (*) para negrito nem qualquer outra formatação. Sua resposta será exibida como texto e também lida em voz (TTS); evite caracteres que soem mal quando falados.

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

// BeginTurn inicia um novo turno de conversa e cancela imediatamente o turno anterior (barge-in).
func (s *Session) BeginTurn() (context.Context, uint64) {
	s.turnMu.Lock()
	defer s.turnMu.Unlock()

	if s.turnCancel != nil {
		s.turnCancel()
		s.turnCancel = nil
	}

	baseCtx := s.ctx
	if baseCtx == nil {
		baseCtx = context.Background()
	}

	turnCtx, turnCancel := context.WithCancel(baseCtx)
	s.turnID++
	s.turnCtx = turnCtx
	s.turnCancel = turnCancel

	return turnCtx, s.turnID
}

// InterruptTurn cancela o turno atual, se existir.
func (s *Session) InterruptTurn() {
	s.turnMu.Lock()
	defer s.turnMu.Unlock()

	if s.turnCancel != nil {
		s.turnCancel()
	}
	s.turnCancel = nil
	s.turnCtx = nil
}

// IsTurnActive verifica se o turno informado ainda é o turno ativo da sessão.
func (s *Session) IsTurnActive(turnID uint64) bool {
	s.turnMu.Lock()
	if turnID == 0 || turnID != s.turnID || s.turnCtx == nil {
		s.turnMu.Unlock()
		return false
	}
	ctx := s.turnCtx
	s.turnMu.Unlock()

	select {
	case <-ctx.Done():
		return false
	default:
		return true
	}
}

// FinishTurn finaliza o turno se ele ainda for o atual.
func (s *Session) FinishTurn(turnID uint64) {
	s.turnMu.Lock()
	defer s.turnMu.Unlock()

	if turnID == 0 || turnID != s.turnID {
		return
	}
	if s.turnCancel != nil {
		s.turnCancel()
	}
	s.turnCancel = nil
	s.turnCtx = nil
}

// WriteWSJSONForTurn envia JSON apenas se o turno ainda estiver ativo.
func (s *Session) WriteWSJSONForTurn(ws *websocket.Conn, turnID uint64, v interface{}) error {
	if !s.IsTurnActive(turnID) {
		return nil
	}
	return s.WriteWSJSON(ws, v)
}

// WriteWSMessageForTurn envia mensagem bruta apenas se o turno ainda estiver ativo.
func (s *Session) WriteWSMessageForTurn(ws *websocket.Conn, turnID uint64, messageType int, data []byte) error {
	if !s.IsTurnActive(turnID) {
		return nil
	}
	return s.WriteWSMessage(ws, messageType, data)
}

// Close encerra a sessão e cancela recursos internos.
func (s *Session) Close() {
	s.InterruptTurn()
	if s.cancel != nil {
		s.cancel()
	}
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
			Description: "Cadastra um novo animal em uma fazenda. Use origem_aquisicao NASCIDO quando o animal nasceu na propriedade (exige data_nascimento) ou COMPRADO quando foi comprado (data_nascimento não necessária).",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao":     {Type: genai.TypeString, Description: "Identificação única do animal (brinco, nome)"},
					"fazenda_id":        {Type: genai.TypeInteger, Description: "ID da fazenda (se não informado, usa a ativa)"},
					"raca":              {Type: genai.TypeString, Description: "Raça do animal"},
					"origem_aquisicao":  {Type: genai.TypeString, Description: "NASCIDO (nascido na propriedade, exige data_nascimento) ou COMPRADO (comprado, data_nascimento não necessária)"},
					"data_nascimento":   {Type: genai.TypeString, Description: "Data de nascimento no formato YYYY-MM-DD ou apenas YYYY (obrigatória se origem_aquisicao for NASCIDO)"},
					"data_entrada":      {Type: genai.TypeString, Description: "Data de entrada na fazenda (útil para animais COMPRADOS, indica data de aquisição)"},
					"sexo":              {Type: genai.TypeString, Description: "Sexo (M ou F)"},
					"status_saude":      {Type: genai.TypeString, Description: "Status de saúde: SAUDAVEL, DOENTE ou EM_TRATAMENTO"},
				},
				Required: []string{"identificacao"},
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
					"identificacao":     {Type: genai.TypeString, Description: "Identificação ATUAL do animal para localizá-lo"},
					"identificacaoNovo": {Type: genai.TypeString, Description: "Nova identificação/nome (se desejar renomear)"},
					"raca":              {Type: genai.TypeString, Description: "Nova raça"},
					"data_nascimento":   {Type: genai.TypeString, Description: "Nova data de nascimento (YYYY-MM-DD ou apenas YYYY)"},
					"sexo":              {Type: genai.TypeString, Description: "Novo sexo (M ou F)"},
					"status_saude":      {Type: genai.TypeString, Description: "Novo status (SAUDAVEL, DOENTE, EM_TRATAMENTO)"},
					"fazenda_id":        {Type: genai.TypeInteger, Description: "ID da fazenda para transferir o animal (trocar de fazenda)"},
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
					"id":              {Type: genai.TypeInteger, Description: "ID da fazenda"},
					"nome":            {Type: genai.TypeString, Description: "Nome atual ou novo nome"},
					"quantidadeVacas": {Type: genai.TypeInteger, Description: "Nova quantidade de vacas"},
					"localizacao":     {Type: genai.TypeString, Description: "Nova localização"},
				},
			},
		},
		{
			Name:        "listar_lotes",
			Description: "Lista os lotes de uma fazenda. Use para 'quais lotes existem', 'listar lotes'.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
			},
		},
		{
			Name:        "cadastrar_lote",
			Description: "Cadastra um novo lote na fazenda.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"nome":      {Type: genai.TypeString, Description: "Nome do lote"},
					"tipo":      {Type: genai.TypeString, Description: "Tipo: LACTACAO, SECAS, MATERNIDADE, etc."},
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
				Required: []string{"nome"},
			},
		},
		{
			Name:        "registrar_cio",
			Description: "Registra a detecção de cio (estro) em uma fêmea.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação do animal (fêmea)"},
					"data_detectado": {Type: genai.TypeString, Description: "Data/hora em ISO (ex: 2025-02-13T08:00:00)"},
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
				Required: []string{"identificacao", "data_detectado"},
			},
		},
		{
			Name:        "registrar_cobertura",
			Description: "Registra cobertura/inseminação de uma fêmea. Quando o usuário informar a identificação do boi/touro, use touro_identificacao: o sistema trata como MONTA_NATURAL e vincula o reprodutor ao animal cadastrado. Para IA/IATF/TE use touro_info (nome do sêmen).",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao":       {Type: genai.TypeString, Description: "Identificação da fêmea coberta"},
					"touro_identificacao": {Type: genai.TypeString, Description: "Identificação do touro/boi que fez a cobertura — ao informar, é monta natural e o sistema vincula ao animal cadastrado"},
					"tipo":                {Type: genai.TypeString, Description: "IA, IATF, MONTA_NATURAL ou TE (inferido como MONTA_NATURAL quando touro_identificacao é informado)"},
					"data":                {Type: genai.TypeString, Description: "Data/hora em ISO"},
					"touro_animal_id":     {Type: genai.TypeInteger, Description: "ID do touro/boi (alternativa a touro_identificacao)"},
					"touro_info":          {Type: genai.TypeString, Description: "Nome/código do touro ou sêmen (para IA/IATF/TE)"},
					"fazenda_id":          {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
				Required: []string{"identificacao", "data"},
			},
		},
		{
			Name:        "registrar_toque",
			Description: "Registra toque (diagnóstico de gestação) - resultado POSITIVO, NEGATIVO ou INCONCLUSIVO.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação do animal"},
					"data": {Type: genai.TypeString, Description: "Data/hora em ISO"},
					"resultado": {Type: genai.TypeString, Description: "POSITIVO, NEGATIVO ou INCONCLUSIVO"},
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
				Required: []string{"identificacao", "data", "resultado"},
			},
		},
		{
			Name:        "listar_gestacoes",
			Description: "Lista gestações em andamento ou históricas da fazenda.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
			},
		},
		{
			Name:        "registrar_parto",
			Description: "Registra o parto de uma fêmea.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação da mãe"},
					"data": {Type: genai.TypeString, Description: "Data/hora do parto em ISO"},
					"numero_crias": {Type: genai.TypeInteger, Description: "Número de crias (default 1)"},
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
				Required: []string{"identificacao", "data"},
			},
		},
		{
			Name:        "registrar_secagem",
			Description: "Registra a secagem de uma vaca.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação do animal"},
					"data_secagem": {Type: genai.TypeString, Description: "Data da secagem (YYYY-MM-DD)"},
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
				Required: []string{"identificacao", "data_secagem"},
			},
		},
		{
			Name:        "listar_lactacoes",
			Description: "Lista lactações da fazenda.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"fazenda_id": {Type: genai.TypeInteger, Description: "ID da fazenda (usa a ativa se omitido)"},
				},
			},
		},
		{
			Name:        "movimentar_lote",
			Description: "Move um animal de um lote para outro.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"identificacao": {Type: genai.TypeString, Description: "Identificação do animal"},
					"lote_destino_id": {Type: genai.TypeInteger, Description: "ID do lote de destino"},
					"motivo": {Type: genai.TypeString, Description: "Motivo da movimentação (opcional)"},
				},
				Required: []string{"identificacao", "lote_destino_id"},
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

		return map[string]any{"lista_fazendas": resumo.String(), "redirect_path": "/fazendas"}, nil

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
		return map[string]any{"lista_animais": resumo.String(), "redirect_path": fmt.Sprintf("/fazendas/%d/animais", fID)}, nil

	case "cadastrar_animal":
		ident, _ := call.Args["identificacao"].(string)
		ident = strings.TrimSpace(ident)
		if ident == "" {
			return map[string]any{"erro": "Identificação do animal é obrigatória."}, nil
		}

		fazendaID := fazendaAtivaID
		if v, ok := call.Args["fazenda_id"].(float64); ok && v > 0 {
			fazendaID = int64(v)
		}
		if fazendaID <= 0 {
			return map[string]any{"erro": "Por favor, especifique em qual fazenda cadastrar o animal."}, nil
		}

		a := &models.Animal{
			FazendaID:     fazendaID,
			Identificacao: ident,
		}

		if v, ok := call.Args["origem_aquisicao"].(string); ok && strings.TrimSpace(v) != "" {
			s := strings.TrimSpace(strings.ToUpper(v))
			if models.IsValidOrigemAquisicao(s) {
				a.OrigemAquisicao = &s
			}
		}

		if v, ok := call.Args["raca"].(string); ok && strings.TrimSpace(v) != "" {
			s := strings.TrimSpace(v)
			a.Raca = &s
		}
		if v, ok := call.Args["data_nascimento"].(string); ok && strings.TrimSpace(v) != "" {
			t, errParse := parseFundacaoAssistente(strings.TrimSpace(v))
			if errParse != nil {
				slog.Warn("Data de nascimento inválida no assistente Live cadastrar animal", "value", v, "error", errParse)
			} else if t != nil {
				a.DataNascimento = t
			}
		}
		if v, ok := call.Args["data_entrada"].(string); ok && strings.TrimSpace(v) != "" {
			t, errParse := parseFundacaoAssistente(strings.TrimSpace(v))
			if errParse != nil {
				slog.Warn("Data de entrada inválida no assistente Live cadastrar animal", "value", v, "error", errParse)
			} else if t != nil {
				a.DataEntrada = t
			}
		}
		if v, ok := call.Args["sexo"].(string); ok && strings.TrimSpace(v) != "" {
			if norm := normalizarSexoPayload(strings.TrimSpace(v)); norm != "" {
				a.Sexo = &norm
			}
		}
		if v, ok := call.Args["status_saude"].(string); ok && strings.TrimSpace(v) != "" {
			s := strings.TrimSpace(strings.ToUpper(v))
			if models.IsValidStatusSaude(s) {
				a.StatusSaude = &s
			}
		}
		if a.StatusSaude == nil {
			defaultStatus := models.StatusSaudavel
			a.StatusSaude = &defaultStatus
		}

		err := s.animalSvc.Create(ctx, a)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"status":        "sucesso",
			"mensagem":      "Animal cadastrado com sucesso",
			"identificacao": a.Identificacao,
			"redirect_path": fmt.Sprintf("/animais/%d", a.ID),
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
			"status":        "sucesso",
			"mensagem":      "Produção registrada com sucesso",
			"animal":        ident,
			"quantidade":    quant,
			"redirect_path": fmt.Sprintf("/animais/%d", animais[0].ID),
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
		redirect := ""
		if len(fazendas) > 0 {
			redirect = fmt.Sprintf("/fazendas/%d", fazendas[0].ID)
		}
		return map[string]any{"resultado_busca": resumo.String(), "redirect_path": redirect}, nil

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
			"redirect_path":   fmt.Sprintf("/animais/%d", a.ID),
		}, nil

	case "excluir_animal":
		ident, _ := call.Args["identificacao"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, ident)
		if err != nil || len(animais) == 0 {
			return nil, fmt.Errorf("animal não encontrado")
		}
		animalID := animais[0].ID
		fazendaID := animais[0].FazendaID
		err = s.animalSvc.Delete(ctx, animalID)
		if err != nil {
			return nil, err
		}
		return map[string]any{"message": "Animal excluído com sucesso", "redirect_path": fmt.Sprintf("/fazendas/%d/animais", fazendaID)}, nil

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
		if errUpdateAnimal != nil {
			return nil, errUpdateAnimal
		}
		return map[string]any{"status": "sucesso", "mensagem": "Animal atualizado com sucesso", "animal": a.Identificacao, "redirect_path": fmt.Sprintf("/animais/%d", a.ID)}, nil

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

	case "listar_lotes":
		if s.loteSvc == nil {
			return map[string]any{"erro": "Serviço de lotes não disponível"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			return map[string]any{"erro": "Especifique a fazenda ou selecione uma no sistema."}, nil
		}
		lotes, err := s.loteSvc.GetByFazendaID(ctx, fID)
		if err != nil {
			return nil, err
		}
		if len(lotes) == 0 {
			return map[string]any{"status": "nenhum lote cadastrado"}, nil
		}
		var sb strings.Builder
		sb.WriteString(fmt.Sprintf("Lotes (%d): ", len(lotes)))
		for i, l := range lotes {
			if i > 0 {
				sb.WriteString("; ")
			}
			sb.WriteString(fmt.Sprintf("%s (ID: %d)", l.Nome, l.ID))
			if l.Tipo != nil && *l.Tipo != "" {
				sb.WriteString(fmt.Sprintf(" tipo=%s", *l.Tipo))
			}
		}
		return map[string]any{"lista_lotes": sb.String(), "redirect_path": "/lotes"}, nil

	case "cadastrar_lote":
		if s.loteSvc == nil {
			return map[string]any{"erro": "Serviço de lotes não disponível"}, nil
		}
		nome, _ := call.Args["nome"].(string)
		nome = strings.TrimSpace(nome)
		if nome == "" {
			return map[string]any{"erro": "Nome do lote é obrigatório."}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			return map[string]any{"erro": "Especifique a fazenda."}, nil
		}
		lote := &models.Lote{FazendaID: fID, Nome: nome}
		if v, ok := call.Args["tipo"].(string); ok && strings.TrimSpace(v) != "" {
			lote.Tipo = ptr(strings.TrimSpace(v))
		}
		err := s.loteSvc.Create(ctx, lote)
		if err != nil {
			return nil, err
		}
		return map[string]any{"status": "sucesso", "mensagem": "Lote criado", "lote": lote.Nome, "redirect_path": "/lotes"}, nil

	case "registrar_cio":
		if s.cioSvc == nil {
			return map[string]any{"erro": "Serviço de cios não disponível"}, nil
		}
		ident, _ := call.Args["identificacao"].(string)
		dataStr, _ := call.Args["data_detectado"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(ident))
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal não encontrado"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			fID = animais[0].FazendaID
		}
		t, errParse := time.Parse(time.RFC3339, dataStr)
		if errParse != nil {
			t, _ = time.Parse("2006-01-02T15:04:05", dataStr)
		}
		if errParse != nil {
			t = time.Now()
		}
		cio := &models.Cio{AnimalID: animais[0].ID, DataDetectado: t, FazendaID: fID}
		err = s.cioSvc.Create(ctx, cio)
		if err != nil {
			return nil, err
		}
		return map[string]any{"status": "sucesso", "mensagem": "Cio registrado", "redirect_path": "/gestao/cios"}, nil

	case "registrar_cobertura":
		if s.coberturaSvc == nil {
			return map[string]any{"erro": "Serviço de coberturas não disponível"}, nil
		}
		ident, _ := call.Args["identificacao"].(string)
		tipoCob, _ := call.Args["tipo"].(string)
		dataStr, _ := call.Args["data"].(string)
		touroIdent, _ := call.Args["touro_identificacao"].(string)
		touroIdent = strings.TrimSpace(touroIdent)

		animais, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(ident))
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal (fêmea) não encontrado"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			fID = animais[0].FazendaID
		}

		// Se usuário informou identificação do boi/touro: monta natural, buscar animal e vincular
		if touroIdent != "" {
			tipoCob = models.CoberturaTipoMontaNatural
			touros, errT := s.animalSvc.SearchByIdentificacao(ctx, touroIdent)
			if errT != nil || len(touros) == 0 {
				return map[string]any{"erro": "touro/boi não encontrado: " + touroIdent}, nil
			}
			var touro *models.Animal
			for _, a := range touros {
				if a.Sexo != nil && *a.Sexo == "M" && a.Categoria != nil &&
					(*a.Categoria == models.CategoriaTouro || *a.Categoria == models.CategoriaBoi) &&
					a.FazendaID == fID {
					touro = a
					break
				}
			}
			if touro == nil {
				for _, a := range touros {
					if a.Sexo != nil && *a.Sexo == "M" && a.Categoria != nil &&
						(*a.Categoria == models.CategoriaTouro || *a.Categoria == models.CategoriaBoi) {
						touro = a
						break
					}
				}
			}
			if touro == nil {
				return map[string]any{"erro": "animal " + touroIdent + " não é touro nem boi cadastrado"}, nil
			}
			if touro.FazendaID != fID {
				return map[string]any{"erro": "touro/boi deve ser da mesma fazenda da fêmea"}, nil
			}
			t, errParse := time.Parse(time.RFC3339, dataStr)
			if errParse != nil {
				t, _ = time.Parse("2006-01-02T15:04:05", dataStr)
			}
			if errParse != nil {
				t = time.Now()
			}
			cob := &models.Cobertura{
				AnimalID:      animais[0].ID,
				Tipo:          tipoCob,
				Data:          t,
				FazendaID:     fID,
				TouroAnimalID: &touro.ID,
			}
			err = s.coberturaSvc.Create(ctx, cob)
		} else {
			if tipoCob == "" {
				tipoCob = models.CoberturaTipoIA
			}
			t, errParse := time.Parse(time.RFC3339, dataStr)
			if errParse != nil {
				t, _ = time.Parse("2006-01-02T15:04:05", dataStr)
			}
			if errParse != nil {
				t = time.Now()
			}
			cob := &models.Cobertura{AnimalID: animais[0].ID, Tipo: tipoCob, Data: t, FazendaID: fID}
			if v, ok := call.Args["touro_animal_id"].(float64); ok && v > 0 {
				id := int64(v)
				cob.TouroAnimalID = &id
			}
			if v, ok := call.Args["touro_info"].(string); ok && strings.TrimSpace(v) != "" {
				cob.TouroInfo = ptr(strings.TrimSpace(v))
			}
			err = s.coberturaSvc.Create(ctx, cob)
		}
		if err != nil {
			return nil, err
		}
		return map[string]any{"status": "sucesso", "mensagem": "Cobertura registrada", "redirect_path": "/gestao/coberturas"}, nil

	case "registrar_toque":
		if s.diagnosticoGestSvc == nil {
			return map[string]any{"erro": "Serviço de toques não disponível"}, nil
		}
		ident, _ := call.Args["identificacao"].(string)
		dataStr, _ := call.Args["data"].(string)
		resultado, _ := call.Args["resultado"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(ident))
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal não encontrado"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			fID = animais[0].FazendaID
		}
		t, errParse := time.Parse(time.RFC3339, dataStr)
		if errParse != nil {
			t, _ = time.Parse("2006-01-02T15:04:05", dataStr)
		}
		if errParse != nil {
			t = time.Now()
		}
		dg := &models.DiagnosticoGestacao{AnimalID: animais[0].ID, Data: t, Resultado: resultado, FazendaID: fID}
		err = s.diagnosticoGestSvc.Create(ctx, dg)
		if err != nil {
			return nil, err
		}
		return map[string]any{"status": "sucesso", "mensagem": "Toque registrado", "redirect_path": "/gestao/toques"}, nil

	case "listar_gestacoes":
		if s.gestacaoSvc == nil {
			return map[string]any{"erro": "Serviço de gestações não disponível"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			return map[string]any{"erro": "Especifique a fazenda."}, nil
		}
		gestacoes, err := s.gestacaoSvc.GetByFazendaID(ctx, fID)
		if err != nil {
			return nil, err
		}
		if len(gestacoes) == 0 {
			return map[string]any{"status": "nenhuma gestação encontrada"}, nil
		}
		var sb2 strings.Builder
		sb2.WriteString(fmt.Sprintf("Gestações (%d): ", len(gestacoes)))
		for i, g := range gestacoes {
			if i > 0 {
				sb2.WriteString("; ")
			}
			sb2.WriteString(fmt.Sprintf("Animal %d - %s (confirmada em %s)", g.AnimalID, g.Status, g.DataConfirmacao.Format("02/01/2006")))
		}
		return map[string]any{"lista_gestacoes": sb2.String(), "redirect_path": "/gestao/gestacoes"}, nil

	case "registrar_parto":
		if s.partoSvc == nil {
			return map[string]any{"erro": "Serviço de partos não disponível"}, nil
		}
		ident, _ := call.Args["identificacao"].(string)
		dataStr, _ := call.Args["data"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(ident))
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal não encontrado"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			fID = animais[0].FazendaID
		}
		t, errParse := time.Parse(time.RFC3339, dataStr)
		if errParse != nil {
			t, _ = time.Parse("2006-01-02T15:04:05", dataStr)
		}
		if errParse != nil {
			t = time.Now()
		}
		numCrias := 1
		if v, ok := call.Args["numero_crias"].(float64); ok && v > 0 {
			numCrias = int(v)
		}
		parto := &models.Parto{AnimalID: animais[0].ID, Data: t, FazendaID: fID, NumeroCrias: numCrias}
		err = s.partoSvc.Create(ctx, parto)
		if err != nil {
			return nil, err
		}
		return map[string]any{"status": "sucesso", "mensagem": "Parto registrado", "redirect_path": "/gestao/partos"}, nil

	case "registrar_secagem":
		if s.secagemSvc == nil {
			return map[string]any{"erro": "Serviço de secagens não disponível"}, nil
		}
		ident, _ := call.Args["identificacao"].(string)
		dataSec, _ := call.Args["data_secagem"].(string)
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(ident))
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal não encontrado"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			fID = animais[0].FazendaID
		}
		dt, errParse := time.Parse("2006-01-02", dataSec)
		if errParse != nil {
			return map[string]any{"erro": "data_secagem inválida (use YYYY-MM-DD)"}, nil
		}
		sec := &models.Secagem{AnimalID: animais[0].ID, DataSecagem: dt, FazendaID: fID}
		err = s.secagemSvc.Create(ctx, sec)
		if err != nil {
			return nil, err
		}
		return map[string]any{"status": "sucesso", "mensagem": "Secagem registrada", "redirect_path": "/gestao/secagens"}, nil

	case "listar_lactacoes":
		if s.lactacaoSvc == nil {
			return map[string]any{"erro": "Serviço de lactações não disponível"}, nil
		}
		fID := resolveFazendaID(call.Args, fazendaAtivaID, s.fazendaSvc, ctx)
		if fID <= 0 {
			return map[string]any{"erro": "Especifique a fazenda."}, nil
		}
		lactacoes, err := s.lactacaoSvc.GetByFazendaID(ctx, fID)
		if err != nil {
			return nil, err
		}
		if len(lactacoes) == 0 {
			return map[string]any{"status": "nenhuma lactação encontrada"}, nil
		}
		var sb3 strings.Builder
		sb3.WriteString(fmt.Sprintf("Lactações (%d): ", len(lactacoes)))
		for i, lact := range lactacoes {
			if i > 0 {
				sb3.WriteString("; ")
			}
			sb3.WriteString(fmt.Sprintf("Animal %d - #%d (início %s)", lact.AnimalID, lact.NumeroLactacao, lact.DataInicio.Format("02/01/2006")))
		}
		return map[string]any{"lista_lactacoes": sb3.String(), "redirect_path": "/gestao/lactacoes"}, nil

	case "movimentar_lote":
		if s.movimentacaoLoteSvc == nil {
			return map[string]any{"erro": "Serviço de movimentação de lote não disponível"}, nil
		}
		ident, _ := call.Args["identificacao"].(string)
		loteDestID, ok := call.Args["lote_destino_id"].(float64)
		if !ok || int64(loteDestID) <= 0 {
			return map[string]any{"erro": "lote_destino_id é obrigatório"}, nil
		}
		animais, err := s.animalSvc.SearchByIdentificacao(ctx, strings.TrimSpace(ident))
		if err != nil || len(animais) == 0 {
			return map[string]any{"erro": "animal não encontrado"}, nil
		}
		motivo := ""
		if v, ok := call.Args["motivo"].(string); ok {
			motivo = v
		}
		m := &models.MovimentacaoLote{AnimalID: animais[0].ID, LoteDestinoID: int64(loteDestID), Motivo: &motivo}
		err = s.movimentacaoLoteSvc.Create(ctx, m)
		if err != nil {
			return nil, err
		}
		return map[string]any{"status": "sucesso", "mensagem": "Animal movimentado", "redirect_path": fmt.Sprintf("/animais/%d", animais[0].ID)}, nil

	default:
		return nil, fmt.Errorf("função não implementada: %s", call.Name)
	}
}


// resolveFazendaID obtém fazenda_id dos args ou usa fazendaAtivaID. Retorna 0 se nenhum.
func resolveFazendaID(args map[string]interface{}, fazendaAtivaID int64, fazendaSvc *FazendaService, ctx context.Context) int64 {
	fID := fazendaAtivaID
	if v, ok := args["fazenda_id"].(float64); ok && v > 0 {
		fID = int64(v)
	}
	if fID <= 0 {
		if nome, ok := args["nome_fazenda"].(string); ok && strings.TrimSpace(nome) != "" {
			fazendas, _ := fazendaSvc.SearchByNome(ctx, nome)
			if len(fazendas) > 0 {
				fID = fazendas[0].ID
			}
		}
	}
	return fID
}
// timeToStr converte *time.Time em valor serializável para o Gemini (proto Struct não aceita time.Time).
func timeToStr(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return t.Format(time.RFC3339)
}
