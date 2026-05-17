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
    <div className="space-y-6">
      <LogsChart refreshTrigger={refreshTrigger} />
      <LogsTable
        initialLogs={initialLogs}
        initialTotal={initialTotal}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
