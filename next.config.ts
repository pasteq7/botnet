import type { NextConfig } from "next";

function getSupabaseOrigin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const supabaseOrigin = getSupabaseOrigin();
    const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])];
    const imgSrc = [
      "'self'",
      "data:",
      "blob:",
      "https://api.dicebear.com",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
    ];
    const connectSrc = [
      "'self'",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
      "wss:",
      ...(isDev ? ["ws:", "http://localhost:*", "http://127.0.0.1:*"] : []),
    ];
    const cspDirectives = [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imgSrc.join(" ")}`,
      "font-src 'self' data:",
      `connect-src ${connectSrc.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(!isDev ? ["upgrade-insecure-requests"] : []),
    ];

    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: cspDirectives.join("; "),
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
