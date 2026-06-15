import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  UsersRound,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requireAdmin: false },
  { to: "/clientes", label: "Clientes", icon: Users, requireAdmin: false },
  { to: "/agenda", label: "Agenda", icon: Calendar, requireAdmin: false },
  { to: "/equipe", label: "Equipe", icon: UsersRound, requireAdmin: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings, requireAdmin: false },
];

export function AppSidebar() {
  const { employee, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = ITEMS.filter((i) => !i.requireAdmin || employee?.role === "admin");

  return (
    <aside
      className="hidden md:flex h-screen sticky top-0 flex-col border-r"
      style={{
        width: 240,
        backgroundColor: "var(--sidebar-bg)",
        borderColor: "var(--border-subtle)",
      }}
      aria-label="Navegação principal"
    >
      <div className="flex items-center gap-2 px-5 h-16 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <Zap className="size-5" style={{ color: "var(--accent)" }} />
        <span className="text-lg font-bold tracking-wide" style={{ color: "var(--accent)" }}>
          AGILE
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  data-active={active ? "true" : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-[var(--card-hover)]"
                  style={{ color: active ? "var(--accent)" : "var(--muted-foreground)" }}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {employee && (
        <div
          className="border-t p-3 flex items-center gap-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div
            className="size-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ backgroundColor: "var(--accent-bg)", color: "var(--accent)" }}
            aria-hidden="true"
          >
            {employee.avatar_initials || employee.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
              {employee.name}
            </p>
            <p className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>
              {employee.role}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Sair"
            className="p-2 rounded-md hover:bg-[var(--card-hover)] transition-colors"
            style={{ color: "var(--muted-foreground)" }}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      )}
    </aside>
  );
}

export function MobileTabBar() {
  const { employee } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = ITEMS.filter((i) => !i.requireAdmin || employee?.role === "admin");

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex items-center justify-around h-[60px] z-[100]"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderColor: "var(--border-subtle)",
      }}
      aria-label="Navegação inferior"
    >
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px]"
            style={{ color: active ? "var(--accent)" : "var(--muted-foreground)" }}
          >
            <Icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
