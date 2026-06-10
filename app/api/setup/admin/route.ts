import { NextRequest, NextResponse } from "next/server";
import { hasAdminRole } from "@/lib/auth/admin-role";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findUserByEmail,
  getAdminBootstrapStatus,
  isValidSetupToken,
  withAdminMetadata,
} from "@/lib/setup/admin-bootstrap";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const status = await getAdminBootstrapStatus(supabase);

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read setup status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const status = await getAdminBootstrapStatus(supabase);

  if (!status.setupConfigured) {
    return NextResponse.json(
      { error: "Admin setup is not configured. Add SETUP_SECRET to the production environment." },
      { status: 403 }
    );
  }

  if (status.hasAdmin) {
    return NextResponse.json(
      { error: "Admin setup is locked because an admin user already exists." },
      { status: 409 }
    );
  }

  let body: { email?: unknown; password?: unknown; setupToken?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidSetupToken(body.setupToken)) {
    return NextResponse.json({ error: "Invalid setup key" }, { status: 403 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const existingUser = await findUserByEmail(supabase, email);

    if (existingUser) {
      const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        app_metadata: withAdminMetadata(existingUser),
      });

      if (error) throw error;
      if (!hasAdminRole(data.user)) {
        throw new Error("Supabase updated the user without the required admin role.");
      }

      return NextResponse.json({ success: true, mode: "promoted" });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: withAdminMetadata(null),
    });

    if (error) throw error;
    if (!hasAdminRole(data.user)) {
      throw new Error("Supabase created the user without the required admin role.");
    }

    return NextResponse.json({ success: true, mode: "created" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create admin user" },
      { status: 500 }
    );
  }
}
