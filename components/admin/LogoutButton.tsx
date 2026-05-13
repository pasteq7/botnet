"use client";

import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      onClick={handleLogout}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-normal text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors duration-150"
    >
      <LogOut className="size-4 shrink-0" />
      Sign out
    </motion.button>
  );
}
