"use client";

import { ClipboardList, Heart } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type GestaoLink = {
  href: string;
  label: string;
};

type GestaoOrientacaoPanelProps = {
  links: GestaoLink[];
};

export function GestaoOrientacaoPanel({ links }: GestaoOrientacaoPanelProps) {
  const cios = links.find((l) => l.href === "/gestao/cios");
  const coberturas = links.find((l) => l.href === "/gestao/coberturas");
  const primaryHref = cios?.href ?? links[0]?.href;
  const secondaryHref =
    coberturas?.href && coberturas.href !== primaryHref
      ? coberturas.href
      : links[1]?.href;

  if (!primaryHref) return null;

  return (
    <EmptyState
      icon={ClipboardList}
      title="Comece pelo ciclo reprodutivo"
      description="Registe cios e coberturas para acompanhar gestações, partos e lactações da sua fazenda."
      primaryAction={{
        label: cios ? "Registar cio" : links[0].label,
        href: primaryHref,
        icon: Heart,
      }}
      secondaryAction={
        secondaryHref
          ? {
              label: coberturas ? "Registar cobertura" : links[1]?.label ?? "Ver módulos",
              href: secondaryHref,
            }
          : undefined
      }
      className="py-8 mb-6 border rounded-xl bg-muted/20"
    />
  );
}
