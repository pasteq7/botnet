"use client";

import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
      className="text-sm text-muted hover:text-foreground transition-colors"
    >
      Sign out
    </motion.button>
  );
}
