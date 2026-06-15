import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Role } from "@/integrations/supabase/types";

const HIERARCHY: Record<Role, number> = { admin: 3, editor: 2, viewer: 1 };

interface Props {
  require: Role;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ require, children, fallback = null }: Props) {
  const { employee } = useAuth();
  const userLevel = HIERARCHY[employee?.role ?? "viewer"] ?? 0;
  const requiredLevel = HIERARCHY[require] ?? 0;
  return userLevel >= requiredLevel ? <>{children}</> : <>{fallback}</>;
}
