import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Client, Project, ScheduledPost, SocialProfile } from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const { employee } = useAuth();
  const isAdmin = employee?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const [c, p, sp, posts] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("projects").select("*"),
        supabase.from("social_profiles").select("*"),
        supabase.from("scheduled_posts").select("*"),
      ]);
      return {
        clients: (c.data ?? []) as Client[],
        projects: (p.data ?? []) as Project[],
        profiles: (sp.data ?? []) as SocialProfile[],
        posts: (posts.data ?? []) as ScheduledPost[],
      };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.clients
      .filter((c) => (term ? c.name.toLowerCase().includes(term) : true))
      .map((c) => {
        const projs = data.projects.filter((p) => p.client_id === c.id);
        const profIds = data.profiles.filter((sp) => projs.some((p) => p.id === sp.project_id)).map((sp) => sp.id);
        const dailyPosts = data.posts.filter((po) => profIds.includes(po.profile_id)).length;
        return { client: c, projectCount: projs.length, dailyPosts };
      });
  }, [data, search]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            Clientes
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Gerencie os clientes da agência.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <Plus className="size-4" /> Novo cliente
          </button>
        )}
      </header>

      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--muted-foreground)" }}
          aria-hidden
        />
        <label htmlFor="search" className="sr-only">
          Buscar
        </label>
        <input
          id="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full rounded-md border pl-9 pr-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl animate-pulse"
              style={{ backgroundColor: "var(--card)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Nenhum cliente encontrado
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Peça ao admin para te atribuir clientes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(({ client, projectCount, dailyPosts }) => (
            <div
              key={client.id}
              className="relative rounded-xl border transition-colors hover:bg-[var(--card-hover)]"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <Link
                to="/admin/clientes/$id"
                params={{ id: client.id }}
                className="block p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="size-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: client.color_hex ?? "#6366F1", color: "#fff" }}
                    aria-hidden
                  >
                    {client.avatar_initials || client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate pr-8" style={{ color: "var(--foreground)" }}>
                      {client.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                      {client.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <span>
                    <strong style={{ color: "var(--foreground)" }}>{projectCount}</strong> projetos
                  </span>
                  <span>
                    <strong style={{ color: "var(--foreground)" }}>{dailyPosts}</strong> posts/dia
                  </span>
                  <span
                    className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor:
                        client.status === "active" ? "var(--success-bg)" : "var(--secondary)",
                      color: client.status === "active" ? "var(--success)" : "var(--muted-foreground)",
                    }}
                  >
                    {client.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </Link>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditing(client);
                  }}
                  aria-label={`Editar ${client.name}`}
                  className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-hover)] border"
                  style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--card)" }}
                >
                  <Pencil className="size-3.5" style={{ color: "var(--muted-foreground)" }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
      {editing && <EditClientModal client={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [color, setColor] = useState("#6366F1");

  const create = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome é obrigatório");
      const initials = trimmed
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const { error } = await supabase.from("clients").insert({
        name: trimmed,
        category: category.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        color_hex: color,
        avatar_initials: initials,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente criado");
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      qc.invalidateQueries({ queryKey: ["all-clients-admin"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="font-semibold" style={{ color: "var(--foreground)" }}>Novo cliente</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-1 rounded-md hover:bg-[var(--card-hover)]">
            <X className="size-4" style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>
        <form
          className="p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Input label="Nome *" value={name} onChange={setName} required />
          <Input label="Categoria" value={category} onChange={setCategory} placeholder="Ex: Moda, Restaurante..." />
          <Input label="E-mail de contato" value={email} onChange={setEmail} type="email" />
          <Input label="Telefone" value={phone} onChange={setPhone} />
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Cor</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-16 rounded-md border cursor-pointer"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="w-full rounded-md py-2 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {create.isPending ? "Criando..." : "Criar cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none"
        style={{
          backgroundColor: "var(--background)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      />
    </div>
  );
}
