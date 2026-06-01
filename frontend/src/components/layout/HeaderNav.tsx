"use client";

import { HeaderDesktopNav } from "@/components/layout/HeaderDesktopNav";
import type { HeaderNavGroups } from "@/config/headerNav";
import type { AppArea } from "@/config/appAccess";

type HeaderNavProps = {
  showNav: boolean;
  groups: HeaderNavGroups;
  getAreaLabel: (area: AppArea) => string;
};

export function HeaderNav({ showNav, groups, getAreaLabel }: HeaderNavProps) {
  if (!showNav) return null;
  return <HeaderDesktopNav groups={groups} getAreaLabel={getAreaLabel} />;
}
