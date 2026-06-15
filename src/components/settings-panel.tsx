"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { BillingSection } from "@/components/billing-section";
import { PasskeySettings } from "@/components/passkey-settings";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";

type SettingsPanelProps = {
  isGuest?: boolean;
  onSignIn?: () => void;
  onClearProfile: () => void;
};

export function SettingsPanel({
  isGuest = false,
  onSignIn,
  onClearProfile,
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useT();

  const themeOptions = [
    { value: "light", label: t("settings.theme.light"), icon: Sun },
    { value: "dark", label: t("settings.theme.dark"), icon: Moon },
    { value: "system", label: t("settings.theme.system"), icon: Monitor },
  ] as const;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("settings.appearance.title")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("settings.appearance.subtitle")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => {
            const isActive = mounted && theme === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-md border px-3 py-4 text-xs transition-colors",
                  isActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {isGuest ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{t("settings.account.title")}</h2>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("settings.account.guestHint")}
            </p>
            {onSignIn && (
              <Button size="sm" className="mt-4" onClick={onSignIn}>
                {t("settings.account.create")}
              </Button>
            )}
          </div>
        </section>
      ) : (
        <BillingSection />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("settings.security.title")}</h2>
        <div className="rounded-md border bg-card/40 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("settings.security.encryption")}
          </p>
          {!isGuest && (
            <>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("settings.security.passkeys")}
              </p>
              <div className="mt-4 border-t pt-4">
                <p className="mb-3 text-xs font-medium">
                  {t("settings.security.passkeysTitle")}
                </p>
                <PasskeySettings />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("settings.data.title")}</h2>
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("settings.data.deleteHint")}
          </p>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  {t("settings.data.deleteButton")}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("settings.data.deleteDialog.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.data.deleteDialog.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onClearProfile}>
                  {t("settings.data.deleteDialog.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
