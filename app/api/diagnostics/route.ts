import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { GENERATIVE_MODEL } from "@/lib/ai/client";

type EndpointResult =
  | { status: "ok"; count?: number; response?: string }
  | { status: "error"; error: string };

const PLACEHOLDER_PATTERNS = [
  "placeholder-service-key",
  "placeholder-cron-secret",
];

function isPlaceholder(val: string | undefined): boolean {
  if (!val) return false;
  return PLACEHOLDER_PATTERNS.some((p) => val.includes(p));
}

const ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export async function GET(req: NextRequest) {
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

  const env = Object.fromEntries(
    ENV_VARS.map((key) => {
      const val = process.env[key];
      return [key, { set: !!val, placeholder: isPlaceholder(val) }];
    })
  );

  let supabaseAnon: EndpointResult = { status: "error", error: "Not checked" };
  try {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { count, error } = await anonClient
      .from("subreddits")
      .select("*", { count: "exact", head: true });
    if (error) {
      supabaseAnon = { status: "error", error: error.message };
    } else {
      supabaseAnon = { status: "ok", count: count ?? 0 };
    }
  } catch (e) {
    supabaseAnon = { status: "error", error: String(e) };
  }

  let supabaseAdmin: EndpointResult = { status: "error", error: "Not checked" };
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
    const { count, error } = await adminClient
      .from("personas")
      .select("*", { count: "exact", head: true });
    if (error) {
      supabaseAdmin = { status: "error", error: error.message };
    } else {
      supabaseAdmin = { status: "ok", count: count ?? 0 };
    }
  } catch (e) {
    supabaseAdmin = { status: "error", error: String(e) };
  }

  let gemini: EndpointResult = { status: "error", error: "Not checked" };
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      gemini = { status: "error", error: "Missing GEMINI_API_KEY" };
    } else {
      const ai = new GoogleGenAI({ apiKey: key });
      const res = await ai.models.generateContent({
        model: GENERATIVE_MODEL,
        contents: "Reply with the single word: pong",
      });
      gemini = { status: "ok", response: res.text ?? "(empty)" };
    }
  } catch (e) {
    gemini = { status: "error", error: String(e) };
  }

  let cron: { status: string; statusCode?: number; message?: string } | undefined;
  if (dryRun) {
    try {
      const cronUrl = new URL("/api/cron/generate", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
      cronUrl.searchParams.set("dryRun", "true");
      const cronRes = await fetch(cronUrl.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
        },
      });
      cron = {
        status: cronRes.ok ? "ok" : "error",
        statusCode: cronRes.status,
        message: cronRes.ok ? "Cron endpoint reached successfully" : `Cron returned ${cronRes.status}`,
      };
    } catch (e) {
      cron = { status: "error", message: String(e) };
    }
  }

  return NextResponse.json({ supabase: { anon: supabaseAnon, admin: supabaseAdmin }, gemini, env, cron });
}
