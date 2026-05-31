"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Building2, Copy, Users, type LucideIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  WizardProvider,
  WizardStep,
  WizardProgress,
  WizardNavigation,
} from "@/components/ui/wizard";
import { AREA_LABEL, MAIN_NAV_AREA_ORDER, type AppArea } from "@/config/appAccess";
import { AREA_ICON } from "@/components/layout/headerNavIcons";
import { markOnboardingWizardCompleted } from "@/lib/onboardingStorage";
import { PassosProvisaoSemFazenda } from "./PassosProvisaoSemFazenda";
import { FaqOnboarding } from "./FaqOnboarding";

type OnboardingColdWizardProps = {
  userId: number;
  userName: string;
  userEmail: string;
};

const PREVIEW_AREAS: AppArea[] = [...MAIN_NAV_AREA_ORDER];

function AreaPreviewCard({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-muted/20 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}

export function OnboardingColdWizard({
  userId,
  userName,
  userEmail,
}: OnboardingColdWizardProps) {
  const router = useRouter();

  const finishWizard = useCallback(() => {
    markOnboardingWizardCompleted(userId);
    router.replace("/");
  }, [userId, router]);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(userEmail);
      toast.success("Email copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o email.");
    }
  }, [userEmail]);

  return (
    <Card className="w-full max-w-2xl">
      <WizardProvider totalSteps={3}>
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            Bem-vindo ao CeialMilk, {userName || "utilizador"}!
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Gestão leiteira para fazendas, rebanho, produção e ciclo reprodutivo.
          </CardDescription>
          <div className="mt-4">
            <WizardProgress />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <WizardStep step={0}>
            <div className="space-y-4 text-left">
              <p className="text-center text-muted-foreground">
                O CeialMilk centraliza dados da exploração: animais, ordenhas,
                folgas da equipa e eventos do ciclo (cios, coberturas, partos).
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Provisão:</strong> um
                  administrador vincula a sua conta a uma fazenda.
                </li>
                <li>
                  <strong className="text-foreground">Perfil:</strong> define a
                  sua função (Funcionário, Gerente, etc.).
                </li>
                <li>
                  <strong className="text-foreground">Dashboard:</strong> após a
                  provisão, o início orienta o dia a dia.
                </li>
              </ul>
            </div>
          </WizardStep>

          <WizardStep step={1}>
            <div className="space-y-4">
              <div className="flex gap-4 rounded-lg bg-muted/50 p-4">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1 text-left">
                  <p className="mb-1 font-medium">Contacte o administrador</p>
                  <p className="text-sm text-muted-foreground">
                    Envie o email da sua conta para quem administra o CeialMilk
                    na sua organização:
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-foreground">
                    {userEmail}
                  </p>
                </div>
              </div>
              <PassosProvisaoSemFazenda />
              <FaqOnboarding />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-[44px]"
                  onClick={() => void copyEmail()}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar email
                </Button>
              </div>
            </div>
          </WizardStep>

          <WizardStep step={2}>
            <div className="space-y-4 text-left">
              <p className="text-sm text-muted-foreground">
                Depois da provisão, estas áreas ficam disponíveis conforme o seu
                perfil:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <AreaPreviewCard
                  label="Fazendas"
                  icon={Building2}
                />
                {PREVIEW_AREAS.map((area) => (
                  <AreaPreviewCard
                    key={area}
                    label={AREA_LABEL[area]}
                    icon={AREA_ICON[area]}
                  />
                ))}
              </div>
            </div>
          </WizardStep>

          <WizardNavigation
            labels={{
              back: "Voltar",
              next: "Próximo",
              finish: "Ir ao Dashboard",
            }}
            onFinish={finishWizard}
          />
        </CardContent>
      </WizardProvider>
    </Card>
  );
}
