"use client";

import { PWAInstallPrompt } from "@/components/layout/PWAInstallPrompt";
import { PushPermissionBanner } from "@/components/layout/PushPermissionBanner";

export function HeaderBanners() {
  return (
    <>
      <PWAInstallPrompt />
      <PushPermissionBanner />
    </>
  );
}
