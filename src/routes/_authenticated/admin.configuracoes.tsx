import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  const { employee, session, refreshEmployee, signOut } = useAuth();
  const [name, setName] = useState(employee?.name ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    if (!employee) return;
    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .update({ name, avatar_initials: name.slice(0, 2).toUpperCase() })
      .eq("id", employee.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshEmployee();
    toast.success("Nome atualizado");
  };

  const savePassword = async () => {
    if (!password) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Senha atualizada");
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>
          Configurações
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Gerencie sua conta e acesso.
        </p>
      </header>

      <section
        className="rounded-xl border p-5 mb-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Minha conta
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Nome
            </label>
            <input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <button
              onClick={saveName}
              disabled={saving}
              className="mt-2 text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Atualizar nome
            </button>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              E-mail
            </label>
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              {session?.user.email}
            </p>
          </div>

          <div>
            <label htmlFor="new-pass" className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Nova senha
            </label>
            <input
              id="new-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <button
              onClick={savePassword}
              disabled={saving || !password}
              className="mt-2 text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Atualizar senha
            </button>
          </div>
        </div>
      </section>

      <section
        className="rounded-xl border p-5 mb-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          Acesso
        </h2>
        <div className="text-sm space-y-2">
          <p style={{ color: "var(--muted-foreground)" }}>
            Papel:{" "}
            <span className="capitalize font-semibold" style={{ color: "var(--foreground)" }}>
              {employee?.role}
            </span>
          </p>
        </div>
      </section>

      <button
        onClick={signOut}
        className="text-sm px-4 py-2 rounded-md"
        style={{
          backgroundColor: "var(--danger-bg)",
          color: "var(--danger)",
        }}
      >
        Sair
      </button>
    </div>
  );
}
