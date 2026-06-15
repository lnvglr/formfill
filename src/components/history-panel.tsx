"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { HistoryItem } from "@/lib/types";
import { localeToBcp47 } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

type HistoryPanelProps = {
  history: HistoryItem[];
};

export function HistoryPanel({ history }: HistoryPanelProps) {
  const { t, locale } = useI18n();

  const getStatusBadge = (item: HistoryItem) => {
    if (item.status === "failed") {
      return {
        label: t("history.status.error"),
        className: "border-destructive bg-destructive/10 text-destructive",
      };
    }

    if (item.missing_count > 0) {
      return {
        label: t("history.status.incomplete"),
        className:
          "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-500",
      };
    }

    return {
      label: t("history.status.complete"),
      className:
        "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    };
  };

  const incompleteCount = history.filter(
    (item) => item.missing_count > 0 || item.status === "failed"
  ).length;

  const dateLocale = localeToBcp47[locale];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {incompleteCount > 0 && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          {incompleteCount === 1
            ? t("history.incompleteBannerOne")
            : t("history.incompleteBannerOther", { count: incompleteCount })}
        </p>
      )}

      {history.length === 0 ? (
        <p className="py-4 text-xs text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((item) => {
            const status = getStatusBadge(item);

            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{item.title}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString(dateLocale)}{" "}
                      ·{" "}
                      {t("history.fieldsFilled", { count: item.fields_count })}
                      {item.missing_count > 0 &&
                        t("history.requiredMissing", {
                          count: item.missing_count,
                        })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit shrink-0 rounded-sm font-mono text-[10px]",
                      status.className
                    )}
                  >
                    {status.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
