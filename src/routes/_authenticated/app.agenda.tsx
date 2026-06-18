import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Check, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PlatformBadge } from "@/components/platform-badge";
import {
  todayStr,
  todayWeekday,
  nowHHMM,
  minutesBetween,
} from "@/lib/utils-date";
import type {
  Client,
  Project,
  SocialProfile,
  ScheduledPost,
  PostCompletion,
} from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  component: MinhaAgendaPage,
});

interface AgendaItem {
  post: ScheduledPost;
  profile: SocialProfile;
  project: Project;
  client: Client;
}

function MinhaAgendaPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const today = todayStr();
  const dow = todayWeekday();
  const [now, setNow] = useState(nowHHMM());

  useEffect(() => {
    const i = setInterval(() => setNow(nowHHMM()), 30_000);
    return () => clearInterval(i);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["app-agenda-data"],
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
    queryKey: ["app-completions", today],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("post_completions")
        .select("*")
        .eq("completed_date", today);
      return (data ?? []) as PostCompletion[];
    },
  });

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

  const total = agenda.length;
  const done = agenda.filter((a) => completionMap.has(a.post.id)).length;

  const toggleCompletion = useMutation({
    mutationFn: async (item: AgendaItem) => {
      const existing = completionMap.get(item.post.id);
      if (existing) {
        const { error } = await supabase
          .from("post_completions")
          .delete()
          .eq("id", existing.id);
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["app-completions", today] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>
          Minha agenda de hoje
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          {total === 0
            ? "Nada agendado para hoje."
            : `${done} de ${total} concluídos.`}
        </p>
      </header>

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
      ) : agenda.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Nada agendado para hoje
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Quando houver posts dos seus clientes para hoje, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {agenda.map((item) => {
            const isDone = completionMap.has(item.post.id);
            const late = !isDone && minutesBetween(item.post.post_time, now) > 0;
            const soon =
              !isDone &&
              minutesBetween(now, item.post.post_time) > 0 &&
              minutesBetween(now, item.post.post_time) <= 30;
            let tint = "var(--card)";
            if (isDone) tint = "var(--success-bg)";
            else if (late) tint = "var(--danger-bg)";
            else if (soon) tint = "var(--warning-bg)";

            return (
              <li
                key={item.post.id}
                className="flex items-center gap-3 rounded-lg border p-3"
                style={{ backgroundColor: tint, borderColor: "var(--border-subtle)" }}
              >
                <Clock className="size-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                <span
                  className="text-sm font-mono tabular-nums w-12"
                  style={{ color: "var(--accent)" }}
                >
                  {item.post.post_time}
                </span>
                <div
                  className="size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: item.client.color_hex ?? "#6366F1", color: "#fff" }}
                  aria-hidden
                >
                  {item.client.avatar_initials ||
                    item.client.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {item.client.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {item.project.name} · {item.post.label || item.post.post_type}
                  </p>
                </div>
                <PlatformBadge platform={item.profile.platform} />
                {item.profile.url && (
                  <a
                    href={item.profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-[var(--card-hover)]"
                    aria-label={`Abrir ${item.profile.handle}`}
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                <button
                  onClick={() => toggleCompletion.mutate(item)}
                  disabled={toggleCompletion.isPending}
                  aria-pressed={isDone}
                  aria-label={isDone ? "Marcar como pendente" : "Marcar como publicado"}
                  className="size-7 rounded-md flex items-center justify-center border transition-colors"
                  style={{
                    backgroundColor: isDone ? "var(--success)" : "transparent",
                    borderColor: isDone ? "var(--success)" : "var(--border)",
                    color: isDone ? "#fff" : "var(--muted-foreground)",
                  }}
                >
                  {isDone && <Check className="size-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
