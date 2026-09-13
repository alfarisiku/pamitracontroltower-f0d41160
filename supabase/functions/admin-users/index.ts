import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes } = await caller.auth.getUser();
  if (!userRes?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Only administrators may use this endpoint
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* noop */ }
  const action = body.action as string;

  try {
    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      return json({
        users: (data?.users ?? []).map((u) => ({
          id: u.id,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at,
          created_at: u.created_at,
        })),
      });
    }

    if (action === "update_credentials") {
      const { user_id, email, password } = body;
      if (!user_id) return json({ error: "user_id wajib diisi" }, 400);
      const payload: Record<string, string> = {};
      if (email) payload.email = email;
      if (password) payload.password = password;
      if (Object.keys(payload).length === 0) return json({ error: "Tidak ada perubahan" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { ...payload, email_confirm: true });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "create") {
      const { email, password, display_name, project_ids = [] } = body;
      if (!email || !password) return json({ error: "Email dan password wajib diisi" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { display_name: display_name || email },
      });
      if (error) throw error;
      const uid = data.user!.id;
      await admin.from("profiles").update({ display_name: display_name || email, status: "active" }).eq("user_id", uid);
      await admin.from("user_roles").upsert({ user_id: uid, role: "team" }, { onConflict: "user_id" });
      if (project_ids.length > 0) {
        await admin.from("user_project_assignments").insert(
          project_ids.map((pid: string) => ({ user_id: uid, project_id: pid })),
        );
      }
      return json({ ok: true, user_id: uid });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id wajib diisi" }, 400);
      if (user_id === userRes.user.id) return json({ error: "Tidak bisa menghapus akun sendiri" }, 400);
      await admin.from("user_project_assignments").delete().eq("user_id", user_id);
      await admin.from("user_roles").delete().eq("user_id", user_id);
      await admin.from("profiles").delete().eq("user_id", user_id);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Aksi tidak dikenal" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
