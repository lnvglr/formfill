"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/client";
import { localeToBcp47 } from "@/i18n/config";
import { getCompleteness, getProfileOwnerName } from "@/lib/profile";
import type { AppView } from "@/lib/app-views";
import type { HistoryItem, ProfileData, ProfileField } from "@/lib/types";
import { cn, iconDirectional } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Settings,
  User,
} from "lucide-react";

type ProfileSidebarProps = {
  profile: ProfileData;
  fields: ProfileField[];
  history: HistoryItem[];
  currentView: AppView;
  isGuest?: boolean;
  onNavigate: (view: AppView) => void;
  onSignIn?: () => void;
};

export function ProfileSidebar({
  profile,
  fields,
  history,
  currentView,
  isGuest = false,
  onNavigate,
  onSignIn,
}: ProfileSidebarProps) {
  const { t, locale } = useI18n();
  const ownerName = getProfileOwnerName(profile);
  const completeness = getCompleteness(profile);
  const staleCount = fields.filter(
    (f) => f.freshness === "stale" || f.freshness === "aging"
  ).length;

  const incompleteApplications = history.filter(
    (item) => item.missing_count > 0 || item.status === "failed"
  );
  const completeApplications = history.filter(
    (item) => item.missing_count === 0 && item.status !== "failed"
  );
  const sidebarApplications = [
    ...incompleteApplications,
    ...completeApplications,
  ].slice(0, 5);

  const coverageTagline =
    fields.length === 0
      ? t("sidebar.profile.coverageEmpty")
      : t("sidebar.profile.coverage", { percent: completeness });

  const getApplicationStatus = (item: HistoryItem) => {
    if (item.status === "failed") {
      return {
        label: t("sidebar.status.error"),
        className: "border-destructive/40 bg-destructive/10 text-destructive",
        icon: AlertCircle,
      };
    }

    if (item.missing_count > 0) {
      return {
        label: t("sidebar.status.missing", { count: item.missing_count }),
        className:
          "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-500",
        icon: AlertCircle,
      };
    }

    return {
      label: t("sidebar.status.complete"),
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
      icon: CheckCircle2,
    };
  };

  const dateLocale = localeToBcp47[locale];

  return (
    <aside className="hidden h-full max-h-full min-h-0 flex-col overflow-hidden border-r bg-card/20 lg:flex">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-5">
          {isGuest && onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full rounded-md border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:border-primary/50"
            >
              <p className="text-xs font-medium text-primary">
                {t("sidebar.guest.title")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("sidebar.guest.description")}
              </p>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className={cn(
              "group w-full rounded-md border p-4 text-left transition-colors",
              currentView === "profile"
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    currentView === "profile"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <User className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {ownerName ?? t("sidebar.profile.setup")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t("sidebar.profile.savedFields")}{" "}
                    <span className="font-mono font-medium text-foreground">
                      {fields.length}
                    </span>
                  </p>
                </div>
              </div>
              <ChevronRight
                className={iconDirectional(
                  "mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
                  currentView === "profile" && "text-primary"
                )}
              />
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {coverageTagline}
            </p>

            {staleCount > 0 && (
              <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-500">
                {staleCount === 1
                  ? t("sidebar.profile.staleOne", { count: staleCount })
                  : t("sidebar.profile.staleOther", { count: staleCount })}
              </p>
            )}
          </button>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[1.5px] text-muted-foreground uppercase">
                {t("sidebar.applications.title")}
              </p>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate("history")}
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] transition-colors",
                    currentView === "history"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("sidebar.applications.toHistory")}
                  <ChevronRight className={iconDirectional("size-3")} />
                </button>
              )}
            </div>

            {sidebarApplications.length === 0 ? (
              <div className="rounded-md border border-dashed py-8 text-center text-xs leading-relaxed text-muted-foreground">
                <FileText className="mx-auto mb-2.5 size-7 opacity-60" />
                {t("sidebar.applications.empty")}
                <br />
                {t("sidebar.applications.emptyHint")}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {incompleteApplications.length > 0 && (
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-500">
                    <Clock className="size-3" />
                    {t("sidebar.applications.incomplete", {
                      count: incompleteApplications.length,
                    })}
                  </p>
                )}

                {sidebarApplications.map((item) => {
                  const status = getApplicationStatus(item);
                  const StatusIcon = status.icon;
                  const isIncomplete = item.missing_count > 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate("history")}
                      className={cn(
                        "w-full rounded-sm border bg-card p-2.5 text-left transition-colors hover:border-primary/40",
                        isIncomplete && "border-amber-500/25"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <StatusIcon
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            isIncomplete
                              ? "text-amber-600 dark:text-amber-500"
                              : item.status === "failed"
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-500"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {item.title}
                          </p>
                          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString(
                              dateLocale
                            )}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-4 rounded-sm px-1.5 text-[9px]",
                                status.className
                              )}
                            >
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {history.length > sidebarApplications.length && (
                  <button
                    type="button"
                    onClick={() => onNavigate("history")}
                    className="pt-1 text-center text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {t("sidebar.applications.moreInHistory", {
                      count: history.length - sidebarApplications.length,
                    })}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-5">
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-xs transition-colors",
            currentView === "settings"
              ? "border-primary/50 bg-primary/5 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
          )}
        >
          <Settings className="size-3.5 shrink-0" />
          {t("sidebar.settings")}
        </button>
      </div>
    </aside>
  );
}
