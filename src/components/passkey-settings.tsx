"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  isPasskeySupported,
  isPasskeyUserCancelled,
  passkeyErrorMessage,
} from "@/lib/auth/passkey";
import { useI18n } from "@/i18n/client";
import { localeToBcp47 } from "@/i18n/config";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function PasskeySettings() {
  const { t, locale } = useI18n();
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const formatPasskeyDate = useCallback(
    (value?: string | null): string => {
      if (!value) return "—";
      return new Date(value).toLocaleDateString(localeToBcp47[locale], {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
    [locale]
  );

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

    toast.success(t("passkeys.added"));
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

    toast.success(t("passkeys.removed"));
    await loadPasskeys();
  };

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">{t("passkeys.unsupported")}</p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t("passkeys.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {passkeys.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("passkeys.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {passkey.friendly_name ?? t("passkeys.defaultName")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("passkeys.created", {
                    date: formatPasskeyDate(passkey.created_at),
                  })}
                  {passkey.last_used_at && (
                    <>
                      {" "}
                      {t("passkeys.lastUsed", {
                        date: formatPasskeyDate(passkey.last_used_at),
                      })}
                    </>
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={actionId !== null}
                onClick={() => removePasskey(passkey.id)}
                aria-label={t("passkeys.removeAria")}
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
        {t("passkeys.add")}
      </Button>
    </div>
  );
}
