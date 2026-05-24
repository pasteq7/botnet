#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const envFiles = [".env.local", ".env"];

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return undefined;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local or export it before running this command.`);
  }
  return value;
}

async function promptForMissingCredentials() {
  let email = readArg("email") || process.env.ADMIN_EMAIL;
  let password = readArg("password") || process.env.ADMIN_PASSWORD;

  if (email && password) return { email, password };

  const rl = createInterface({ input, output });
  try {
    email ||= await rl.question("Admin email: ");
    password ||= await rl.question("Admin password: ");
  } finally {
    rl.close();
  }

  return { email, password };
}

async function findUserByEmail(supabase, email) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 1000) return null;

    page += 1;
  }
}

function withAdminMetadata(user) {
  const appMetadata = user?.app_metadata ?? {};
  const roles = Array.isArray(appMetadata.roles) ? appMetadata.roles : [];

  return {
    ...appMetadata,
    role: "admin",
    roles: Array.from(new Set([...roles, "admin"])),
  };
}

async function main() {
  for (const file of envFiles) loadEnvFile(file);

  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SECRET_KEY");
  const { email, password } = await promptForMissingCredentials();

  if (!email?.trim()) throw new Error("Admin email is required.");
  if (!password || password.length < 6) throw new Error("Admin password must be at least 6 characters.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existingUser = await findUserByEmail(supabase, email.trim());
  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      app_metadata: withAdminMetadata(existingUser),
    });
    if (error) throw error;

    console.log(`Promoted existing user ${email.trim()} to admin and updated the password.`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: withAdminMetadata(null),
  });
  if (error) throw error;

  console.log(`Created admin user ${email.trim()}. You can now sign in at /login.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
