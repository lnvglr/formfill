import type { User } from "@supabase/supabase-js";
import { createAdminClient, hasSupabaseSecretKey } from "@/lib/supabase/admin";

export type AppRole = "user" | "super_admin";

export function getUserRole(user: User | null | undefined): AppRole {
  const role = user?.app_metadata?.role;
  return role === "super_admin" ? "super_admin" : "user";
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return getUserRole(user) === "super_admin";
}

export function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function ensureSuperAdminRole(user: User): Promise<User> {
  const email = user.email?.toLowerCase();
  if (!email || !getSuperAdminEmails().includes(email)) {
    return user;
  }

  if (isSuperAdmin(user)) {
    return user;
  }

  if (!hasSupabaseSecretKey()) {
    console.warn(
      "SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) missing — skipping super admin promotion"
    );
    return user;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        role: "super_admin",
      },
    });

    if (error || !data.user) {
      console.error("Failed to promote super admin:", error);
      return user;
    }

    return data.user;
  } catch (error) {
    console.error("Failed to promote super admin:", error);
    return user;
  }
}
