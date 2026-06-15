"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BillingStatus } from "@/lib/db/billing";
import { CREDIT_PACK_AMOUNT, FREE_MONTHLY_CREDITS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/client";
import { localeToBcp47 } from "@/i18n/config";
import { iconDirectional } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { Loader2, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function BillingSection() {
  const { t, locale } = useI18n();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<
    "credits" | "pro" | "portal" | null
  >(null);

  const dateLocale = localeToBcp47[locale];

  const loadBilling = useCallback(async () => {
    const meRes = await fetch("/api/me");
    if (!meRes.ok) return;
    const me = await meRes.json();
    setEmail(me.email ?? null);
    setBilling(me.billing ?? null);
  }, []);

  useEffect(() => {
    loadBilling().finally(() => setLoading(false));
  }, [loadBilling]);

  const startCheckout = async (plan: "credits" | "pro") => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("billing.error.checkout")
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const openPortal = async () => {
    setCheckoutLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("billing.error.portal")
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t("billing.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("billing.account.title")}</h2>
        <div className="rounded-md border bg-card/40 p-4">
          {email ? (
            <>
              <p className="text-sm">{email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("billing.account.signInHint")}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("billing.account.noEmail")}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-7 text-xs"
            onClick={signOut}
          >
            <LogOut className={iconDirectional("size-3")} />
            {t("billing.signOut")}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("billing.downloads.title")}</h2>
        <div className="rounded-md border bg-card/40 p-4">
          {billing?.is_pro ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Sparkles className="size-3.5" />
                {t("billing.pro.active")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("billing.pro.unlimited")}
                {billing.subscription_period_end && (
                  <>
                    {" "}
                    {t("billing.pro.validUntil", {
                      date: new Date(
                        billing.subscription_period_end
                      ).toLocaleDateString(dateLocale),
                    })}
                  </>
                )}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 w-fit text-xs"
                disabled={checkoutLoading === "portal"}
                onClick={openPortal}
              >
                {checkoutLoading === "portal" && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                {t("billing.pro.manage")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                <span className="font-medium">{billing?.form_credits ?? 0}</span>{" "}
                {t("billing.credits.balance")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("billing.credits.freePlan", {
                  count: FREE_MONTHLY_CREDITS,
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={checkoutLoading !== null}
                  onClick={() => startCheckout("credits")}
                >
                  {checkoutLoading === "credits" && (
                    <Loader2 className="size-3 animate-spin" />
                  )}
                  {t("billing.credits.buy", { count: CREDIT_PACK_AMOUNT })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={checkoutLoading !== null}
                  onClick={() => startCheckout("pro")}
                >
                  {checkoutLoading === "pro" && (
                    <Loader2 className="size-3 animate-spin" />
                  )}
                  {t("billing.pro.upgrade")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
