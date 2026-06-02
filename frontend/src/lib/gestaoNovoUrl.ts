/** Query animal_id e gestacao_id nas rotas de registo (gestao e producao). */

export function parsePositiveIntQueryParam(
  params: Pick<URLSearchParams, "get">,
  key: string,
): string {
  const raw = params.get(key)?.trim() ?? "";
  if (!raw || !/^\d+$/.test(raw)) return "";
  return raw;
}

export function buildGestaoNovoHref(
  path: string,
  opts?: { animalId?: string | number; gestacaoId?: string | number },
): string {
  const sp = new URLSearchParams();
  if (opts?.animalId != null && String(opts.animalId) !== "") {
    sp.set("animal_id", String(opts.animalId));
  }
  if (opts?.gestacaoId != null && String(opts.gestacaoId) !== "") {
    sp.set("gestacao_id", String(opts.gestacaoId));
  }
  const q = sp.toString();
  if (!q) return path;
  return path + "?" + q;
}

/** Após registo com animal pré-selecionado, voltar à ficha em vez da listagem. */
export function gestaoNovoSuccessPath(
  preselectedAnimalId: string,
  listPath: string,
): string {
  const aid = preselectedAnimalId.trim();
  if (aid && /^\d+$/.test(aid)) return "/animais/" + aid;
  return listPath;
}
