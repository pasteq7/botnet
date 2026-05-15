"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Search, Clock, AlertCircle, Settings2 } from "lucide-react";
import ConfigSection from "./settings/ConfigSection";
import SearchConfigSection from "./settings/SearchConfigSection";
import SchedulerSection from "./settings/SchedulerSection";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "ai" | "search" | "scheduler";

const TABS = [
  { id: "ai", label: "AI Models", icon: Cpu, desc: "Configure LLM providers" },
  { id: "search", label: "External Search API", icon: Search, desc: "Manage External search APIs" },
  { id: "scheduler", label: "Scheduler", icon: Clock, desc: "Cron & automation" },
] as const;

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("ai");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const sharedProps = {
    onError: setError,
  };

  const activeTabData = TABS.find((t) => t.id === activeTab);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-4xl h-[90vh] sm:h-[80vh] min-h-[500px] flex flex-col sm:flex-row bg-background rounded-2xl shadow-2xl border border-border/60 overflow-hidden z-10"
          >
            {/* Sidebar Navigation */}
            <div className="w-full sm:w-60 lg:w-64 bg-surface/30 border-b sm:border-b-0 sm:border-r border-border/60 shrink-0 flex flex-col">
              <div className="p-4 sm:p-6 flex items-center justify-between sm:block">
                <div className="flex items-center gap-2.5 text-foreground font-semibold">
                  <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                    <Settings2 className="size-4" />
                  </div>
                  Settings
                </div>
                <button
                  onClick={onClose}
                  className="sm:hidden p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 pb-3 sm:pb-6 flex sm:flex-col gap-1.5 overflow-x-auto no-scrollbar">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setError(null);
                      }}
                      className={`shrink-0 sm:shrink w-auto sm:w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${isActive
                        ? "bg-surface shadow-sm text-foreground border border-border/50"
                        : "text-muted hover:bg-surface hover:text-foreground border border-transparent"
                        }`}
                    >
                      <Icon className={`size-4 shrink-0 ${isActive ? "text-accent" : "text-muted/70"}`} />
                      <div className="truncate">
                        <div className="leading-snug">{tab.label}</div>
                        <div
                          className={`text-[10px] font-normal truncate hidden sm:block mt-0.5 ${isActive ? "text-muted" : "text-muted/60"
                            }`}
                        >
                          {tab.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background relative">
              {/* Desktop Close Button */}
              <button
                onClick={onClose}
                className="hidden sm:flex absolute top-5 right-5 z-10 p-2 text-muted/50 hover:text-foreground hover:bg-surface rounded-full transition-all"
              >
                <X className="size-5" />
              </button>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-5 sm:p-8 relative">
                <div className="max-w-2xl mx-auto sm:mx-0">
                  {/* Content Header */}
                  <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                      {activeTabData?.label}
                    </h1>
                    <p className="text-sm text-muted mt-1.5">
                      {activeTabData?.desc}
                    </p>
                  </div>

                  {/* Error Banner */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <div className="flex gap-2.5 items-center">
                            <AlertCircle className="size-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                          </div>
                          <button
                            onClick={() => setError(null)}
                            className="text-red-400/50 hover:text-red-400 transition-colors mt-0.5"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Panel Component */}
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "ai" && (
                      <ConfigSection
                        {...sharedProps}
                        onSwitchTab={() => {
                          setActiveTab("search");
                          setError(null);
                        }}
                      />
                    )}
                    {activeTab === "search" && <SearchConfigSection {...sharedProps} />}
                    {activeTab === "scheduler" && <SchedulerSection {...sharedProps} />}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}