"use client";

import type { Animal } from "@/services/animais";
import {
  ANIMAL_FICHA_TAB_LABELS,
  type AnimalFichaTab,
} from "@/components/animais/ficha/animalFichaTabs";
import { AnimalFichaTabCiclo } from "@/components/animais/ficha/AnimalFichaTabCiclo";
import { AnimalFichaTabHistorico } from "@/components/animais/ficha/AnimalFichaTabHistorico";
import { AnimalFichaTabProducao } from "@/components/animais/ficha/AnimalFichaTabProducao";
import { AnimalFichaTabSaude } from "@/components/animais/ficha/AnimalFichaTabSaude";
import { AnimalFichaTabVisaoGeral } from "@/components/animais/ficha/AnimalFichaTabVisaoGeral";
import { animalProximasAcoesPageSpacerClass } from "@/components/animais/AnimalProximasAcoesCta";
import {
  TOUR_STEP_FICHA_OUTRAS_TABS,
  TOUR_STEP_FICHA_TAB_CICLO,
} from "@/components/ui/tour";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { UseAnimalFichaPageResult } from "@/hooks/useAnimalFichaPage";
import type { TimelineFilterTipo } from "@/services/animais";

type Props = Pick<
  UseAnimalFichaPageResult,
  | "id"
  | "animal"
  | "contexto"
  | "fazenda"
  | "contextoLoading"
  | "activeTab"
  | "historicoTipo"
  | "setTab"
  | "setHistoricoTipo"
  | "foraDoRebanho"
  | "canManageAnimal"
  | "canEditarCadastroAnimal"
  | "canExcluirCadastroAnimal"
  | "showEditarCadastroAnimal"
  | "canRegistrarProducao"
  | "showRegistrarProducaoBloqueado"
  | "showRegistrarBaixa"
  | "showReverterBaixa"
  | "revertMutation"
  | "deleteMutation"
> & {
  animal: Animal;
};

export function AnimalFichaTabs({
  id,
  animal,
  contexto,
  fazenda,
  contextoLoading,
  activeTab,
  historicoTipo,
  setTab,
  setHistoricoTipo,
  foraDoRebanho,
  canManageAnimal,
  canEditarCadastroAnimal,
  canExcluirCadastroAnimal,
  showEditarCadastroAnimal,
  canRegistrarProducao,
  showRegistrarProducaoBloqueado,
  showRegistrarBaixa,
  showReverterBaixa,
  revertMutation,
  deleteMutation,
}: Props) {
  const handleTabChange = (value: string) => {
    setTab(value as AnimalFichaTab);
  };

  const handleHistoricoTipoChange = (tipo: TimelineFilterTipo) => {
    setHistoricoTipo(tipo);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={cn(
        "min-w-0",
        (activeTab === "ciclo" || activeTab === "geral") &&
          animalProximasAcoesPageSpacerClass(
            contexto?.proximas_acoes,
            foraDoRebanho,
          ),
      )}
    >
      <TabsList aria-label="Secções da ficha do animal" className="flex-wrap h-auto gap-1">
        <TabsTrigger value="geral" className="min-h-11">
          {ANIMAL_FICHA_TAB_LABELS.geral}
        </TabsTrigger>
        <TabsTrigger
          id={TOUR_STEP_FICHA_TAB_CICLO}
          value="ciclo"
          className="min-h-11"
        >
          {ANIMAL_FICHA_TAB_LABELS.ciclo}
        </TabsTrigger>
        <div
          id={TOUR_STEP_FICHA_OUTRAS_TABS}
          className="inline-flex flex-wrap gap-1"
        >
          <TabsTrigger value="saude" className="min-h-11">
            {ANIMAL_FICHA_TAB_LABELS.saude}
          </TabsTrigger>
          <TabsTrigger value="producao" className="min-h-11">
            {ANIMAL_FICHA_TAB_LABELS.producao}
          </TabsTrigger>
          <TabsTrigger value="historico" className="min-h-11">
            {ANIMAL_FICHA_TAB_LABELS.historico}
          </TabsTrigger>
        </div>
      </TabsList>

      <TabsContent value="geral" role="tabpanel">
        <AnimalFichaTabVisaoGeral
          animalId={id}
          animal={animal}
          contexto={contexto}
          contextoLoading={contextoLoading}
          fazenda={fazenda}
          foraDoRebanho={foraDoRebanho}
          canManageAnimal={canManageAnimal}
          canEditarCadastroAnimal={canEditarCadastroAnimal}
          canExcluirCadastroAnimal={canExcluirCadastroAnimal}
          showEditarCadastroAnimal={showEditarCadastroAnimal}
          showRegistrarBaixa={showRegistrarBaixa}
          showReverterBaixa={showReverterBaixa}
          revertMutation={revertMutation}
          deleteMutation={deleteMutation}
        />
      </TabsContent>

      <TabsContent value="ciclo" role="tabpanel">
        <AnimalFichaTabCiclo
          animalId={id}
          contexto={contexto}
          contextoLoading={contextoLoading}
          proximasAcoes={contexto?.proximas_acoes}
          foraDoRebanho={foraDoRebanho}
          enabled={activeTab === "ciclo"}
        />
      </TabsContent>

      <TabsContent value="saude" role="tabpanel">
        <AnimalFichaTabSaude
          animalId={id}
          foraDoRebanho={foraDoRebanho}
          enabled={activeTab === "saude"}
        />
      </TabsContent>

      <TabsContent value="producao" role="tabpanel">
        <AnimalFichaTabProducao
          animalId={id}
          fazendaId={animal.fazenda_id}
          canRegistrarProducao={canRegistrarProducao}
          showRegistrarProducaoBloqueado={showRegistrarProducaoBloqueado}
          animalLabel={animal.identificacao ?? `#${animal.id}`}
          enabled={activeTab === "producao"}
        />
      </TabsContent>

      <TabsContent value="historico" role="tabpanel">
        {activeTab === "historico" ? (
          <AnimalFichaTabHistorico
            animalId={id}
            tipoFilter={historicoTipo}
            onTipoFilterChange={handleHistoricoTipoChange}
          />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
