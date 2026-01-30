"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AssistenteInput } from "@/components/assistente/AssistenteInput";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            CeialMilk
          </Link>
          <Link
            href="/fazendas"
            className={cn(
              "text-sm hover:text-foreground transition-colors",
              isActive("/fazendas")
                ? "text-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            Fazendas
          </Link>
          {user && user.perfil === "DEVELOPER" && (
            <Link
              href="/dev-studio"
              className={cn(
                "text-sm hover:text-foreground transition-colors",
                isActive("/dev-studio")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              Dev Studio
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 min-w-0 flex-1 justify-end max-w-md">
          <AssistenteInput />
          {user && (
            <span className="text-sm text-muted-foreground truncate hidden sm:inline">
              {user.email}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
