import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformBadge } from "@/components/platform-badge";
import { WEEKDAYS_SHORT } from "@/lib/utils-date";
import type { Client, Project, ScheduledPost, SocialProfile } from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  component: ClienteDetail,
});

function ClienteDetail() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: async () => {
      const [c, p, sp, posts] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase.from("projects").select("*").eq("client_id", id),
        supabase.from("social_profiles").select("*"),
        supabase.from("scheduled_posts").select("*"),
      ]);
      const projects = (p.data ?? []) as Project[];
      const projectIds = new Set(projects.map((x) => x.id));
      const profiles = ((sp.data ?? []) as SocialProfile[]).filter((x) => projectIds.has(x.project_id));
      const profileIds = new Set(profiles.map((x) => x.id));
      const schedule = ((posts.data ?? []) as ScheduledPost[]).filter((x) => profileIds.has(x.profile_id));
      return {
        client: (c.data as Client | null) ?? null,
        projects,
        profiles,
        schedule,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: "var(--card)" }} />
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "var(--muted-foreground)" }}>Cliente não encontrado.</p>
        <Link to="/admin/clientes" className="text-sm" style={{ color: "var(--accent)" }}>
          Voltar
        </Link>
      </div>
    );
  }

  const c = data.client;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link
        to="/admin/clientes"
        className="inline-flex items-center gap-2 text-sm mb-4 hover:text-[var(--accent)]"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <header
        className="rounded-xl border p-5 mb-6 flex items-center gap-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="size-14 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: c.color_hex ?? "#6366F1", color: "#fff" }}
        >
          {c.avatar_initials || c.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {c.name}
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {c.category || "—"}
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-md"
          style={{
            backgroundColor: c.status === "active" ? "var(--success-bg)" : "var(--secondary)",
            color: c.status === "active" ? "var(--success)" : "var(--muted-foreground)",
          }}
        >
          {c.status === "active" ? "Ativo" : "Inativo"}
        </span>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          Projetos
        </h2>
        {data.projects.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Sem projetos.
          </p>
        ) : (
          data.projects.map((proj) => {
            const profs = data.profiles.filter((sp) => sp.project_id === proj.id);
            return (
              <div
                key={proj.id}
                className="rounded-xl border p-4"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                  {proj.name}
                </h3>
                {profs.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    Sem perfis cadastrados.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {profs.map((sp) => {
                      const posts = data.schedule
                        .filter((x) => x.profile_id === sp.id)
                        .sort((a, b) => a.post_time.localeCompare(b.post_time));
                      return (
                        <li
                          key={sp.id}
                          className="rounded-lg border p-3"
                          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--background)" }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <PlatformBadge platform={sp.platform} />
                            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                              {sp.handle}
                            </span>
                            {sp.url && (
                              <a
                                href={sp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Abrir ${sp.handle} em nova aba`}
                                className="ml-auto"
                                style={{ color: "var(--muted-foreground)" }}
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                          {posts.length === 0 ? (
                            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                              Sem horários agendados.
                            </p>
                          ) : (
                            <ul className="text-xs space-y-1" style={{ color: "var(--muted-foreground)" }}>
                              {posts.map((po) => (
                                <li key={po.id}>
                                  <span className="tabular-nums" style={{ color: "var(--foreground)" }}>
                                    {po.post_time}
                                  </span>{" "}
                                  · {po.post_type}
                                  {po.label ? ` · ${po.label}` : ""} ·{" "}
                                  {po.days.length === 7
                                    ? "todos os dias"
                                    : po.days.map((d) => WEEKDAYS_SHORT[d]).join(", ")}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
