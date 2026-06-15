import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteVaultRecord,
  fetchVaultRecord,
  upsertVaultRecord,
} from "@/lib/db/vault";
import { clearUserApplications } from "@/lib/db/profile";
import type { VaultRecord } from "@/lib/crypto/vault-types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  try {
    const record = await fetchVaultRecord(supabase, user.id);
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = (await request.json()) as { record: VaultRecord };

  if (!body.record?.salt || !body.record?.ciphertext) {
    return NextResponse.json({ error: "Ungültiger Vault" }, { status: 400 });
  }

  try {
    await upsertVaultRecord(supabase, user.id, body.record);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  try {
    await deleteVaultRecord(supabase, user.id);
    await clearUserApplications(supabase, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
