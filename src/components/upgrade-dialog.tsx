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
        throw new Error(data.error ?? "Checkout fehlgeschlagen");
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Checkout fehlgeschlagen"
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>PDF herunterladen</AlertDialogTitle>
          <AlertDialogDescription>
            Vorschau und Ausfüllen sind kostenlos. Für den Download wird ein
            Guthaben benötigt.
            {billing && (
              <>
                {" "}
                Aktuelles Guthaben:{" "}
                {billing.can_download_unlimited
                  ? "Pro — unbegrenzt"
                  : `${billing.form_credits} Download(s)`}
                .
              </>
            )}
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
                  {CREDIT_PACK_AMOUNT} Downloads
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Einmalig — ideal für gelegentliche Anträge
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
                  Formfill Pro
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unbegrenzte Downloads, monatlich kündbar
                </p>
              </div>
              {loadingPlan === "pro" && (
                <Loader2 className="size-4 animate-spin" />
              )}
            </div>
          </button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          {onBillingRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onBillingRefresh()}
            >
              Status aktualisieren
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
