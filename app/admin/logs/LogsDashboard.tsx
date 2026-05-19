"use client";

import { useState } from "react";
import { LogsChart } from "./LogsChart";
import { LogsTable } from "./LogsTable";
import type { ActivityLog } from "@/types";

interface LogsDashboardProps {
  initialLogs: ActivityLog[];
  initialTotal: number;
}

export function LogsDashboard({ initialLogs, initialTotal }: LogsDashboardProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
      <LogsChart refreshTrigger={refreshTrigger} onRefreshAll={handleRefresh} />
      <LogsTable
        initialLogs={initialLogs}
        initialTotal={initialTotal}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
