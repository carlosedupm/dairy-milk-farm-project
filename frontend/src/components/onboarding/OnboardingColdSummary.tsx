"use client";

import Link from "next/link";
import { Building2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaqOnboarding } from "./FaqOnboarding";
import { PassosProvisaoSemFazenda } from "./PassosProvisaoSemFazenda";

type OnboardingColdSummaryProps = {
  userName: string;
  onLogout: () => void;
};

/** Resumo após concluir o wizard (USER ainda sem fazenda). */
export function OnboardingColdSummary({
  userName,
  onLogout,
}: OnboardingColdSummaryProps) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-8 w-8" />
          </div>
        </div>
        <CardTitle className="text-2xl">
          Olá novamente, {userName || "utilizador"}
        </CardTitle>
        <CardDescription className="mt-2 text-base">
          Ainda aguarda vínculo com uma fazenda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 rounded-lg bg-muted/50 p-4">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 text-left">
            <p className="mb-1 font-medium">Acesso às fazendas necessário</p>
            <p className="text-sm text-muted-foreground">
              Contacte o administrador da plataforma para vincular a sua conta.
            </p>
          </div>
        </div>
        <PassosProvisaoSemFazenda />
        <FaqOnboarding />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" size="lg" className="min-h-[44px]" asChild>
            <Link href="/">Ir ao início</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-h-[44px]"
            onClick={onLogout}
          >
            Terminar sessão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
