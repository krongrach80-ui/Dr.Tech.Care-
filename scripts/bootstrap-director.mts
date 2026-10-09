// scripts/bootstrap-director.mts
// Dr.Tech.Care: Initial Director Account Bootstrap Script
// Usage: tsx scripts/bootstrap-director.mts or node --loader ts-node scripts/bootstrap-director.mts

import { createClient } from "@supabase/supabase-js";

async function bootstrapDirector() {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "http://127.0.0.1:54321";
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!serviceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required to bootstrap director.");
    process.exit(1);
  }

  const email = process.env["BOOTSTRAP_DIRECTOR_EMAIL"] ?? "director@drtechcare.local";
  const password = process.env["BOOTSTRAP_DIRECTOR_PASSWORD"] ?? "Director1234!";
  const username = process.env["BOOTSTRAP_DIRECTOR_USERNAME"] ?? "director.admin";
  const displayName = process.env["BOOTSTRAP_DIRECTOR_NAME"] ?? "นพ. วิทยา ผู้บริหารโรงพยาบาล";

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[Dr.Tech.Care] Checking for director user: ${email}...`);

  // 1. Create or fetch Auth User
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Error listing auth users:", listError.message);
    process.exit(1);
  }

  let user = usersData.users.find((u) => u.email === email);

  if (!user) {
    console.log(`[Dr.Tech.Care] Creating director auth account...`);
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "director", display_name: displayName },
    });

    if (createError || !newUser.user) {
      console.error("❌ Failed to create director auth account:", createError?.message);
      process.exit(1);
    }
    user = newUser.user;
    console.log(`✅ Auth user created (ID: ${user.id})`);
  } else {
    console.log(`ℹ️ Auth user already exists (ID: ${user.id})`);
  }

  // 2. Insert or update public.profiles
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: user.id,
      role: "director",
      username,
      display_name: displayName,
      status: "active",
      must_change_password: false,
    }, { onConflict: "id" });

  if (profileError) {
    console.error("❌ Failed to upsert director profile:", profileError.message);
    process.exit(1);
  }

  console.log("✅ Director account successfully bootstrapped and ready!");
}

bootstrapDirector().catch((err: unknown) => {
  console.error("❌ Fatal bootstrap error:", err);
  process.exit(1);
});
