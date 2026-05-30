"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HeaderNavLink } from "@/components/layout/HeaderNavLink";
import { AREA_ICON, SYSTEM_ICON } from "@/components/layout/headerNavIcons";
import {
  getSystemItemPathPrefix,
  type HeaderNavGroups,
} from "@/config/headerNav";
import { getAreaHref, type AppArea } from "@/config/appAccess";

type HeaderMobileNavSectionsProps = {
  groups: HeaderNavGroups;
  getAreaLabel: (area: AppArea) => string;
  onNavigate: () => void;
};

function NavSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-0.5">
      <h3 className="px-3 py-2 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function AreaLinks({
  areas,
  getAreaLabel,
  isActive,
  onNavigate,
}: {
  areas: AppArea[];
  getAreaLabel: (area: AppArea) => string;
  isActive: (path: string) => boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      {areas.map((area) => {
        const href = getAreaHref(area);
        return (
          <HeaderNavLink
            key={area}
            href={href}
            label={getAreaLabel(area)}
            icon={AREA_ICON[area]}
            active={isActive(href)}
            variant="drawer"
            onNavigate={onNavigate}
          />
        );
      })}
    </>
  );
}

export function HeaderMobileNavSections({
  groups,
  getAreaLabel,
  onNavigate,
}: HeaderMobileNavSectionsProps) {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || (pathname?.startsWith(path + "/") ?? false);

  const hasNav =
    groups.principal.length > 0 ||
    groups.mais.length > 0 ||
    groups.sistema.length > 0;

  if (!hasNav) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {groups.principal.length > 0 ? (
        <NavSection title="Exploração">
          <AreaLinks
            areas={groups.principal}
            getAreaLabel={getAreaLabel}
            isActive={isActive}
            onNavigate={onNavigate}
          />
        </NavSection>
      ) : null}
      {groups.mais.length > 0 ? (
        <NavSection title="Registos">
          <AreaLinks
            areas={groups.mais}
            getAreaLabel={getAreaLabel}
            isActive={isActive}
            onNavigate={onNavigate}
          />
        </NavSection>
      ) : null}
      {groups.sistema.length > 0 ? (
        <NavSection title="Administração">
          {groups.sistema.map((item) => {
            const prefix = getSystemItemPathPrefix(item);
            return (
              <HeaderNavLink
                key={item.id}
                href={item.href}
                label={item.label}
                icon={SYSTEM_ICON[item.id]}
                active={isActive(prefix)}
                variant="drawer"
                onNavigate={onNavigate}
              />
            );
          })}
        </NavSection>
      ) : null}
    </div>
  );
}
