"use client";

import type { Animal } from "@/services/animais";
import {
  ANIMAL_FICHA_TABS,
  ANIMAL_FICHA_TAB_LABELS,
  type AnimalFichaTab,
} from "@/components/animais/ficha/animalFichaTabs";
import { AnimalFichaTabHistorico } from "@/components/animais/ficha/AnimalFichaTabHistorico";
import { AnimalFichaTabProducao } from "@/components/animais/ficha/AnimalFichaTabProducao";
import { AnimalFichaTabSaude } from "@/components/animais/ficha/AnimalFichaTabSaude";
import { AnimalFichaTabVisaoGeral } from "@/components/animais/ficha/AnimalFichaTabVisaoGeral";
import { animalProximasAcoesPageSpacerClass } from "@/components/animais/AnimalProximasAcoesCta";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { UseAnimalFichaPageResult } from "@/hooks/useAnimalFichaPage";

type Props = Pick<
  UseAnimalFichaPageResult,
  | "id"
  | "animal"
  | "contexto"
  | "fazenda"
  | "contextoLoading"
  | "activeTab"
  | "setTab"
  | "foraDoRebanho"
  | "canManageAnimal"
  | "canRegistrarProducao"
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
  setTab,
  foraDoRebanho,
  canManageAnimal,
  canRegistrarProducao,
  showRegistrarBaixa,
  showReverterBaixa,
  revertMutation,
  deleteMutation,
}: Props) {
  const handleTabChange = (value: string) => {
    setTab(value as AnimalFichaTab);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={cn(
        "min-w-0",
        activeTab === "geral" &&
          animalProximasAcoesPageSpacerClass(
            contexto?.proximas_acoes,
            foraDoRebanho
          )
      )}
    >
      <TabsList aria-label="Secções da ficha do animal">
        {ANIMAL_FICHA_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {ANIMAL_FICHA_TAB_LABELS[tab]}
          </TabsTrigger>
        ))}
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
          showRegistrarBaixa={showRegistrarBaixa}
          showReverterBaixa={showReverterBaixa}
          revertMutation={revertMutation}
          deleteMutation={deleteMutation}
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
          animalLabel={animal.identificacao ?? `#${animal.id}`}
          enabled={activeTab === "producao"}
        />
      </TabsContent>

      <TabsContent value="historico" role="tabpanel">
        {activeTab === "historico" ? (
          <AnimalFichaTabHistorico animalId={id} />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
