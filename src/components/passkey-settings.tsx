"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  isPasskeySupported,
  isPasskeyUserCancelled,
  passkeyErrorMessage,
} from "@/lib/auth/passkey";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

function formatPasskeyDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const loadPasskeys = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.passkey.list();

    if (error) {
      if (error.code !== "passkey_disabled") {
        toast.error(passkeyErrorMessage(error));
      }
      setPasskeys([]);
      return;
    }

    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    setSupported(isPasskeySupported());
    loadPasskeys().finally(() => setLoading(false));
  }, [loadPasskeys]);

  const addPasskey = async () => {
    setActionId("add");
    const supabase = createClient();
    const { error } = await supabase.auth.registerPasskey();
    setActionId(null);

    if (error) {
      if (!isPasskeyUserCancelled(error)) {
        toast.error(passkeyErrorMessage(error));
      }
      return;
    }

    toast.success("Passkey hinzugefügt");
    await loadPasskeys();
  };

  const removePasskey = async (passkeyId: string) => {
    setActionId(passkeyId);
    const supabase = createClient();
    const { error } = await supabase.auth.passkey.delete({ passkeyId });
    setActionId(null);

    if (error) {
      toast.error(passkeyErrorMessage(error));
      return;
    }

    toast.success("Passkey entfernt");
    await loadPasskeys();
  };

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Passkeys werden in diesem Browser nicht unterstützt.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Passkeys werden geladen…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {passkeys.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Noch kein Passkey eingerichtet. Füge einen hinzu, um dich schneller
          anzumelden.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {passkey.friendly_name ?? "Passkey"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Erstellt {formatPasskeyDate(passkey.created_at)}
                  {passkey.last_used_at && (
                    <> · zuletzt {formatPasskeyDate(passkey.last_used_at)}</>
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={actionId !== null}
                onClick={() => removePasskey(passkey.id)}
                aria-label="Passkey entfernen"
              >
                {actionId === passkey.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5 text-muted-foreground" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={actionId !== null}
        onClick={addPasskey}
      >
        {actionId === "add" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Fingerprint className="size-3.5" />
        )}
        Passkey hinzufügen
      </Button>
    </div>
  );
}
