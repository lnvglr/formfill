import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DbClient = SupabaseClient<Database>;

export async function clearUserApplications(
  supabase: DbClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
