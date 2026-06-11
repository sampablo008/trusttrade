/**
 * Seed an auth user (admin or normal) via the Supabase Admin API.
 *
 * Creating the auth user fires the `on_auth_user_created` trigger, which
 * auto-creates the matching `public.profiles` row (role defaults to 'user').
 * For an admin we then flip `profiles.role` to 'admin'. Never touch
 * `auth.users` directly — let the trigger own profile creation.
 *
 * Run:
 *   node --env-file=.env scripts/seed-admin.ts \
 *     --email=admin@trustpro.io --password='STRONGPASS' --role=admin --username=admin
 *
 * Flags:
 *   --email     (required) login email
 *   --password  (required) initial password
 *   --role      'admin' | 'user'   (default: 'user')
 *   --username  optional override for the auto-generated username
 *   --name      optional display_name (stored in user_metadata)
 */
import { createClient } from "@supabase/supabase-js";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) fail("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in env.");
if (!serviceKey) fail("Missing SUPABASE_SERVICE_ROLE_KEY in env.");

const email = arg("email")?.toLowerCase();
const password = arg("password");
const role = (arg("role") ?? "user") as "admin" | "user";
const username = arg("username");
const displayName = arg("name");

if (!email) fail("Missing --email");
if (!password) fail("Missing --password");
if (role !== "admin" && role !== "user") fail("--role must be 'admin' or 'user'");
if (username && !/^[a-z0-9_][a-z0-9._-]{2,31}$/.test(username)) {
  fail("--username must match ^[a-z0-9_][a-z0-9._-]{2,31}$");
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Create the auth user (email pre-confirmed so login works immediately).
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: displayName ? { display_name: displayName } : {},
});

if (createErr) fail(`createUser failed: ${createErr.message}`);
const userId = created.user.id;
console.log(`✓ auth user created: ${email} (${userId})`);

// The trigger creates the profile synchronously in the same transaction as the
// auth insert, so it exists by the time createUser returns.

// 2. Apply role + optional username to the auto-created profile.
const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
if (role === "admin") patch.role = "admin";
if (username) patch.username = username;

if (Object.keys(patch).length > 1) {
  const { error: updErr } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", userId);
  if (updErr) fail(`profile update failed (user exists, fix manually): ${updErr.message}`);
}

// 3. Read back to confirm.
const { data: profile, error: readErr } = await supabase
  .from("profiles")
  .select("user_id, email, username, role, is_frozen")
  .eq("user_id", userId)
  .single();

if (readErr) fail(`profile read failed: ${readErr.message}`);

console.log("✓ profile:");
console.table([profile]);
console.log(`Done. ${profile.email} is now role='${profile.role}'.`);
