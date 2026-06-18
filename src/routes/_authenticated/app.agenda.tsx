import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Check, ExternalLink, FileText, Film } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { todayStr } from "@/lib/utils-date";
import type { Client, ClientAssignment } from "@/lib/agile-types";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  component: MinhaAgendaPage,
});

type Kind = "post" | "video";

interface DailyTaskCompletion {
  id: string;
  client_id: string;
  employee_id: string;
  completed_date: string;
  kind: Kind;
  task_index: number;
}

function MinhaAgendaPage() {
  const { session, employee } = useAuth();
  const qc = useQueryClient();
  const today = todayStr();

  const { data, isLoading } = useQuery({
    queryKey: ["app-agenda-assigned", employee?.id],
    enabled: !!session && !!employee?.id,
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from("client_assignments")
        .select("*")
        .eq("employee_id", employee!.id);
      const list = (assignments ?? []) as ClientAssignment[];
      const clientIds = Array.from(new Set(list.map((a) => a.client_id)));
      if (clientIds.length === 0) return { clients: [] as Client[] };
      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .in("id", clientIds);
      return {
        clients: ((clients ?? []) as Client[]).filter(
          (c) => c.status === "active",
        ),
      };
    },
  });

  const { data: completions } = useQuery({
    queryKey: ["daily-task-completions", employee?.id, today],
    enabled: !!session && !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_task_completions")
        .select("*")
        .eq("employee_id", employee!.id)
        .eq("completed_date", today);
      return (data ?? []) as DailyTaskCompletion[];
    },
  });

  const doneMap = useMemo(() => {
    const m = new Map<string, DailyTaskCompletion>();
    (completions ?? []).forEach((c) => {
      m.set(`${c.client_id}:${c.kind}:${c.task_index}`, c);
    });
    return m;
  }, [completions]);

  const toggle = useMutation({
    mutationFn: async (vars: { clientId: string; kind: Kind; index: number }) => {
      const key = `${vars.clientId}:${vars.kind}:${vars.index}`;
      const existing = doneMap.get(key);
      if (existing) {
        const { error } = await supabase
          .from("daily_task_completions")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_task_completions").insert({
          client_id: vars.clientId,
          employee_id: employee!.id,
          completed_date: today,
          kind: vars.kind,
          task_index: vars.index,
        });
        if (error) throw error;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["daily-task-completions", employee?.id, today],
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  const clients = data?.clients ?? [];
  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    clients.forEach((c) => {
      total += (c.posts_per_day ?? 0) + (c.videos_per_day ?? 0);
    });
    (completions ?? []).forEach(() => {
      done += 1;
    });
    return { total, done };
  }, [clients, completions]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Minhas tarefas de hoje
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          {clients.length === 0
            ? "Você ainda não tem clientes vinculados."
            : totals.total === 0
              ? "Seus clientes não têm metas diárias configuradas."
              : `${totals.done} de ${totals.total} concluídos.`}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl animate-pulse"
              style={{ backgroundColor: "var(--card)" }}
            />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente vinculado"
          subtitle="O administrador ainda não atribuiu clientes a você."
        />
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => (
            <ClientTaskCard
              key={client.id}
              client={client}
              doneMap={doneMap}
              onToggle={(kind, index) =>
                toggle.mutate({ clientId: client.id, kind, index })
              }
              pending={toggle.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientTaskCard({
  client,
  doneMap,
  onToggle,
  pending,
}: {
  client: Client;
  doneMap: Map<string, DailyTaskCompletion>;
  onToggle: (kind: Kind, index: number) => void;
  pending: boolean;
}) {
  const posts = client.posts_per_day ?? 0;
  const videos = client.videos_per_day ?? 0;

  const countDone = (kind: Kind, n: number) => {
    let c = 0;
    for (let i = 0; i < n; i++) {
      if (doneMap.has(`${client.id}:${kind}:${i}`)) c++;
    }
    return c;
  };
  const postsDone = countDone("post", posts);
  const videosDone = countDone("video", videos);

  return (
    <li
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            backgroundColor: client.color_hex ?? "#6366F1",
            color: "#fff",
          }}
          aria-hidden
        >
          {client.avatar_initials || client.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--foreground)" }}
          >
            {client.name}
          </p>
          {client.category && (
            <p
              className="text-xs truncate"
              style={{ color: "var(--muted-foreground)" }}
            >
              {client.category}
            </p>
          )}
        </div>
        {client.client_link && (
          <a
            href={client.client_link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-[var(--card-hover)]"
            aria-label={`Abrir link de ${client.name}`}
            style={{ color: "var(--muted-foreground)" }}
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      {posts === 0 && videos === 0 ? (
        <p
          className="mt-3 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Sem metas diárias configuradas.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {posts > 0 && (
            <TaskRow
              icon={<FileText className="size-4" />}
              label="Posts"
              total={posts}
              done={postsDone}
              clientId={client.id}
              kind="post"
              doneMap={doneMap}
              onToggle={onToggle}
              pending={pending}
            />
          )}
          {videos > 0 && (
            <TaskRow
              icon={<Film className="size-4" />}
              label="Vídeos"
              total={videos}
              done={videosDone}
              clientId={client.id}
              kind="video"
              doneMap={doneMap}
              onToggle={onToggle}
              pending={pending}
            />
          )}
        </div>
      )}
    </li>
  );
}

function TaskRow({
  icon,
  label,
  total,
  done,
  clientId,
  kind,
  doneMap,
  onToggle,
  pending,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  done: number;
  clientId: string;
  kind: Kind;
  doneMap: Map<string, DailyTaskCompletion>;
  onToggle: (kind: Kind, index: number) => void;
  pending: boolean;
}) {
  const complete = done >= total;
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor: complete ? "var(--success-bg)" : "var(--card-hover)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div
          className="flex items-center gap-2 text-xs font-medium"
          style={{ color: "var(--foreground)" }}
        >
          <span style={{ color: "var(--muted-foreground)" }}>{icon}</span>
          {label}
        </div>
        <span
          className="text-xs font-mono tabular-nums"
          style={{
            color: complete ? "var(--success)" : "var(--muted-foreground)",
          }}
        >
          {done}/{total}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const checked = doneMap.has(`${clientId}:${kind}:${i}`);
          return (
            <button
              key={i}
              onClick={() => onToggle(kind, i)}
              disabled={pending}
              aria-pressed={checked}
              aria-label={`${label} ${i + 1} ${checked ? "concluído" : "pendente"}`}
              className="size-8 rounded-md flex items-center justify-center border transition-colors"
              style={{
                backgroundColor: checked ? "var(--success)" : "transparent",
                borderColor: checked ? "var(--success)" : "var(--border)",
                color: checked ? "#fff" : "var(--muted-foreground)",
              }}
            >
              {checked ? (
                <Check className="size-4" />
              ) : (
                <span className="text-xs font-mono">{i + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="rounded-xl border p-10 text-center"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </p>
      <p
        className="text-xs mt-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}
