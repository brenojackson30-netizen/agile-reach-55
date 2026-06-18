import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Client, Project, ScheduledPost, SocialProfile } from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/app/clientes")({
  component: AppClientesPage,
});

function AppClientesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["app-clients-list"],
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
        const profIds = data.profiles
          .filter((sp) => projs.some((p) => p.id === sp.project_id))
          .map((sp) => sp.id);
        const dailyPosts = data.posts.filter((po) =>
          profIds.includes(po.profile_id)
        ).length;
        return { client: c, projectCount: projs.length, dailyPosts };
      });
  }, [data, search]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>
          Meus clientes
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Clientes atribuídos a você.
        </p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl animate-pulse"
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
            Nenhum cliente atribuído
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Peça ao admin para te atribuir clientes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(({ client, projectCount, dailyPosts }) => (
            <div
              key={client.id}
              className="relative rounded-xl border transition-colors hover:bg-[var(--card-hover)]"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <Link
                to="/app/clientes/$id"
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <span>
                    <strong style={{ color: "var(--foreground)" }}>{projectCount}</strong> projetos
                  </span>
                  <span>
                    <strong style={{ color: "var(--foreground)" }}>{dailyPosts}</strong> agendados/dia
                  </span>
                  <span title="Meta de posts por dia">
                    📝 <strong style={{ color: "var(--foreground)" }}>{client.posts_per_day ?? 0}</strong> posts/dia
                  </span>
                  <span title="Meta de vídeos por dia">
                    🎬 <strong style={{ color: "var(--foreground)" }}>{client.videos_per_day ?? 0}</strong> vídeos/dia
                  </span>
                </div>
              </Link>
              {client.client_link && (
                <a
                  href={client.client_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Abrir link de ${client.name}`}
                  className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-hover)] border"
                  style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--card)" }}
                >
                  <ExternalLink className="size-3.5" style={{ color: "var(--muted-foreground)" }} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
