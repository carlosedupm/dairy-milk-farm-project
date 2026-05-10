"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AnimalSearchPanel } from "@/components/animais/AnimalSearchPanel";

export function AnimalSearchHome() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mobilePainelAberto, setMobilePainelAberto] = useState(false);

  const painelVisivel = isDesktop || mobilePainelAberto;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle>Busca por identificação</CardTitle>
            <CardDescription>
              Brinco, número ou nome — resultados ao parar de digitar; resumo e
              atalho para o cadastro do animal.
            </CardDescription>
          </div>
          {!isDesktop ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 min-h-[44px] self-start sm:self-auto"
              aria-expanded={mobilePainelAberto}
              onClick={() => setMobilePainelAberto((v) => !v)}
            >
              {mobilePainelAberto ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" aria-hidden />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" aria-hidden />
                  Abrir busca
                </>
              )}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      {painelVisivel ? (
        <CardContent>
          <AnimalSearchPanel />
        </CardContent>
      ) : null}
    </Card>
  );
}
