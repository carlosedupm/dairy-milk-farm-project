"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HeaderBuscaTrigger } from "@/components/layout/HeaderBuscaTrigger";
import { HEADER_MOBILE_DRAWER_ID } from "@/components/layout/headerMobileDrawerIds";
import { userIdentityInitials } from "@/components/layout/UserIdentitySummary";
import type { IdentityUser } from "@/components/layout/UserIdentitySummary";
import { Menu } from "lucide-react";

type HeaderMobileBarProps = {
  showBuscaAnimal: boolean;
  user: IdentityUser | null;
  mobileIdentityLabel: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
  menuTriggerRef: React.RefObject<HTMLButtonElement | null>;
};

export function HeaderMobileBar({
  showBuscaAnimal,
  user,
  mobileIdentityLabel,
  menuOpen,
  onOpenMenu,
  menuTriggerRef,
}: HeaderMobileBarProps) {
  const pathname = usePathname();

  return (
    <div className="flex lg:hidden min-w-0 flex-1 items-center gap-1 ml-auto">
      {showBuscaAnimal ? <HeaderBuscaTrigger key={pathname} compact /> : null}
      {user ? (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-foreground"
          aria-label={mobileIdentityLabel}
          title={mobileIdentityLabel}
        >
          {userIdentityInitials(user)}
        </div>
      ) : null}
      <Button
        ref={menuTriggerRef}
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls={HEADER_MOBILE_DRAWER_ID}
        onClick={onOpenMenu}
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
}
