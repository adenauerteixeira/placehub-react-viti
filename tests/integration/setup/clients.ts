import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} — configure .env.test.local (see .env.test.local.example) before running integration tests.`,
    );
  }
  return value;
}

export interface SignedInSession {
  client: SupabaseClient;
  userId: string;
  tenantId: string;
  role: string;
  brokerId: string | null;
}

function newClient(): SupabaseClient {
  const url = requireEnv("VITE_SUPABASE_URL");
  const anonKey = requireEnv("VITE_SUPABASE_ANON_KEY");
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function signIn(email: string, password: string): Promise<SignedInSession> {
  const client = newClient();
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    throw new Error(`Falha ao autenticar ${email} nos testes de integração: ${authError?.message}`);
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Falha ao carregar profile de ${email}: ${profileError?.message}`);
  }

  const { data: broker } = await client
    .from("brokers")
    .select("id")
    .eq("profile_id", authData.user.id)
    .maybeSingle();

  return {
    client,
    userId: authData.user.id,
    tenantId: profile.tenant_id as string,
    role: profile.role as string,
    brokerId: (broker?.id as string | undefined) ?? null,
  };
}

export async function signInTenantAdmin(): Promise<SignedInSession> {
  return signIn(requireEnv("TEST_TENANT_ADMIN_EMAIL"), requireEnv("TEST_TENANT_ADMIN_PASSWORD"));
}

export async function signInBroker(): Promise<SignedInSession> {
  return signIn(requireEnv("TEST_BROKER_EMAIL"), requireEnv("TEST_BROKER_PASSWORD"));
}
