import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BillingStatus } from "@/lib/db/billing";
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
  const creditsLabel = billing?.can_download_unlimited
    ? "Pro"
    : `${billing?.form_credits ?? 0} Downloads`;

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
          BETA
        </Badge>
        {isGuest ? (
          <Badge
            variant="outline"
            className="hidden rounded-sm font-mono text-[10px] text-muted-foreground sm:inline-flex"
          >
            Gast
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
        {onNewApplication && (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onNewApplication}
          >
            <Plus className="size-3.5 sm:hidden" />
            <span className="hidden sm:inline">+ Neuen Antrag ausfüllen</span>
            <span className="sm:hidden">+ Neu</span>
          </Button>
        )}

        {isGuest && onSignIn && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onSignIn}
          >
            <LogIn className="size-3.5" />
            <span className="hidden sm:inline">Konto erstellen</span>
            <span className="sm:hidden">Anmelden</span>
          </Button>
        )}

        {isSuperAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            nativeButton={false}
            render={<Link href="/admin" />}
          >
            <LayoutDashboard className="size-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        )}

      </div>
    </header>
  );
}
