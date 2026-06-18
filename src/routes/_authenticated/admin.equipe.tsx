import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createEmployee } from "@/lib/api/admin.functions";
import type { Client, ClientAssignment, Employee, PostCompletion, Role } from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/admin/equipe")({
  component: EquipePage,
});

function EquipePage() {
  const { employee, loading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Employee | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!loading && employee && employee.role !== "admin") {
      navigate({ to: "/admin/dashboard", replace: true });
    }
  }, [employee, loading, navigate]);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    enabled: employee?.role === "admin",
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").order("created_at");
      return (data ?? []) as Employee[];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["all-assignments"],
    enabled: employee?.role === "admin",
    queryFn: async () => {
      const { data } = await supabase.from("client_assignments").select("*");
      return (data ?? []) as ClientAssignment[];
    },
  });

  if (employee?.role !== "admin") return null;

  const countFor = (empId: string) =>
    (assignments ?? []).filter((a) => a.employee_id === empId).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            Equipe
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Gerencie funcionários e clientes atribuídos.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          <Plus className="size-4" /> Novo funcionário
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--card)" }} />
          ))}
        </div>
      ) : !employees || employees.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Nenhum funcionário cadastrado.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--card)" }}>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Clientes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: "var(--card)" }}>
              {employees.map((e) => (
                <tr
                  key={e.id}
                  className="border-t"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
                >
                  <td className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: "var(--accent-bg)", color: "var(--accent)" }}
                    >
                      {e.avatar_initials || e.name.slice(0, 2).toUpperCase()}
                    </div>
                    {e.name}
                  </td>
                  <td className="px-4 py-3 capitalize">{e.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor:
                          e.status === "active" ? "var(--success-bg)" : "var(--secondary)",
                        color: e.status === "active" ? "var(--success)" : "var(--muted-foreground)",
                      }}
                    >
                      {e.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{countFor(e.id)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(e)}
                      className="text-xs px-3 py-1.5 rounded-md"
                      style={{ backgroundColor: "var(--accent-bg)", color: "var(--accent)" }}
                    >
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <EmployeeModal employee={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EmployeeModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const qc = useQueryClient();
  const { employee: me } = useAuth();
  const [role, setRole] = useState<Role>(employee.role);
  const [status, setStatus] = useState(employee.status);
  const [tab, setTab] = useState<"info" | "clients">("info");

  const { data: clients } = useQuery({
    queryKey: ["all-clients-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").order("name");
      return (data ?? []) as Client[];
    },
  });

  const { data: myAssignments } = useQuery({
    queryKey: ["assignments-of", employee.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_assignments")
        .select("*")
        .eq("employee_id", employee.id);
      return (data ?? []) as ClientAssignment[];
    },
  });

  const assignedIds = new Set((myAssignments ?? []).map((a) => a.client_id));

  const saveInfo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("employees")
        .update({ role, status })
        .eq("id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informações atualizadas");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAssign = useMutation({
    mutationFn: async (clientId: string) => {
      const existing = (myAssignments ?? []).find((a) => a.client_id === clientId);
      if (existing) {
        const { error } = await supabase
          .from("client_assignments")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_assignments")
          .insert({ employee_id: employee.id, client_id: clientId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments-of", employee.id] });
      qc.invalidateQueries({ queryKey: ["all-assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSelf = me?.id === employee.id;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emp-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h2 id="emp-title" className="font-semibold" style={{ color: "var(--foreground)" }}>
            {employee.name}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="p-1 rounded-md hover:bg-[var(--card-hover)]">
            <X className="size-4" style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: "var(--border-subtle)" }}>
          {(["info", "clients"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-active={tab === t ? "true" : undefined}
              className="px-4 py-2.5 text-sm"
              style={{
                color: tab === t ? "var(--accent)" : "var(--muted-foreground)",
              }}
            >
              {t === "info" ? "Informações" : "Clientes Atribuídos"}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {tab === "info" ? (
            <div className="space-y-4">
              <Field label="Papel">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={isSelf}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                {isSelf && (
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                    Você não pode alterar seu próprio papel.
                  </p>
                )}
              </Field>

              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Employee["status"])}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </Field>

              <button
                onClick={() => saveInfo.mutate()}
                disabled={saveInfo.isPending}
                className="w-full rounded-md py-2 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {saveInfo.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          ) : (
            <div>
              {!clients || clients.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
                  Nenhum cliente cadastrado.
                </p>
              ) : (
                <ul className="space-y-1">
                  {clients.map((c) => {
                    const on = assignedIds.has(c.id);
                    return (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-md"
                        style={{ backgroundColor: "var(--background)" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: c.color_hex ?? "#6366F1", color: "#fff" }}
                          >
                            {c.avatar_initials || c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-sm truncate" style={{ color: "var(--foreground)" }}>
                            {c.name}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleAssign.mutate(c.id)}
                          role="switch"
                          aria-checked={on}
                          aria-label={`Atribuir ${c.name}`}
                          className="relative h-5 w-9 rounded-full transition-colors"
                          style={{ backgroundColor: on ? "var(--accent)" : "var(--border)" }}
                        >
                          <span
                            className="absolute top-0.5 size-4 rounded-full bg-white transition-transform"
                            style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
