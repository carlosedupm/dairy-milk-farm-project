"use client";

import { usePathname } from "next/navigation";
import { HeaderNavLink } from "@/components/layout/HeaderNavLink";
import { HeaderNavPopover } from "@/components/layout/HeaderNavPopover";
import { AREA_ICON, SYSTEM_ICON } from "@/components/layout/headerNavIcons";
import {
  getSystemItemPathPrefix,
  type HeaderNavGroups,
} from "@/config/headerNav";
import { getAreaHref, type AppArea } from "@/config/appAccess";
import { useAlertasAbertosCount } from "@/hooks/useAlertasAbertosCount";

type HeaderDesktopNavProps = {
  groups: HeaderNavGroups;
  getAreaLabel: (area: AppArea) => string;
};

export function HeaderDesktopNav({
  groups,
  getAreaLabel,
}: HeaderDesktopNavProps) {
  const pathname = usePathname();
  const alertasAbertosCount = useAlertasAbertosCount();

  const isActive = (path: string) =>
    pathname === path || (pathname?.startsWith(path + "/") ?? false);

  const areaItems = (areas: AppArea[]) =>
    areas.map((area) => {
      const href = getAreaHref(area);
      return {
        href,
        label: getAreaLabel(area),
        icon: AREA_ICON[area],
        active: isActive(href),
      };
    });

  const maisItems = areaItems(groups.mais);
  const sistemaItems = groups.sistema.map((item) => {
    const prefix = getSystemItemPathPrefix(item);
    return {
      href: item.href,
      label: item.label,
      icon: SYSTEM_ICON[item.id],
      active: isActive(prefix),
    };
  });

  const maisActive = maisItems.some((i) => i.active);
  const sistemaActive = sistemaItems.some((i) => i.active);
  const showSecondary = maisItems.length > 0 || sistemaItems.length > 0;

  return (
    <nav
      className="hidden lg:flex flex-1 min-w-0 items-center gap-0.5"
      aria-label="Navegação principal"
    >
      {groups.principal.map((area) => {
        const href =
          area === "alertas" && alertasAbertosCount > 0
            ? "/alertas?status=ABERTO"
            : getAreaHref(area);
        return (
          <HeaderNavLink
            key={area}
            href={href}
            label={getAreaLabel(area)}
            icon={AREA_ICON[area]}
            active={isActive(getAreaHref(area))}
            variant="desktop"
            badgeCount={area === "alertas" ? alertasAbertosCount : undefined}
          />
        );
      })}
      {showSecondary ? (
        <span
          className="mx-1 hidden h-6 w-px shrink-0 bg-border lg:block"
          aria-hidden
        />
      ) : null}
      <HeaderNavPopover
        triggerLabel="Mais"
        ariaLabel="Mais opções de navegação"
        items={maisItems}
        triggerActive={maisActive}
      />
      <HeaderNavPopover
        triggerLabel="Sistema"
        ariaLabel="Administração e sistema"
        items={sistemaItems}
        triggerActive={sistemaActive}
      />
    </nav>
  );
}
