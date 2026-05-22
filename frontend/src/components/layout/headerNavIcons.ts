import {
  Building2,
  List,
  Droplets,
  Layers,
  ClipboardList,
  Wheat,
  CalendarDays,
  Users,
  Code,
  type LucideIcon,
} from "lucide-react";
import type { AppArea } from "@/config/appAccess";
import type { HeaderNavSystemId } from "@/config/headerNav";

export const AREA_ICON: Record<AppArea, LucideIcon> = {
  fazendas: Building2,
  animais: List,
  producao: Droplets,
  lotes: Layers,
  agricultura: Wheat,
  gestao: ClipboardList,
  folgas: CalendarDays,
};

export const SYSTEM_ICON: Record<HeaderNavSystemId, LucideIcon> = {
  fazendas: Building2,
  admin: Users,
  "dev-studio": Code,
};
