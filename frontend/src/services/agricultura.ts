import api, { type ApiResponse } from "./api";

// --- Fornecedores ---
export type Fornecedor = {
  id: number;
  fazenda_id: number;
  nome: string;
  tipo: string;
  contato?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FornecedorCreate = {
  nome: string;
  tipo?: string;
  contato?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

export type FornecedorUpdate = {
  nome: string;
  tipo?: string;
  contato?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

export async function listFornecedoresByFazenda(fazendaId: number): Promise<Fornecedor[]> {
  const { data } = await api.get<ApiResponse<Fornecedor[]>>(`/api/v1/fazendas/${fazendaId}/fornecedores`);
  const items = data.data ?? [];
  // Garante que cada item tenha id (suporta respostas com id, ID ou fornecedor_id)
  return items.map((item) => {
    const raw = item as Fornecedor & { ID?: number; fornecedor_id?: number };
    const id = raw.id ?? raw.ID ?? raw.fornecedor_id;
    return id != null ? { ...item, id } : item;
  });
}

export async function getFornecedor(id: number): Promise<Fornecedor | null> {
  const { data } = await api.get<ApiResponse<Fornecedor>>(`/api/v1/fornecedores/${id}`);
  return data.data ?? null;
}

export async function createFornecedor(fazendaId: number, payload: FornecedorCreate): Promise<Fornecedor> {
  const { data } = await api.post<ApiResponse<Fornecedor>>(`/api/v1/fazendas/${fazendaId}/fornecedores`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function updateFornecedor(id: number, payload: FornecedorUpdate): Promise<Fornecedor> {
  const { data } = await api.put<ApiResponse<Fornecedor>>(`/api/v1/fornecedores/${id}`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function removeFornecedor(id: number): Promise<void> {
  await api.delete(`/api/v1/fornecedores/${id}`);
}

export async function getComparativoFornecedores(fazendaId: number, ano: number): Promise<ComparativoFornecedor[]> {
  const { data } = await api.get<ApiResponse<ComparativoFornecedor[]>>(
    `/api/v1/fazendas/${fazendaId}/fornecedores/comparativo/${ano}`
  );
  return data.data ?? [];
}

export type ComparativoFornecedor = {
  fornecedor_id: number;
  nome_fornecedor: string;
  total_custos: number;
  total_receitas: number;
};

// --- Áreas ---
export type Area = {
  id: number;
  fazenda_id: number;
  nome: string;
  hectares: number;
  descricao?: string | null;
  created_at: string;
  updated_at: string;
};

export type AreaCreate = {
  nome: string;
  hectares: number;
  descricao?: string | null;
};

export type AreaUpdate = {
  nome: string;
  hectares: number;
  descricao?: string | null;
};

export async function listAreasByFazenda(fazendaId: number): Promise<Area[]> {
  const { data } = await api.get<ApiResponse<Area[]>>(`/api/v1/fazendas/${fazendaId}/areas`);
  return data.data ?? [];
}

export async function getArea(id: number): Promise<Area | null> {
  const { data } = await api.get<ApiResponse<Area>>(`/api/v1/areas/${id}`);
  return data.data ?? null;
}

export async function createArea(fazendaId: number, payload: AreaCreate): Promise<Area> {
  const { data } = await api.post<ApiResponse<Area>>(`/api/v1/fazendas/${fazendaId}/areas`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function updateArea(id: number, payload: AreaUpdate): Promise<Area> {
  const { data } = await api.put<ApiResponse<Area>>(`/api/v1/areas/${id}`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function removeArea(id: number): Promise<void> {
  await api.delete(`/api/v1/areas/${id}`);
}

// --- Análises de solo ---
export type AnaliseSolo = {
  id: number;
  area_id: number;
  data_coleta: string;
  data_resultado?: string | null;
  ph?: number | null;
  fosforo_p?: string | null;
  potassio_k?: string | null;
  materia_organica?: string | null;
  recomendacoes?: string | null;
  laboratorio?: string | null;
  created_at: string;
};

export type AnaliseSoloCreate = {
  data_coleta: string;
  data_resultado?: string | null;
  ph?: number | null;
  fosforo_p?: string | null;
  potassio_k?: string | null;
  materia_organica?: string | null;
  recomendacoes?: string | null;
  laboratorio?: string | null;
};

export async function listAnalisesSoloByArea(areaId: number): Promise<AnaliseSolo[]> {
  const { data } = await api.get<ApiResponse<AnaliseSolo[]>>(`/api/v1/areas/${areaId}/analises-solo`);
  return data.data ?? [];
}

export async function createAnaliseSolo(areaId: number, payload: AnaliseSoloCreate): Promise<AnaliseSolo> {
  const { data } = await api.post<ApiResponse<AnaliseSolo>>(`/api/v1/areas/${areaId}/analises-solo`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

// --- Safras/Culturas ---
export type SafraCultura = {
  id: number;
  area_id: number;
  ano: number;
  cultura: string;
  status: string;
  data_plantio?: string | null;
  data_colheita?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
};

export type SafraCulturaCreate = {
  area_id: number;
  ano: number;
  cultura: string;
  status?: string;
  data_plantio?: string | null;
  data_colheita?: string | null;
  observacoes?: string | null;
};

export async function listSafrasCulturasByAreaAndAno(areaId: number, ano: number): Promise<SafraCultura[]> {
  const { data } = await api.get<ApiResponse<SafraCultura[]>>(`/api/v1/areas/${areaId}/safras/${ano}`);
  return data.data ?? [];
}

export async function createSafraCultura(payload: SafraCulturaCreate): Promise<SafraCultura> {
  const { data } = await api.post<ApiResponse<SafraCultura>>("/api/v1/safras-culturas", payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function getSafraCultura(id: number): Promise<SafraCultura | null> {
  const { data } = await api.get<ApiResponse<SafraCultura>>(`/api/v1/safras-culturas/${id}`);
  return data.data ?? null;
}

// --- Custos, Produções e Receitas ---
export type CustoAgricola = {
  id: number;
  safra_cultura_id: number;
  tipo: string;
  subcategoria?: string | null;
  descricao?: string | null;
  valor: number;
  data: string;
  quantidade?: number | null;
  unidade?: string | null;
  fornecedor_id?: number | null;
  created_at: string;
};

export type ProducaoAgricola = {
  id: number;
  safra_cultura_id: number;
  destino: string;
  quantidade_kg: number;
  data: string;
  observacoes?: string | null;
  created_at: string;
};

export type ReceitaAgricola = {
  id: number;
  safra_cultura_id: number;
  descricao?: string | null;
  valor: number;
  quantidade_kg?: number | null;
  preco_por_kg?: number | null;
  data: string;
  fornecedor_id?: number | null;
  created_at: string;
};

export async function listCustosBySafraCultura(safraCulturaId: number): Promise<CustoAgricola[]> {
  const { data } = await api.get<ApiResponse<CustoAgricola[]>>(`/api/v1/safras-culturas/${safraCulturaId}/custos`);
  return data.data ?? [];
}

export async function createCusto(safraCulturaId: number, payload: Partial<CustoAgricola>): Promise<CustoAgricola> {
  const { data } = await api.post<ApiResponse<CustoAgricola>>(`/api/v1/safras-culturas/${safraCulturaId}/custos`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function listProducoesBySafraCultura(safraCulturaId: number): Promise<ProducaoAgricola[]> {
  const { data } = await api.get<ApiResponse<ProducaoAgricola[]>>(`/api/v1/safras-culturas/${safraCulturaId}/producoes`);
  return data.data ?? [];
}

export async function createProducao(safraCulturaId: number, payload: Partial<ProducaoAgricola>): Promise<ProducaoAgricola> {
  const { data } = await api.post<ApiResponse<ProducaoAgricola>>(`/api/v1/safras-culturas/${safraCulturaId}/producoes`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function listReceitasBySafraCultura(safraCulturaId: number): Promise<ReceitaAgricola[]> {
  const { data } = await api.get<ApiResponse<ReceitaAgricola[]>>(`/api/v1/safras-culturas/${safraCulturaId}/receitas`);
  return data.data ?? [];
}

export async function createReceita(safraCulturaId: number, payload: Partial<ReceitaAgricola>): Promise<ReceitaAgricola> {
  const { data } = await api.post<ApiResponse<ReceitaAgricola>>(`/api/v1/safras-culturas/${safraCulturaId}/receitas`, payload);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

// --- Resultado agrícola ---
export type ResultadoFazendaAno = {
  por_area: ResultadoAreaSafra[];
  total_custos: number;
  total_receitas: number;
  resultado: number;
};

export type ResultadoAreaSafra = {
  area_id: number;
  ano: number;
  total_custos: number;
  total_receitas: number;
  resultado: number;
};

export async function getResultadoFazendaAno(fazendaId: number, ano: number): Promise<ResultadoFazendaAno> {
  const { data } = await api.get<ApiResponse<ResultadoFazendaAno>>(
    `/api/v1/fazendas/${fazendaId}/resultado-agricola/${ano}`
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function getResultadoAreaAno(areaId: number, ano: number): Promise<ResultadoAreaSafra> {
  const { data } = await api.get<ApiResponse<ResultadoAreaSafra>>(`/api/v1/areas/${areaId}/resultado/${ano}`);
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}
