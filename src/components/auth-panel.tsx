"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  isPasskeySupported,
  isPasskeyUserCancelled,
  passkeyErrorMessage,
} from "@/lib/auth/passkey";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Fingerprint, Loader2, Mail, ShieldCheck } from "lucide-react";

type AuthPanelProps = {
  onAuthenticated: () => void;
  embedded?: boolean;
  mode?: "sign-in" | "guest-upgrade";
  redirectPath?: string;
};

type AuthStep = "landing" | "email" | "otp" | "setup-passkey";

export function AuthPanel({
  onAuthenticated,
  embedded = false,
  mode = "sign-in",
  redirectPath = "/app",
}: AuthPanelProps) {
  const t = useT();
  const isGuestUpgrade = mode === "guest-upgrade";
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<AuthStep>(
    isGuestUpgrade ? "email" : "landing"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  useEffect(() => {
    setPasskeyAvailable(isPasskeySupported());
  }, []);

  const signInWithPasskey = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPasskey();

    setLoading(false);

    if (signInError) {
      if (!isPasskeyUserCancelled(signInError)) {
        setError(passkeyErrorMessage(signInError));
      }
      return;
    }

    onAuthenticated();
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", redirectPath);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setStep("otp");
    setMessage(t("auth.otp.message"));
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    if (passkeyAvailable) {
      setStep("setup-passkey");
      return;
    }

    onAuthenticated();
  };

  const registerPasskey = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: registerError } = await supabase.auth.registerPasskey();

    setLoading(false);

    if (registerError && !isPasskeyUserCancelled(registerError)) {
      setError(passkeyErrorMessage(registerError));
      return;
    }

    onAuthenticated();
  };

  const title = isGuestUpgrade
    ? t("auth.title.createAccount")
    : t("auth.title.signIn");
  const subtitle = isGuestUpgrade
    ? t("auth.subtitle.guestUpgrade")
    : t("auth.subtitle.signIn");

  const content = (
    <>
      <CardHeader className={cn(embedded && "px-6 pt-6 pr-14 pb-4")}>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className={cn(embedded && "px-6 pb-5")}>
        {step === "landing" && (
          <div className="flex flex-col gap-4">
            {passkeyAvailable ? (
              <>
                <Button
                  type="button"
                  size="lg"
                  disabled={loading}
                  onClick={signInWithPasskey}
                  className="h-12"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Fingerprint className="size-4" />
                  )}
                  {t("auth.passkey.signIn")}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  {t("auth.passkey.hint")}
                </p>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
                    <span className="bg-card px-2 text-muted-foreground">
                      {t("common.or")}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("auth.passkey.unsupported")}
              </p>
            )}

            <Button
              type="button"
              variant={passkeyAvailable ? "outline" : "default"}
              disabled={loading}
              onClick={() => {
                setStep("email");
                setError(null);
              }}
            >
              <Mail className="size-4" />
              {t("auth.email.signIn")}
            </Button>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={sendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("auth.email.label")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.email.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              {t("auth.email.sendCode")}
            </Button>
            {!isGuestUpgrade && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("landing");
                  setError(null);
                }}
              >
                {t("auth.email.back")}
              </Button>
            )}
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="flex flex-col gap-4">
            {message && (
              <p className="text-xs text-muted-foreground">{message}</p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="otp">{t("auth.otp.label")}</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !otp.trim()}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {isGuestUpgrade
                ? t("auth.otp.submitCreateAccount")
                : t("auth.otp.submitSignIn")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
              }}
            >
              {t("auth.otp.changeEmail")}
            </Button>
          </form>
        )}

        {step === "setup-passkey" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {t("auth.setupPasskey.title")}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("auth.setupPasskey.description")}
                  </p>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="button" disabled={loading} onClick={registerPasskey}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              {t("auth.setupPasskey.add")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={onAuthenticated}
            >
              {t("auth.setupPasskey.later")}
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );

  if (embedded) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">{content}</Card>
    </div>
  );
}
