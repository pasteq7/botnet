#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

let failures = 0;

function pass(message) {
  console.log(`[ok] ${message}`);
}

function fail(message, fix) {
  failures += 1;
  console.error(`[error] ${message}`);
  if (fix) console.error(`        ${fix}`);
}

function warn(message) {
  console.log(`[warn] ${message}`);
}

function commandWorks(command, args, timeout = 2500) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "pipe",
    timeout,
  });
  return result.status === 0;
}

function readEnv(path) {
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;
    values.set(trimmed.slice(0, equalsAt).trim(), trimmed.slice(equalsAt + 1).trim());
  }
  return values;
}

console.log("BotNet environment doctor\n");

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 20) pass(`Node.js ${process.version}`);
else fail(`Node.js ${process.version} is unsupported.`, "Install Node.js 20 or newer.");

if (commandWorks("npm", ["--version"])) pass("npm is available");
else fail("npm is unavailable.", "Install Node.js with npm.");

if (existsSync("node_modules")) pass("npm dependencies are installed");
else fail("node_modules is missing.", "Run `npm install`.");

const envPath = existsSync(".env.local")
  ? ".env.local"
  : null;

if (!envPath) {
  fail("No environment file was found.", "Run `npm run setup` or copy `.env.example`.");
} else {
  pass(`using ${envPath}`);
  const env = readEnv(envPath);
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "ENCRYPTION_KEY",
  ];

  for (const name of required) {
    if (env.get(name)) pass(`${name} is configured`);
    else fail(`${name} is missing.`, `Add it to ${envPath}.`);
  }

  const encryptionKey = env.get("ENCRYPTION_KEY") || "";
  if (/^[a-f0-9]{64}$/i.test(encryptionKey)) pass("ENCRYPTION_KEY has the required format");
  else fail("ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.");

  if (env.get("SETUP_SECRET")) pass("SETUP_SECRET is configured");
  else if (env.get("INNGEST_DEV") === "1") {
    pass("SETUP_SECRET is optional for local development");
  } else {
    warn("SETUP_SECRET is missing; production first-admin setup will be disabled.");
  }

  try {
    new URL(env.get("NEXT_PUBLIC_SUPABASE_URL") || "");
    pass("Supabase URL is valid");
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
}

if (commandWorks("docker", ["info"])) pass("Docker daemon is available");
else warn("Docker is unavailable; this is fine when using a hosted Supabase project.");

if (commandWorks("npx", ["--no-install", "supabase", "status"], 3500)) {
  pass("local Supabase is running");
}
else warn("local Supabase is not running or the CLI is unavailable.");

console.log("");
if (failures > 0) {
  console.error(`Doctor found ${failures} blocking issue${failures === 1 ? "" : "s"}.`);
  process.exit(1);
}

console.log("Doctor found no blocking issues.");
