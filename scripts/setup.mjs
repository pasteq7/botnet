#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const envPath = ".env.local";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...options.env },
    shell: process.platform === "win32",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) throw result.error;
  return result;
}

function runSupabase(args, options = {}) {
  return run("npx", ["--yes", "supabase", ...args], {
    ...options,
    env: { DO_NOT_TRACK: "1", ...options.env },
  });
}

function parseEnv(content) {
  const values = new Map();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;
    values.set(trimmed.slice(0, equalsAt).trim(), trimmed.slice(equalsAt + 1).trim());
  }
  return values;
}

function setEnvValue(content, name, value) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function parseSupabaseStatus(output) {
  const envValue = (name) => {
    const match = output.match(new RegExp(`^${name}=(?:"([^"]*)"|'([^']*)'|(\\S+))$`, "im"));
    return match?.[1] ?? match?.[2] ?? match?.[3];
  };
  const valueAfter = (label) => {
    const match = output.match(new RegExp(`${label}:\\s+(\\S+)`, "i"));
    return match?.[1];
  };

  return {
    url: envValue("API_URL") || valueAfter("API URL"),
    publishable:
      envValue("PUBLISHABLE_KEY")
      || envValue("ANON_KEY")
      || output.match(/\bsb_publishable_[^\s"']+/)?.[0]
      || valueAfter("anon key"),
    secret:
      envValue("SECRET_KEY")
      || envValue("SERVICE_ROLE_KEY")
      || output.match(/\bsb_secret_[^\s"']+/)?.[0]
      || valueAfter("service_role key"),
  };
}

function ensureNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) {
    throw new Error(`Node.js 20 or newer is required. Current version: ${process.version}`);
  }
}

function isWsl() {
  return process.platform === "linux"
    && existsSync("/proc/version")
    && /microsoft|wsl/i.test(readFileSync("/proc/version", "utf8"));
}

function ensureDocker() {
  let version;
  try {
    version = run("docker", ["--version"], { capture: true });
  } catch {
    throw new Error(
      "Docker is not installed or is not available in PATH. Install Docker Desktop, start it, "
      + "and enable WSL integration for this distribution."
    );
  }
  if (version.status !== 0) {
    throw new Error(
      "Docker is not installed or is not available in PATH. Install Docker Desktop, start it, "
      + "and enable WSL integration for this distribution."
    );
  }

  const info = run("docker", ["info"], { capture: true });
  if (info.status === 0) {
    console.log("[ok] Docker daemon is available");
    return;
  }

  if (isWsl()) {
    throw new Error(
      "Docker Desktop is not reachable from WSL. Start Docker Desktop in Windows, then enable "
      + "Settings > Resources > WSL Integration for this distribution and rerun `npm run setup`. "
      + "Do not use sudo; Docker Desktop provides the daemon."
    );
  }

  throw new Error(
    "Docker is installed, but its daemon is not running or is inaccessible. Start Docker Desktop "
    + "and rerun `npm run setup`."
  );
}

function getSupabaseStatus() {
  return runSupabase(["status", "--output", "env"], { capture: true });
}

async function main() {
  console.log("BotNet local setup\n");
  ensureNodeVersion();

  if (!existsSync("node_modules")) {
    console.log("Installing npm dependencies...");
    if (run("npm", ["install"]).status !== 0) throw new Error("npm install failed.");
  } else {
    console.log("[ok] npm dependencies are installed");
  }

  ensureDocker();

  let status = getSupabaseStatus();
  if (status.status !== 0) {
    console.log("Starting local Supabase (the first run can take a few minutes)...");
    if (runSupabase(["start"]).status !== 0) {
      throw new Error("Unable to start local Supabase.");
    }
    status = getSupabaseStatus();
  } else {
    console.log("[ok] local Supabase is running");
  }

  if (status.status !== 0) throw new Error("Unable to read local Supabase status.");
  const supabase = parseSupabaseStatus(`${status.stdout}\n${status.stderr}`);
  if (!supabase.url || !supabase.publishable || !supabase.secret) {
    throw new Error("Could not parse the URL and API keys from `supabase status`.");
  }

  console.log("Applying pending local database migrations...");
  if (runSupabase(["migration", "up", "--local"]).status !== 0) {
    throw new Error("Unable to apply local database migrations.");
  }

  let envContent = existsSync(envPath)
    ? readFileSync(envPath, "utf8")
    : readFileSync(".env.example", "utf8");
  const existing = parseEnv(envContent);

  envContent = setEnvValue(envContent, "NEXT_PUBLIC_SUPABASE_URL", supabase.url);
  envContent = setEnvValue(
    envContent,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    supabase.publishable
  );
  envContent = setEnvValue(envContent, "SUPABASE_SECRET_KEY", supabase.secret);
  envContent = setEnvValue(envContent, "SETUP_SECRET", "");
  envContent = setEnvValue(
    envContent,
    "ENCRYPTION_KEY",
    existing.get("ENCRYPTION_KEY") || randomBytes(32).toString("hex")
  );
  envContent = setEnvValue(envContent, "INNGEST_DEV", "1");
  writeFileSync(envPath, envContent, "utf8");
  console.log(`[ok] wrote ${envPath} and preserved existing secrets`);

  if (run("node", ["scripts/doctor.mjs"]).status !== 0) {
    throw new Error("Setup validation failed.");
  }

  console.log("\nSetup complete.");
  console.log("Run: npm run dev:all");
  console.log("App: http://localhost:3000");
  console.log("Create the first admin: http://localhost:3000/setup");
}

main().catch((error) => {
  console.error(`\nSetup failed: ${error.message}`);
  process.exit(1);
});
