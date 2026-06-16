import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar, MobileTabBar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, employee, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [session, loading, navigate]);

  // Aplica separação de painéis por papel.
  useEffect(() => {
    if (!employee) return;
    const isAdmin = employee.role === "admin";
    if (isAdmin && pathname.startsWith("/app")) {
      navigate({ to: "/admin/dashboard", replace: true });
    } else if (!isAdmin && pathname.startsWith("/admin")) {
      navigate({ to: "/app/agenda", replace: true });
    }
  }, [employee, pathname, navigate]);

  if (loading || !session) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background)", color: "var(--muted-foreground)" }}
      >
        Carregando...
      </div>
    );
  }

  if (!employee) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          Conta sem perfil de funcionário
        </h1>
        <p className="text-sm max-w-md" style={{ color: "var(--muted-foreground)" }}>
          Seu usuário não está vinculado a um registro de funcionário. Peça ao admin para criar seu acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: "var(--background)" }}>
      <AppSidebar />
      <main className="flex-1 min-w-0 pb-[80px] md:pb-0">
        <RefreshBar />
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}

function RefreshBar() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
    toast.success("Dados atualizados");
  };
  return (
    <div
      className="flex justify-end items-center px-4 py-2 border-b"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isFetching > 0}
        aria-label="Atualizar dados"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isFetching > 0 ? "animate-spin" : ""}`} />
        Atualizar
      </Button>
    </div>
  );
}
