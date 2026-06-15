import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [session, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error("Falha no login: " + error.message);
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl border p-8"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="size-7" style={{ color: "var(--accent)" }} />
          <span className="text-2xl font-bold tracking-wide" style={{ color: "var(--accent)" }}>
            AGILE
          </span>
        </div>

        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          Entrar
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
          Acesse sua conta para continuar.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
          Acesso somente para contas criadas pelo admin.
        </p>
      </div>
    </main>
  );
}
