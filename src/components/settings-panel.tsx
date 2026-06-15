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
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";

type SettingsPanelProps = {
  isGuest?: boolean;
  onSignIn?: () => void;
  onClearProfile: () => void;
};

const themeOptions = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function SettingsPanel({
  isGuest = false,
  onSignIn,
  onClearProfile,
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Darstellung</h2>
        <p className="text-xs text-muted-foreground">
          Wähle ein Farbschema für die Oberfläche.
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
          <h2 className="text-sm font-medium">Konto</h2>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Du nutzt Formfill als Gast. Erstelle ein Konto, um Anträge zu
              speichern, den Verlauf zu nutzen und Downloads zu verwalten.
            </p>
            {onSignIn && (
              <Button size="sm" className="mt-4" onClick={onSignIn}>
                Konto erstellen
              </Button>
            )}
          </div>
        </section>
      ) : (
        <BillingSection />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Sicherheit</h2>
        <div className="rounded-md border bg-card/40 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Dein Profil und deine PDFs werden auf diesem Gerät verschlüsselt,
            bevor sie gespeichert werden. Nicht einmal wir können deine Daten
            lesen.
          </p>
          {!isGuest && (
            <>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Passkeys schützen dein Konto vor Phishing. Dein verschlüsseltes
                Profil bleibt an dieses Gerät gebunden — auf einem neuen Gerät
                legst du es einmalig neu an.
              </p>
              <div className="mt-4 border-t pt-4">
                <p className="mb-3 text-xs font-medium">Passkeys</p>
                <PasskeySettings />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Daten</h2>
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Alle Profildaten, Anträge und hochgeladenen PDFs unwiderruflich
            löschen.
          </p>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  Alle Daten löschen
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Alle Daten löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Profil, Verlauf und gespeicherte PDFs werden gelöscht. Diese
                  Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onClearProfile}>
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
