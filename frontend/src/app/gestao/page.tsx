"use client";

import Link from "next/link";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Heart, Stethoscope, Baby, Droplet, Milk } from "lucide-react";

const links = [
  { href: "/lotes", label: "Lotes", icon: Layers },
  { href: "/gestao/cios", label: "Cios", icon: Heart },
  { href: "/gestao/coberturas", label: "Coberturas", icon: Heart },
  { href: "/gestao/toques", label: "Toques (Diagnósticos)", icon: Stethoscope },
  { href: "/gestao/gestacoes", label: "Gestações", icon: Baby },
  { href: "/gestao/partos", label: "Partos", icon: Baby },
  { href: "/gestao/secagens", label: "Secagens", icon: Droplet },
  { href: "/gestao/lactacoes", label: "Lactações", icon: Milk },
];

function GestaoContent() {
  const { fazendaAtiva } = useFazendaAtiva();

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <p className="text-muted-foreground">Selecione uma fazenda para acessar a gestão pecuária.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <h1 className="text-2xl font-bold mb-6">Gestão Pecuária – {fazendaAtiva.nome}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {label}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}

export default function GestaoPage() {
  return (
    <ProtectedRoute>
      <GestaoContent />
    </ProtectedRoute>
  );
}
