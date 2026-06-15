import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { localizedPath } from "@/i18n/navigation";
import { isLocale } from "@/i18n/config";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "de";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${localizedPath(locale, "/app")}?auth=required`);
  }

  if (!isSuperAdmin(user)) {
    redirect(localizedPath(locale, "/"));
  }

  return <AdminDashboard />;
}
