"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, CalendarDays, Smartphone, ShieldCheck, Leaf, Sparkles, Building2, List } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-40 blur-[100px]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative px-6 pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center text-center">
        <div className="animate-fade-in-up max-w-5xl mx-auto space-y-8 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            <span>Leite, rebanho e equipe — em um só sistema</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            <span className="block text-2xl md:text-3xl font-bold tracking-tight text-primary mb-3 md:mb-4">
              CeialMilk
            </span>
            Gestão da sua fazenda leiteira <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-600">
              simples e no curral.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Feito para produtores brasileiros: produção, animais, reprodução e escalas 5x1 numa interface clara — sem planilhas nem papel.
          </p>
          
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button asChild size="lg" className="w-full sm:w-auto text-base h-14 px-10 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-300">
              <Link href="/registro">
                Experimente Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base h-14 px-10 rounded-full border-border hover:bg-accent/50 transition-all duration-300">
              <Link href="/login">Acessar minha conta</Link>
            </Button>
          </div>
        </div>

        {/* Ilustração do painel (decoração; botões não são interativos) */}
        <div
          className="mt-20 w-full max-w-5xl relative animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
          role="img"
          aria-label="Pré-visualização ilustrativa do CeialMilk: início com produção de leite, rebanho, escala 5x1 e alertas de gestão reprodutiva."
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 bottom-[-2px]"></div>
          <div className="rounded-xl md:rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden p-2 md:p-4 ring-1 ring-white/10 dark:ring-white/5">
            <div className="rounded-lg md:rounded-xl bg-background border border-border/50 overflow-hidden relative shadow-inner">
              
              {/* Topbar */}
              <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card text-sm">
                <div className="flex items-center gap-6">
                  <span className="font-bold text-base tracking-tight">CeialMilk</span>
                  <div className="hidden md:flex items-center gap-4 text-muted-foreground">
                    <span className="text-foreground font-medium">Início</span>
                    <span>Animais</span>
                    <span>Gestão</span>
                    <span>Folgas</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">Fazenda Bela Vista</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    J
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="p-6 md:p-8 text-left bg-muted/10">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Início</h2>
                  <p className="text-muted-foreground mt-1">O que você precisa fazer hoje?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Card 1 */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Activity className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-lg">Produção de Leite</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">340 <span className="text-base font-normal text-muted-foreground">L / hoje</span></div>
                    <p className="text-sm text-emerald-500 font-medium">+12L em relação a ontem</p>
                  </div>
                  
                  {/* Card 2 */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                        <List className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-lg">Rebanho Ativo</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">45 <span className="text-base font-normal text-muted-foreground">animais</span></div>
                    <p className="text-sm text-muted-foreground">32 em lactação, 13 secas</p>
                  </div>

                  {/* Card 3 */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-lg">Escala 5x1</span>
                    </div>
                    <div className="text-xl font-medium mb-1">2 funcionários de folga</div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-muted rounded text-xs">Carlos (Manhã)</span>
                      <span className="px-2 py-1 bg-muted rounded text-xs">Pedro (Tarde)</span>
                    </div>
                  </div>
                </div>

                {/* Alerts / Table Mock */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/30">
                    <h3 className="font-semibold">Atenção Necessária (Gestão Reprodutiva)</h3>
                    <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-medium">3 alertas</span>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="px-5 py-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-red-500"></div>
                        <span className="font-medium truncate">Vaca #102 (Mimosa)</span>
                      </div>
                      <span className="text-sm text-muted-foreground sm:max-w-[40%] sm:text-right">Previsão de parto expirada (passou 2 dias)</span>
                      <span className="inline-flex h-7 w-fit shrink-0 items-center rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground shadow-sm">
                        Registrar Parto
                      </span>
                    </div>
                    <div className="px-5 py-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-amber-500"></div>
                        <span className="font-medium truncate">Vaca #084 (Estrela)</span>
                      </div>
                      <span className="text-sm text-muted-foreground sm:max-w-[40%] sm:text-right">Secagem programada para hoje</span>
                      <span className="inline-flex h-7 w-fit shrink-0 items-center rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground shadow-sm">
                        Secar Animal
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 md:w-2/3">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Tudo o que você precisa. <br />
              <span className="text-muted-foreground font-normal">Nada do que não precisa.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Uma suíte de ferramentas desenhada com foco na usabilidade de quem realmente vive o dia a dia da fazenda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* Bento Card 1 (Large) */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border bg-card p-8 hover:border-primary/50 transition-colors">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl transition-all group-hover:bg-primary/20"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
                  <Activity className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Produção e registro leiteiro</h3>
                  <p className="text-muted-foreground text-lg max-w-md">
                    Registre e acompanhe a produção por animal e período, com visão consolidada da fazenda para apoiar o dia a dia e a tomada de decisão.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Card 2 (Small) */}
            <div className="md:col-span-1 group relative overflow-hidden rounded-3xl border border-border bg-card p-8 hover:border-primary/50 transition-colors">
              <div className="absolute bottom-0 right-0 -mb-8 -mr-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 border border-amber-500/20">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Reprodução sob controle</h3>
                  <p className="text-muted-foreground">
                    Cios, coberturas, secagens e partos. Acompanhe o calendário reprodutivo do rebanho em um só lugar.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Card 3 (Small) */}
            <div className="md:col-span-1 group relative overflow-hidden rounded-3xl border border-border bg-card p-8 hover:border-primary/50 transition-colors">
              <div className="absolute top-0 left-0 -mt-8 -ml-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 border border-blue-500/20">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Escalas 5x1</h3>
                  <p className="text-muted-foreground">
                    Gestão humanizada e justa das folgas da sua equipe, eliminando dores de cabeça.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Card 4 (Large) */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border bg-card p-8 hover:border-primary/50 transition-colors">
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-500/20">
                  <Smartphone className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Feito para o Curral</h3>
                  <p className="text-muted-foreground text-lg max-w-md">
                    Interface pensada para o celular no curral e para instalar como aplicativo (PWA). Use com conexão estável; seguimos evoluindo a experiência em campo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mt-auto py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 border-t border-border"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <Leaf className="h-12 w-12 mx-auto text-primary mb-6 opacity-80" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Pronto para evoluir sua fazenda?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Dê o primeiro passo em direção a uma gestão leiteira moderna, eficiente e lucrativa. O cadastro leva menos de um minuto.
          </p>
          <Button asChild size="lg" className="h-14 px-10 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform duration-300">
            <Link href="/registro">Criar Conta Grátis</Link>
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">Sem cartão de crédito. Uso gratuito para pequenas propriedades.</p>
        </div>
      </section>
    </div>
  );
}
