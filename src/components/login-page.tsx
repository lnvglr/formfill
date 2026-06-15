"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const mode =
    searchParams.get("mode") === "guest-upgrade" ? "guest-upgrade" : "sign-in";
  const authError = searchParams.get("error") === "auth";
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !session.user.is_anonymous) {
        router.replace(next);
        return;
      }
      setCheckingSession(false);
    });
  }, [next, router]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="font-mono text-[15px] font-medium tracking-tight"
        >
          form<span className="text-primary">fill</span>
        </Link>
        <Link
          href="/app"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Zur App
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-md">
          <AuthPanel
            embedded
            mode={mode}
            redirectPath={next}
            onAuthenticated={() => router.replace(next)}
          />
        </Card>

        {authError && (
          <p className="mt-4 max-w-md text-center text-xs text-destructive">
            Anmeldung fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}

        <p className="mt-6 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
          {mode === "guest-upgrade"
            ? "Profil und bisherige Angaben bleiben auf diesem Gerät erhalten."
            : "Noch kein Konto? Der E-Mail-Code legt automatisch eines an."}
        </p>
        <Link
          href="/app"
          className="mt-2 text-xs text-primary transition-colors hover:underline"
        >
          Ohne Konto fortfahren
        </Link>
      </main>
    </div>
  );
}
