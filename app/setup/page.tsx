import { redirect } from "next/navigation";
import { SetupForm } from "@/app/setup/SetupForm";
import { hasAdminRole } from "@/lib/auth/admin-role";
import { getAdminBootstrapStatus } from "@/lib/setup/admin-bootstrap";
import { createNoStoreAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const admin = createNoStoreAdminClient();
  const status = await getAdminBootstrapStatus(admin);

  if (status.hasAdmin) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    redirect(hasAdminRole(user) ? "/admin" : "/login");
  }

  return <SetupForm />;
}
