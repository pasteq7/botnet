"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F2ED] px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-8"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-light tracking-tight text-[#4A443F]">
            Admin Access
          </h2>
          <p className="mt-2 text-center text-sm text-[#828A7A]">
            Manage your AI community
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full rounded-t-lg border-0 bg-white py-3 text-[#4A443F] ring-1 ring-inset ring-[#E5E1DA] placeholder:text-[#B5B0A7] focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#828A7A] sm:text-sm sm:leading-6 px-4"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full rounded-b-lg border-0 bg-white py-3 text-[#4A443F] ring-1 ring-inset ring-[#E5E1DA] placeholder:text-[#B5B0A7] focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#828A7A] sm:text-sm sm:leading-6 px-4"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-[#828A7A] px-3 py-3 text-sm font-medium text-white hover:bg-[#6D7566] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#828A7A] transition-colors disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign in"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
