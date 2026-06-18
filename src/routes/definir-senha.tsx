import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [inviteTokenHash, setInviteTokenHash] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const errorCode = url.searchParams.get("error_code") || hashParams.get("error_code");
    const errorDescription =
      url.searchParams.get("error_description") || hashParams.get("error_description");
    const tokenHash = url.searchParams.get("token_hash") || hashParams.get("token_hash");
    const type = url.searchParams.get("type") || hashParams.get("type");

    if (errorCode) {
      const message =
        errorCode === "otp_expired"
          ? "Este convite já foi usado ou expirou. Peça um novo convite ao administrador."
          : errorDescription || "Não foi possível validar este convite.";
      setInviteError(message);
      setReady(true);
      return () => {
        mounted = false;
      };
    }

    if (tokenHash && type === "invite") {
      setInviteTokenHash(tokenHash);
      setReady(true);
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        setInviteError("Link inválido ou expirado. Peça um novo convite ao administrador.");
        setReady(true);
        return;
      }
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    if (inviteTokenHash) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: inviteTokenHash,
        type: "invite",
      });
      if (verifyError) {
        setSubmitting(false);
        toast.error("Convite inválido ou expirado. Peça um novo convite ao administrador.");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error("Falha ao definir senha: " + error.message);
      return;
    }
    toast.success("Senha definida! Bem-vindo.");
    navigate({ to: "/app/agenda", replace: true });
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
          Defina sua senha
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
          Crie uma senha para acessar sua conta.
        </p>

        {!ready ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Validando convite...
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Nova senha (mín. 8)
              </label>
              <input
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
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Confirme a senha
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md py-2.5 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              {submitting ? "Salvando..." : "Definir senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
