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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      onClick={handleLogout}
      className="flex items-center justify-center w-full h-10 rounded-lg text-foreground/80 hover:text-red-400 hover:bg-red-400/8 transition-colors duration-150"
      aria-label="Logout"
    >
      <LogOut className="size-5 shrink-0" />
    </motion.button>
  );
}
