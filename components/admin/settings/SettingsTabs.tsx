// components/admin/settings/SettingsTabs.tsx
"use client";
import { useState } from "react";
import ConfigSection from "./ConfigSection";
import SearchConfigSection from "./SearchConfigSection";
import SchedulerSection from "./SchedulerSection";
import ErrorBanner from "./ErrorBanner";

const TABS = ["AI Pipeline", "Search", "Scheduler"] as const;
type Tab = typeof TABS[number];

export default function SettingsTabs() {
    const [tab, setTab] = useState<Tab>("AI Pipeline");
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-muted mt-1">API keys and system configuration</p>
            </div>

            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-surface-hover rounded-xl w-fit">
                {TABS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === t
                                ? "bg-surface text-foreground shadow-sm"
                                : "text-muted hover:text-foreground"
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab panels */}
            <div>
                {tab === "AI Pipeline" && <ConfigSection onError={setError} onSwitchTab={() => setTab("Search")} />}
                {tab === "Search" && <SearchConfigSection onError={setError} />}
                {tab === "Scheduler" && <SchedulerSection onError={setError} />}
            </div>
        </div>
    );
}