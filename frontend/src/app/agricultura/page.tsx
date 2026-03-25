"use client";

import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/layout/BackLink";
import { Wheat, Truck, MapPin, BarChart3 } from "lucide-react";

function AgriculturaContent() {
  const { fazendaAtiva } = useFazendaAtiva();

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href="/">Voltar</BackLink>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            Custos Agrícolas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Gerencie custos desde o plantio até a colheita por safra: áreas, análises de solo,
            fornecedores (cooperativas), custos, produções e resultado por área.
          </p>
          {!fazendaAtiva ? (
            <p className="text-muted-foreground">
              Selecione uma fazenda no topo da página para acessar o módulo agrícola.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="outline" className="h-auto min-h-[44px] justify-start p-4">
                <Link href="/agricultura/fornecedores" className="flex items-center gap-3">
                  <Truck className="h-5 w-5 shrink-0" />
                  <span>Fornecedores (cooperativas)</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto min-h-[44px] justify-start p-4">
                <Link href="/agricultura/areas" className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 shrink-0" />
                  <span>Áreas / Talhões</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto min-h-[44px] justify-start p-4">
                <Link href={`/agricultura/resultado/${fazendaAtiva.id}/${new Date().getFullYear()}`} className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 shrink-0" />
                  <span>Resultado por safra</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto min-h-[44px] justify-start p-4">
                <Link href="/agricultura/comparativo-fornecedores" className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 shrink-0" />
                  <span>Comparativo fornecedores</span>
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function AgriculturaPage() {
  return (
    <ProtectedRoute>
      <AgriculturaContent />
    </ProtectedRoute>
  );
}
