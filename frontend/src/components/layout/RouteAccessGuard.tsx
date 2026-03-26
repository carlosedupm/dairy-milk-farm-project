"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDefaultLandingPath,
  isPathAllowedForPerfil,
} from "@/config/appAccess";

export function RouteAccessGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user?.perfil) return;
    if (isPathAllowedForPerfil(user.perfil, pathname ?? "/")) return;
    router.replace(getDefaultLandingPath(user.perfil));
  }, [isReady, isAuthenticated, user?.perfil, pathname, router]);

  return <>{children}</>;
}
