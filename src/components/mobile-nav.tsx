"use client";

import type { AppView } from "@/lib/app-views";
import { cn } from "@/lib/utils";
import { Clock, FileUp, Settings, User } from "lucide-react";

const NAV_ITEMS: {
  view: AppView;
  label: string;
  icon: typeof FileUp;
}[] = [
  { view: "upload", label: "Antrag", icon: FileUp },
  { view: "profile", label: "Profil", icon: User },
  { view: "history", label: "Verlauf", icon: Clock },
  { view: "settings", label: "Mehr", icon: Settings },
];

type MobileNavProps = {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
};

export function MobileNav({ currentView, onNavigate }: MobileNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Hauptnavigation"
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          const isActive = currentView === view;

          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              className={cn(
                "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
