"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import { getAreasMode, isPathAllowedForPerfil } from "@/config/appAccess";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  List,
  Droplets,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Search,
  type LucideIcon,
} from "lucide-react";
import { AnimalSearchHome } from "@/components/animais/AnimalSearchHome";
import { RestricoesLeiteHomePanel } from "@/components/leite/RestricoesLeiteHomePanel";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { cn } from "@/lib/utils";

type Atalho = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function Dashboard() {
  const { user } = useAuth();
  const { isSingleFazenda, fazendaUnica } = useMinhasFazendas();
  const animalSearch = useAnimalSearchDialog();
  const showBuscaRapida =
    !!user && isPathAllowedForPerfil(user.perfil, "/animais") && animalSearch;

  const restrictedMode = getAreasMode(user?.perfil) !== "full";

  /* Mobile-first: perfil restrito prioriza Folgas (curral) antes de animais/gestão */
  const atalhos: Atalho[] = restrictedMode
    ? [
        {
          href: "/folgas",
          title: "Folgas",
          description: "Consultar escala e registrar justificativas",
          icon: CalendarDays,
        },
        {
          href: "/animais",
          title: "Ver animais",
          description: "Consultar animais e histórico de produção",
          icon: List,
        },
        {
          href: "/gestao",
          title: "Gestão reprodutiva",
          description: "Cios, coberturas, partos e secagens",
          icon: ClipboardList,
        },
      ]
    : [
        {
          href:
            isSingleFazenda && fazendaUnica
              ? `/fazendas/${fazendaUnica.id}`
              : "/fazendas",
          title: "Ver fazendas",
          description: "Ver e gerenciar suas fazendas",
          icon: Building2,
        },
        {
          href:
            isSingleFazenda && fazendaUnica
              ? `/fazendas/${fazendaUnica.id}/animais`
              : "/animais",
          title: "Ver animais",
          description: "Consultar e cadastrar animais do rebanho",
          icon: List,
        },
        {
          href: "/producao/novo",
          title: "Registrar produção",
          description: "Registrar produção de leite",
          icon: Droplets,
        },
      ];

  const linkCardClass =
    "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <PageContainer
      variant="default"
      className="pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Início</h1>
        <p className="text-muted-foreground mt-1">
          O que você precisa fazer hoje?
        </p>
      </header>

      <div className="space-y-8">
        <section aria-labelledby="prioridades-heading">
          <h2 id="prioridades-heading" className="sr-only">
            Prioridades e alertas
          </h2>
          <RestricoesLeiteHomePanel />
        </section>

        <section aria-labelledby="busca-heading" className="hidden md:block">
          <h2 id="busca-heading" className="sr-only">
            Busca de animal
          </h2>
          <AnimalSearchHome />
        </section>

        <section className="space-y-3" aria-labelledby="acesso-rapido-heading">
          <h2
            id="acesso-rapido-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            Acesso rápido
          </h2>

          <ul className="divide-y rounded-xl border bg-card md:hidden">
            {showBuscaRapida ? (
              <li>
                <button
                  type="button"
                  className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
                  onClick={() => animalSearch.openDialog()}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Search className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="block font-medium text-foreground">
                      Buscar animal
                    </span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      Pesquisar por identificação, ver resumo e abrir detalhes
                    </span>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </li>
            ) : null}
            {atalhos.map(({ href, title, description, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-[52px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">
                      {title}
                    </span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {description}
                    </span>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {atalhos.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className={linkCardClass}>
                <Card
                  className={cn(
                    "h-full transition-colors",
                    "hover:bg-accent/50 border-border/80",
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <CardTitle className="text-lg text-foreground">
                      {title}
                    </CardTitle>
                    <CardDescription className="text-base leading-snug">
                      {description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
