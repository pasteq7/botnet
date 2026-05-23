import { NextResponse } from "next/server";
import { DEFAULT_BACKGROUND_IMAGE_ENABLED } from "@/lib/constants";
import { getInterfaceSettings } from "@/lib/interface-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  try {
    const settings = await getInterfaceSettings(supabase);
    return NextResponse.json({
      background_image_enabled: settings.background_image_enabled,
      background_image_url: settings.background_image_url,
    });
  } catch {
    return NextResponse.json({
      background_image_enabled: DEFAULT_BACKGROUND_IMAGE_ENABLED,
      background_image_url: null,
    });
  }
}
