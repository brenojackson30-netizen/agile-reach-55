import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Check, Clock, ExternalLink, Bell } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PermissionGate } from "@/components/permission-gate";
import { PlatformBadge } from "@/components/platform-badge";
import {
  todayStr,
  todayWeekday,
  nowHHMM,
  minutesBetween,
} from "@/lib/utils-date";
import { runSeedIfEmpty } from "@/lib/seed";
import type {
  Client,
  Project,
  SocialProfile,
  ScheduledPost,
  PostCompletion,
} from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: DashboardPage,
});

interface AgendaItem {
  post: ScheduledPost;
  profile: SocialProfile;
  project: Project;
  client: Client;
}

function DashboardPage() {
  const { session, employee } = useAuth();
  const qc = useQueryClient();
  const today = todayStr();
  const dow = todayWeekday();
  const [now, setNow] = useState(nowHHMM());

  // Relógio
  useEffect(() => {
    const i = setInterval(() => setNow(nowHHMM()), 30_000);
    return () => clearInterval(i);
  }, []);

  // Invalidação ao voltar à aba (bug 2)
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) {
        qc.invalidateQueries({ queryKey: ["completions"] });
        qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [qc]);

  // Seed automático para admin se DB vazio
  useEffect(() => {
    if (employee?.role === "admin") {
      runSeedIfEmpty().then((seeded) => {
        if (seeded) {
          toast.success("Seed inicial criado!");
          qc.invalidateQueries();
        }
      });
    }
  }, [employee?.role, qc]);

  // Carrega clientes, projetos, profiles e posts (RLS já filtra)
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data"],
    enabled: !!session,
    queryFn: async () => {
      const [clients, projects, profiles, posts] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("projects").select("*"),
        supabase.from("social_profiles").select("*"),
        supabase.from("scheduled_posts").select("*"),
      ]);
      return {
        clients: (clients.data ?? []) as Client[],
        projects: (projects.data ?? []) as Project[],
        profiles: (profiles.data ?? []) as SocialProfile[],
        posts: (posts.data ?? []) as ScheduledPost[],
      };
    },
  });

  const { data: completions } = useQuery({
    queryKey: ["completions", today],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("post_completions")
        .select("*")
        .eq("completed_date", today);
      return (data ?? []) as PostCompletion[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("dash-completions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_completions", filter: `completed_date=eq.${today}` },
        () => qc.invalidateQueries({ queryKey: ["completions", today] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_assignments" },
        () => {
          qc.invalidateQueries({ queryKey: ["dashboard-data"] });
          qc.invalidateQueries({ queryKey: ["clients-list"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session, today, qc]);

  const completionMap = useMemo(() => {
    const m = new Map<string, PostCompletion>();
    (completions ?? []).forEach((c) => m.set(c.scheduled_post_id, c));
    return m;
  }, [completions]);

  const agenda: AgendaItem[] = useMemo(() => {
    if (!data) return [];
    const profById = new Map(data.profiles.map((p) => [p.id, p]));
    const projById = new Map(data.projects.map((p) => [p.id, p]));
    const cliById = new Map(data.clients.map((c) => [c.id, c]));
    return data.posts
      .filter((p) => p.days.includes(dow))
      .map((post) => {
        const profile = profById.get(post.profile_id);
        const project = profile ? projById.get(profile.project_id) : undefined;
        const client = project ? cliById.get(project.client_id) : undefined;
        if (!profile || !project || !client) return null;
        return { post, profile, project, client };
      })
      .filter((x): x is AgendaItem => !!x)
      .sort((a, b) => a.post.post_time.localeCompare(b.post.post_time));
  }, [data, dow]);

  const groupedByTime = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    agenda.forEach((it) => {
      const arr = map.get(it.post.post_time) ?? [];
      arr.push(it);
      map.set(it.post.post_time, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [agenda]);

  const stats = useMemo(() => {
    const total = agenda.length;
    const done = agenda.filter((a) => completionMap.has(a.post.id)).length;
    const late = agenda.filter(
      (a) => !completionMap.has(a.post.id) && minutesBetween(a.post.post_time, now) > 0
    ).length;
    const dueSoon = agenda.filter(
      (a) => !completionMap.has(a.post.id) && minutesBetween(now, a.post.post_time) > 0 && minutesBetween(now, a.post.post_time) <= 30
    ).length;
    const assigned = data?.clients.length ?? 0;
    return { total, done, late, dueSoon, assigned };
  }, [agenda, completionMap, now, data]);

  const toggleCompletion = useMutation({
    mutationFn: async (item: AgendaItem) => {
      const existing = completionMap.get(item.post.id);
      if (existing) {
        const { error } = await supabase.from("post_completions").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_completions").insert({
          post_id: item.post.id,
          scheduled_post_id: item.post.id,
          completed_date: today,
          completed_by: session?.user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["completions", today] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Acompanhe a agenda do dia em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.dueSoon > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
              style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning)" }}
              role="status"
              aria-live="polite"
            >
              <Bell className="size-3.5" />
              {stats.dueSoon} em até 30min
            </div>
          )}
          <time
            className="text-sm font-mono tabular-nums hidden sm:block"
            style={{ color: "var(--muted-foreground)" }}
          >
            {now}
          </time>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Clientes Atribuídos" value={stats.assigned} />
        <StatCard label="Posts Hoje" value={stats.total} />
        <StatCard label="Concluídos" value={stats.done} color="var(--success)" />
        <StatCard label="Atrasados" value={stats.late} color="var(--danger)" />
      </div>

      {/* Progresso */}
      <div
        className="rounded-xl border p-4 mb-6"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Progresso do dia
          </span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
            {stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100)}%
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--border-subtle)" }}
          role="progressbar"
          aria-valuenow={stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${stats.total === 0 ? 0 : (stats.done / stats.total) * 100}%`,
              backgroundColor: "var(--accent)",
            }}
          />
        </div>
      </div>

      {/* Agenda */}
      <section aria-label="Agenda do dia">
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          Agenda do Dia
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg animate-pulse"
                style={{ backgroundColor: "var(--card)" }}
              />
            ))}
          </div>
        ) : groupedByTime.length === 0 ? (
          <EmptyState
            title="Nenhum post agendado para hoje"
            description="Quando posts forem agendados eles aparecerão aqui."
          />
        ) : (
          <div className="space-y-6">
            {groupedByTime.map(([time, items]) => (
              <div key={time}>
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="size-4" style={{ color: "var(--muted-foreground)" }} />
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                    {time}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
                </div>
                <ul className="space-y-2">
                  {items.map((item) => {
                    const done = completionMap.has(item.post.id);
                    const late = !done && minutesBetween(item.post.post_time, now) > 0;
                    const soon =
                      !done &&
                      minutesBetween(now, item.post.post_time) > 0 &&
                      minutesBetween(now, item.post.post_time) <= 30;

                    let tint = "var(--card)";
                    if (done) tint = "var(--success-bg)";
                    else if (late) tint = "var(--danger-bg)";
                    else if (soon) tint = "var(--warning-bg)";

                    return (
                      <li
                        key={item.post.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                        style={{ backgroundColor: tint, borderColor: "var(--border-subtle)" }}
                      >
                        <div
                          className="size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: item.client.color_hex ?? "#6366F1", color: "#fff" }}
                          aria-hidden="true"
                        >
                          {item.client.avatar_initials || item.client.name.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                            {item.client.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                            {item.project.name} {item.post.label ? `• ${item.post.label}` : ""}
                          </p>
                        </div>

                        <PlatformBadge platform={item.profile.platform} />

                        <span
                          className="hidden md:inline-block text-xs px-2 py-0.5 rounded-md capitalize"
                          style={{ backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" }}
                        >
                          {item.post.post_type}
                        </span>

                        {item.profile.url && (
                          <a
                            href={item.profile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-[var(--card-hover)]"
                            aria-label={`Abrir ${item.profile.handle} em nova aba`}
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}

                        <PermissionGate
                          require="editor"
                          fallback={
                            done ? (
                              <span
                                className="size-7 rounded-md flex items-center justify-center"
                                style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }}
                                aria-label="Concluído"
                              >
                                <Check className="size-4" />
                              </span>
                            ) : (
                              <span
                                className="size-7 rounded-md border"
                                style={{ borderColor: "var(--border)" }}
                                aria-label="Pendente"
                              />
                            )
                          }
                        >
                          <button
                            onClick={() => toggleCompletion.mutate(item)}
                            disabled={toggleCompletion.isPending}
                            aria-label={done ? "Marcar como pendente" : "Marcar como concluído"}
                            aria-pressed={done}
                            className="size-7 rounded-md flex items-center justify-center border transition-colors"
                            style={{
                              backgroundColor: done ? "var(--success)" : "transparent",
                              borderColor: done ? "var(--success)" : "var(--border)",
                              color: done ? "#fff" : "var(--muted-foreground)",
                            }}
                          >
                            {done && <Check className="size-4" />}
                          </button>
                        </PermissionGate>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="rounded-xl border p-10 text-center"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
        {title}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
        {description}
      </p>
    </div>
  );
}
