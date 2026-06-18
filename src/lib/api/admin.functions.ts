import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Use the published app as the canonical auth callback. Preview/editor origins
// are not reliable redirect targets for invite/recovery e-mails sent to employees.
function getDefinirSenhaRedirect() {
  const req = getRequest();
  const headers = req.headers;
  const host = headers.get("host") ?? "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const origin = isLocal ? `http://${host}` : "https://agile-reach-55.lovable.app";
  return `${origin}/definir-senha`;
}

const createEmployeeSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof createEmployeeSchema>) =>
    createEmployeeSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    // Caller must be admin
    const { data: meEmp, error: meErr } = await context.supabase
      .from("employees")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!meEmp || meEmp.role !== "admin")
      throw new Error("Apenas admins podem criar funcionários.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const redirectTo = getDefinirSenhaRedirect();

    // Send invite e-mail — user defines the password on first access
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo,
        data: { name: data.name, role: data.role },
      },
    );
    if (inviteErr) throw new Error(inviteErr.message);
    const newUserId = invited.user?.id;
    if (!newUserId) throw new Error("Falha ao enviar convite.");

    const initials = data.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const { data: emp, error: empErr } = await supabaseAdmin
      .from("employees")
      .insert({
        user_id: newUserId,
        name: data.name,
        avatar_initials: initials,
        role: data.role,
        status: "pending",
      })
      .select()
      .single();

    if (empErr) {
      // Rollback auth user to avoid orphan
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(empErr.message);
    }

    return { employee: emp };
  });

const deleteEmployeeSchema = z.object({
  employeeId: z.string().uuid(),
});

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof deleteEmployeeSchema>) =>
    deleteEmployeeSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: meEmp, error: meErr } = await context.supabase
      .from("employees")
      .select("id, role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!meEmp || meEmp.role !== "admin")
      throw new Error("Apenas admins podem remover funcionários.");
    if (meEmp.id === data.employeeId) throw new Error("Você não pode remover a si mesmo.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: tErr } = await supabaseAdmin
      .from("employees")
      .select("user_id")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!target) throw new Error("Funcionário não encontrado.");

    await supabaseAdmin.from("client_assignments").delete().eq("employee_id", data.employeeId);
    const { error: delEmpErr } = await supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", data.employeeId);
    if (delEmpErr) throw new Error(delEmpErr.message);

    if (target.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(target.user_id);
    }

    return { ok: true };
  });

// Chamada pelo próprio funcionário, logo após definir a senha em /definir-senha.
// Usa o client admin (service role) porque o usuário ainda não é "active" e a
// policy de UPDATE em employees exige role admin — então o RLS não liberaria
// essa escrita para o próprio usuário.
export const activateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("employees")
      .update({ status: "active" })
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    return { ok: true };
  });

const resendInviteSchema = z.object({
  employeeId: z.string().uuid(),
});

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof resendInviteSchema>) => resendInviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: meEmp, error: meErr } = await context.supabase
      .from("employees")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!meEmp || meEmp.role !== "admin") throw new Error("Apenas admins podem reenviar convites.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: tErr } = await supabaseAdmin
      .from("employees")
      .select("user_id, status")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!target) throw new Error("Funcionário não encontrado.");
    if (!target.user_id) throw new Error("Funcionário sem usuário vinculado.");
    if (target.status !== "pending")
      throw new Error("Este funcionário já definiu a senha — não há convite pendente.");

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
      target.user_id,
    );
    if (userErr || !userRes.user?.email)
      throw new Error("Não foi possível localizar o e-mail deste funcionário.");

    // supabase.auth.admin.inviteUserByEmail() falha com "já registrado" para um
    // usuário que já existe (mesmo pendente — bug conhecido do GoTrue). Por isso o
    // reenvio usa o fluxo de recovery, que reaproveita o mesmo /definir-senha.
    const redirectTo = getDefinirSenhaRedirect();
    const { error: resendErr } = await supabaseAdmin.auth.resetPasswordForEmail(
      userRes.user.email,
      { redirectTo },
    );
    if (resendErr) throw new Error(resendErr.message);

    return { ok: true };
  });
