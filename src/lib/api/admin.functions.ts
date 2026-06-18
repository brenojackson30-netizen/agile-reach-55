import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    // Use the published app as the canonical auth callback. Preview/editor origins
    // are not reliable redirect targets for invite emails sent to employees.
    const req = getRequest();
    const headers = req.headers;
    const host = headers.get("host") ?? "";
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const origin = isLocal ? `http://${host}` : "https://agile-reach-55.lovable.app";
    const redirectTo = `${origin}/definir-senha`;

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
        status: "active",
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
