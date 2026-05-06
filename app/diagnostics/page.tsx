"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

type EndpointStatus =
  | { status: "ok"; count?: number; response?: string }
  | { status: "error"; error: string };

interface EnvEntry {
  set: boolean;
  placeholder: boolean;
}

interface Diagnostics {
  supabase: { anon: EndpointStatus; admin: EndpointStatus };
  gemini: EndpointStatus;
  env: Record<string, EnvEntry>;
  cron?: { status: string; statusCode?: number; message?: string };
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function StatusGlow({ ok, warning }: { ok: boolean; warning?: boolean }) {
  const color = warning
    ? "bg-amber-400 shadow-[0_0_12px_theme(colors.amber.400)]"
    : ok
      ? "bg-emerald-400 shadow-[0_0_12px_theme(colors.emerald.400)]"
      : "bg-orange-400 shadow-[0_0_12px_theme(colors.orange.400)]";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}

function StatusCard({
  title,
  status,
  details,
}: {
  title: string;
  status: EndpointStatus;
  details?: string[];
}) {
  const ok = status.status === "ok";
  return (
    <motion.div
      variants={item}
      className="rounded-lg border border-gray-800 bg-gray-950 p-5"
    >
      <div className="flex items-center gap-3">
        <StatusGlow ok={ok} />
        <span className="text-sm font-medium text-white">{title}</span>
        <span className={`ml-auto text-xs ${ok ? "text-emerald-400" : "text-orange-400"}`}>
          {ok ? "Connected" : "Error"}
        </span>
      </div>
      {ok && status.count !== undefined && (
        <p className="mt-2 text-xs text-gray-500">
          Count: <span className="text-gray-300">{status.count}</span>
        </p>
      )}
      {ok && status.response !== undefined && (
        <p className="mt-2 text-xs text-gray-500">
          Response: <span className="text-gray-300">{status.response}</span>
        </p>
      )}
      {!ok && (
        <p className="mt-2 text-xs text-orange-400/80">{status.error}</p>
      )}
      {details?.map((d, i) => (
        <p key={i} className="mt-1 text-xs text-gray-600">{d}</p>
      ))}
    </motion.div>
  );
}

function EnvRow({ name, entry: { set, placeholder } }: { name: string; entry: EnvEntry }) {
  const ok = set && !placeholder;
  const warning = set && placeholder;
  return (
    <motion.div
      variants={item}
      className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <StatusGlow ok={ok} warning={warning} />
        <code className="text-xs text-gray-300">{name}</code>
      </div>
      <span className={`text-xs ${ok ? "text-emerald-400" : warning ? "text-amber-400" : "text-orange-400"}`}>
        {ok ? "Set" : warning ? "Placeholder" : "Missing"}
      </span>
    </motion.div>
  );
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [dryRunLoading, setDryRunLoading] = useState(false);

  const runSuite = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diagnostics");
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerDryRun = useCallback(async () => {
    setDryRunLoading(true);
    try {
      const res = await fetch("/api/diagnostics?dryRun=true");
      setData(await res.json());
    } finally {
      setDryRunLoading(false);
    }
  }, []);

  useEffect(() => {
    runSuite();
  }, [runSuite]);

  if (!data) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white">Diagnostics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Service connectivity and environment verification
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        <StatusCard
          title="Supabase (Publishable)"
          status={data.supabase.anon}
        />
        <StatusCard
          title="Supabase (Secret)"
          status={data.supabase.admin}
          details={
            data.supabase.admin.status === "error" && data.env.SUPABASE_SECRET_KEY?.placeholder
              ? ["Update SUPABASE_SECRET_KEY in .env.local"]
              : undefined
          }
        />
        <StatusCard
          title="Gemini AI"
          status={data.gemini}
          details={
            data.gemini.status === "error" && !process.env.GEMINI_API_KEY
              ? ["Set GEMINI_API_KEY in .env.local"]
              : undefined
          }
        />

        <div className="pt-4">
          <h2 className="mb-3 text-sm font-medium text-gray-400">Environment Variables</h2>
          <div className="space-y-2">
            {Object.entries(data.env).map(([name, entry]) => (
              <EnvRow key={name} name={name} entry={entry} />
            ))}
          </div>
        </div>

        {data.cron && (
          <motion.div
            variants={item}
            className="rounded-lg border border-gray-800 bg-gray-950 p-5"
          >
            <div className="flex items-center gap-3">
              <StatusGlow ok={data.cron.status === "ok"} />
              <span className="text-sm font-medium text-white">Cron (Dry Run)</span>
              <span
                className={`ml-auto text-xs ${data.cron.status === "ok" ? "text-emerald-400" : "text-orange-400"}`}
              >
                {data.cron.status === "ok" ? "Reachable" : `HTTP ${data.cron.statusCode}`}
              </span>
            </div>
            {data.cron.message && (
              <p className="mt-2 text-xs text-gray-500">{data.cron.message}</p>
            )}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 flex gap-3"
      >
        <button
          onClick={runSuite}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Full Suite"}
        </button>
        <button
          onClick={triggerDryRun}
          disabled={dryRunLoading}
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-50"
        >
          {dryRunLoading ? "Running..." : "Trigger Cron (Dry Run)"}
        </button>
      </motion.div>
    </div>
  );
}
