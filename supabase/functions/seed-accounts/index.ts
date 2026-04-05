import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const results: string[] = [];

  // Seed admin account
  const { data: existingAdmin } = await admin.auth.admin.listUsers();
  const adminExists = existingAdmin?.users?.some(u => u.email === "admin@pamitra.co.id");

  if (!adminExists) {
    const { data: adminUser, error: adminErr } = await admin.auth.admin.createUser({
      email: "admin@pamitra.co.id",
      password: "admin123",
      email_confirm: true,
      user_metadata: { display_name: "Super Admin" },
    });
    if (adminErr) { results.push(`Admin error: ${adminErr.message}`); }
    else if (adminUser?.user) {
      await admin.from("profiles").update({ display_name: "Super Admin", status: "active" }).eq("user_id", adminUser.user.id);
      await admin.from("user_roles").upsert({ user_id: adminUser.user.id, role: "admin" }, { onConflict: "user_id" });
      results.push("Admin created");
    }
  } else {
    results.push("Admin already exists");
  }

  // Seed director account
  const directorExists = existingAdmin?.users?.some(u => u.email === "director@pamitra.co.id");
  if (!directorExists) {
    const { data: dirUser, error: dirErr } = await admin.auth.admin.createUser({
      email: "director@pamitra.co.id",
      password: "director123",
      email_confirm: true,
      user_metadata: { display_name: "Director" },
    });
    if (dirErr) { results.push(`Director error: ${dirErr.message}`); }
    else if (dirUser?.user) {
      await admin.from("profiles").update({ display_name: "Director", status: "active" }).eq("user_id", dirUser.user.id);
      await admin.from("user_roles").upsert({ user_id: dirUser.user.id, role: "management" }, { onConflict: "user_id" });
      results.push("Director created");
    }
  } else {
    results.push("Director already exists");
  }

  return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
