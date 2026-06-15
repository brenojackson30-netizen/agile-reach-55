import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar, MobileTabBar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, employee, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [session, loading, navigate]);

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
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
