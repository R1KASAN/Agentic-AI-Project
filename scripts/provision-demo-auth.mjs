import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error(
    "Missing Supabase configuration. Expected NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoUsers = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "teacher@demo.com",
    password: "password123",
    role: "teacher",
    fullName: "Teacher Demo",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "student1@demo.com",
    password: "password123",
    role: "student",
    fullName: "Student One",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "student2@demo.com",
    password: "password123",
    role: "student",
    fullName: "Student Two",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "student3@demo.com",
    password: "password123",
    role: "student",
    fullName: "Student Three",
  },
];

async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      return users;
    }

    page += 1;
  }
}

async function ensureDemoUser(account, existingUsers) {
  const existingByEmail = existingUsers.find((user) => user.email === account.email);
  const existingById = existingUsers.find((user) => user.id === account.id);

  if (existingByEmail && existingByEmail.id !== account.id) {
    const { error } = await adminClient.auth.admin.deleteUser(existingByEmail.id);
    if (error) {
      throw new Error(`Failed to delete mismatched user ${account.email}: ${error.message}`);
    }
  }

  if (existingById) {
    const { error } = await adminClient.auth.admin.updateUserById(account.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        role: account.role,
        full_name: account.fullName,
      },
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
      role: "authenticated",
    });

    if (error) {
      throw new Error(`Failed to update ${account.email}: ${error.message}`);
    }

    return "updated";
  }

  const { error } = await adminClient.auth.admin.createUser({
    id: account.id,
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      role: account.role,
      full_name: account.fullName,
    },
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    role: "authenticated",
  });

  if (error) {
    throw new Error(`Failed to create ${account.email}: ${error.message}`);
  }

  return "created";
}

async function verifyPasswordLogin(account) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
    }),
  });

  const body = await response.json();
  if (!response.ok || !body?.access_token) {
    throw new Error(
      `Password verification failed for ${account.email}: ${body?.msg || body?.error_description || response.status}`
    );
  }

  return body.user?.id ?? null;
}

async function main() {
  const before = await listAllUsers();

  for (const account of demoUsers) {
    const action = await ensureDemoUser(account, before);
    console.log(`${action.toUpperCase()}: ${account.email}`);
  }

  const after = await listAllUsers();
  const missing = demoUsers.filter(
    (account) => !after.some((user) => user.id === account.id && user.email === account.email)
  );

  if (missing.length > 0) {
    throw new Error(
      `Demo auth users missing after provisioning: ${missing.map((user) => user.email).join(", ")}`
    );
  }

  for (const account of demoUsers) {
    const verifiedUserId = await verifyPasswordLogin(account);
    console.log(`VERIFIED PASSWORD LOGIN: ${account.email} -> ${verifiedUserId}`);
  }

  console.log("Demo auth provisioning completed successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
