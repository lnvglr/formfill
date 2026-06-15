"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BillingStatus } from "@/lib/db/billing";
import { CREDIT_PACK_AMOUNT } from "@/lib/stripe";
import { useT } from "@/i18n/client";
import { Loader2, Sparkles } from "lucide-react";

type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billing: BillingStatus | null;
  onBillingRefresh?: () => Promise<void>;
};

export function UpgradeDialog({
  open,
  onOpenChange,
  billing,
  onBillingRefresh,
}: UpgradeDialogProps) {
  const t = useT();
  const [loadingPlan, setLoadingPlan] = useState<"credits" | "pro" | null>(
    null
  );

  const startCheckout = async (plan: "credits" | "pro") => {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? t("upgrade.error.checkout"));
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : t("upgrade.error.checkout")
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  const balanceLabel = billing?.can_download_unlimited
    ? t("upgrade.balance.pro")
    : t("upgrade.balance.credits", { count: billing?.form_credits ?? 0 });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("upgrade.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("upgrade.description")}
            {billing && <> {balanceLabel}.</>}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-2">
          <button
            type="button"
            onClick={() => startCheckout("credits")}
            disabled={loadingPlan !== null}
            className="rounded-md border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {t("upgrade.credits.title", { count: CREDIT_PACK_AMOUNT })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("upgrade.credits.subtitle")}
                </p>
              </div>
              {loadingPlan === "credits" && (
                <Loader2 className="size-4 animate-spin" />
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => startCheckout("pro")}
            disabled={loadingPlan !== null}
            className="rounded-md border border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/50"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="size-3.5 text-primary" />
                  {t("upgrade.pro.title")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("upgrade.pro.subtitle")}
                </p>
              </div>
              {loadingPlan === "pro" && (
                <Loader2 className="size-4 animate-spin" />
              )}
            </div>
          </button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          {onBillingRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onBillingRefresh()}
            >
              {t("upgrade.refresh")}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
