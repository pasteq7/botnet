import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminRole } from "@/lib/auth/admin-role";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  let credentials: { email?: unknown; password?: unknown };

  try {
    credentials = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof credentials.email === "string" ? credentials.email.trim() : "";
  const password = typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (!hasAdminRole(user)) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "This account is not an admin." }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
