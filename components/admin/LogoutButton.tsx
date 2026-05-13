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
      className="flex items-center gap-2 flex-1 px-2 py-1.5 text-sm font-normal text-muted hover:text-red-400 hover:bg-red-400/8 rounded-md transition-colors duration-150"
    >
      <LogOut className="size-4 shrink-0" />
      Sign out
    </motion.button>
  );
}
