import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/app?auth=required");
  }

  if (!isSuperAdmin(user)) {
    redirect("/");
  }

  return <AdminDashboard />;
}
