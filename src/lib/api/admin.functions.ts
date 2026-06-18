import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createEmployeeSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
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
    if (!meEmp || meEmp.role !== "admin") throw new Error("Apenas admins podem criar funcionários.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create auth user (email confirmed so they can login immediately)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (createErr) throw new Error(createErr.message);
    const newUserId = created.user?.id;
    if (!newUserId) throw new Error("Falha ao criar usuário de autenticação.");

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
