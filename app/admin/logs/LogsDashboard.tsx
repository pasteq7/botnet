"use client";

import { useState } from "react";
import { LogsChart } from "./LogsChart";
import { LogsTable } from "./LogsTable";
import { GlassSurface } from "@/components/ui/GlassSurface";
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
    <GlassSurface className="overflow-hidden">
      <LogsChart refreshTrigger={refreshTrigger} onRefreshAll={handleRefresh} />
      <LogsTable
        initialLogs={initialLogs}
        initialTotal={initialTotal}
        refreshTrigger={refreshTrigger}
      />
    </GlassSurface>
  );
}
