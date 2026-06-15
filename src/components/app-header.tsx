"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { BillingStatus } from "@/lib/db/billing";
import { useT } from "@/i18n/client";
import { useLocalizedPath } from "@/i18n/navigation-client";
import { iconDirectional } from "@/lib/utils";
import { LayoutDashboard, LogIn, Plus } from "lucide-react";

type AppHeaderProps = {
  onNewApplication?: () => void;
  isSuperAdmin?: boolean;
  billing?: BillingStatus | null;
  isGuest?: boolean;
  onSignIn?: () => void;
};

export function AppHeader({
  onNewApplication,
  isSuperAdmin = false,
  billing,
  isGuest = false,
  onSignIn,
}: AppHeaderProps) {
  const t = useT();
  const localizedPath = useLocalizedPath();

  const creditsLabel = billing?.can_download_unlimited
    ? t("common.pro")
    : t("header.badge.downloads", { count: billing?.form_credits ?? 0 });

  return (
    <header className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:gap-4 sm:px-6 sm:py-[18px] lg:px-8">
      <div className="flex items-center gap-4">
        <div className="font-mono text-[15px] font-medium tracking-tight">
          form<span className="text-primary">fill</span>
        </div>
        <Badge
          variant="outline"
          className="rounded-sm border-primary bg-primary/10 font-mono text-[10px] tracking-widest text-primary"
        >
          {t("common.beta")}
        </Badge>
        {isGuest ? (
          <Badge
            variant="outline"
            className="hidden rounded-sm font-mono text-[10px] text-muted-foreground sm:inline-flex"
          >
            {t("header.badge.guest")}
          </Badge>
        ) : (
          billing && (
            <Badge
              variant="outline"
              className="hidden rounded-sm font-mono text-[10px] sm:inline-flex"
            >
              {creditsLabel}
            </Badge>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        <LocaleSwitcher />

        {onNewApplication && (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onNewApplication}
          >
            <Plus className="size-3.5 sm:hidden" />
            <span className="hidden sm:inline">
              {t("header.newApplication.desktop")}
            </span>
            <span className="sm:hidden">{t("header.newApplication.mobile")}</span>
          </Button>
        )}

        {isGuest && onSignIn && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onSignIn}
          >
            <LogIn className={iconDirectional("size-3.5")} />
            <span className="hidden sm:inline">
              {t("header.createAccount.desktop")}
            </span>
            <span className="sm:hidden">
              {t("header.createAccount.mobile")}
            </span>
          </Button>
        )}

        {isSuperAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            nativeButton={false}
            render={<Link href={localizedPath("/admin")} />}
          >
            <LayoutDashboard className="size-3.5" />
            <span className="hidden sm:inline">{t("common.admin")}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
