import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlatformBadge } from "@/components/platform-badge";
import {
  dateAtSPWeekStart,
  fmtDateYMD,
  todayStr,
  WEEKDAYS_SHORT,
  weekdayOf,
} from "@/lib/utils-date";
import type { Client, Project, ScheduledPost, SocialProfile } from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

function AgendaPage() {
  const week = dateAtSPWeekStart();
  const today = todayStr();
  const [selected, setSelected] = useState<string>(today);

  const { data, isLoading } = useQuery({
    queryKey: ["agenda-week"],
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

  const countsPerDay = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    week.forEach((d) => {
      const ymd = fmtDateYMD(d);
      const dow = weekdayOf(d);
      const count = data.posts.filter((p) => p.days.includes(dow)).length;
      map.set(ymd, count);
    });
    return map;
  }, [data, week]);

  const selectedItems = useMemo(() => {
    if (!data) return [];
    const dow = weekdayOf(new Date(selected + "T12:00:00"));
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
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.post.post_time.localeCompare(b.post.post_time));
  }, [data, selected]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>
          Agenda
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Visão semanal de posts agendados.
        </p>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist">
        {week.map((d) => {
          const ymd = fmtDateYMD(d);
          const isActive = ymd === selected;
          const count = countsPerDay.get(ymd) ?? 0;
          const dow = weekdayOf(d);
          const isToday = ymd === today;
          return (
            <button
              key={ymd}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(ymd)}
              data-active={isActive ? "true" : undefined}
              className="flex flex-col items-center min-w-[68px] py-2 px-3 rounded-lg border text-xs transition-colors"
              style={{
                backgroundColor: isActive ? "var(--accent-bg)" : "var(--card)",
                borderColor: isActive ? "var(--accent)" : "var(--border)",
                color: isActive ? "var(--accent)" : "var(--muted-foreground)",
              }}
            >
              <span className="uppercase font-medium">{WEEKDAYS_SHORT[dow]}</span>
              <span className="text-base font-bold tabular-nums" style={{ color: isActive ? "var(--accent)" : "var(--foreground)" }}>
                {d.getDate()}
              </span>
              <span
                className="mt-1 text-[10px] px-1.5 rounded-full"
                style={{
                  backgroundColor: "var(--secondary)",
                  color: "var(--muted-foreground)",
                }}
              >
                {count}
              </span>
              {isToday && (
                <span className="text-[9px] mt-0.5" style={{ color: "var(--accent)" }}>
                  HOJE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: "var(--card)" }} />
          ))}
        </div>
      ) : selectedItems.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Nenhum post para este dia.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {selectedItems.map((it) => (
            <li
              key={it.post.id}
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-subtle)" }}
            >
              <span className="text-sm font-mono tabular-nums w-12" style={{ color: "var(--accent)" }}>
                {it.post.post_time}
              </span>
              <div
                className="size-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: it.client.color_hex ?? "#6366F1", color: "#fff" }}
                aria-hidden
              >
                {it.client.avatar_initials || it.client.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                  {it.client.name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                  {it.project.name} · {it.post.label || it.post.post_type}
                </p>
              </div>
              <PlatformBadge platform={it.profile.platform} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
