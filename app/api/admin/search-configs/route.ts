import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";

function maskKey(key: string): string {
  const visible = key.slice(-4);
  return "\u2022".repeat(8) + visible;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: configs, error } = await supabase
    .from("search_configs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = (configs ?? []).map((c) => {
    if (c.encrypted_key) {
      try {
        const decrypted = decrypt(c.encrypted_key);
        return { ...c, encrypted_key: maskKey(decrypted) };
      } catch {
        return { ...c, encrypted_key: "[decryption failed]" };
      }
    }
    return c;
  });

  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { provider, label, api_key, is_active } = body;

    if (!provider || !label) {
      return NextResponse.json({ error: "Missing required fields (provider, label)" }, { status: 400 });
    }

    const encrypted_key = api_key ? encrypt(api_key) : null;

    if (is_active) {
      const { error: deactivateError } = await supabase
        .from("search_configs")
        .update({ is_active: false })
        .eq("is_active", true);

      if (deactivateError) {
        return NextResponse.json({ error: deactivateError.message }, { status: 500 });
      }
    }

    const { data, error } = await supabase
      .from("search_configs")
      .insert({
        provider,
        label,
        encrypted_key,
        is_active: is_active ?? false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Only one search config can be active at a time. Deactivate the current one first." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.encrypted_key) {
      const decrypted = decrypt(data.encrypted_key);
      return NextResponse.json({ ...data, encrypted_key: maskKey(decrypted) });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Missing config ID" }, { status: 400 });

    if (updates.is_active === true) {
      const { error: deactivateError } = await supabase
        .from("search_configs")
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("id", id);

      if (deactivateError) {
        return NextResponse.json({ error: deactivateError.message }, { status: 500 });
      }
    }

    if (updates.api_key) {
      updates.encrypted_key = encrypt(updates.api_key);
      delete updates.api_key;
    }

    const { data, error } = await supabase
      .from("search_configs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Only one search config can be active at a time. Deactivate the current one first." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.encrypted_key) {
      const decrypted = decrypt(data.encrypted_key);
      return NextResponse.json({ ...data, encrypted_key: maskKey(decrypted) });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing config ID" }, { status: 400 });

  const { data: config, error: fetchError } = await supabase
    .from("search_configs")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  if (config?.is_active) {
    return NextResponse.json(
      { error: "Cannot delete an active config. Deactivate it first." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("search_configs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
