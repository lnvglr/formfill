"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { AuthPanel } from "@/components/auth-panel";
import { X } from "lucide-react";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
  mode?: "sign-in" | "guest-upgrade";
  redirectPath?: string;
};

export function AuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
  mode = "sign-in",
  redirectPath = "/app",
}: AuthDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <AlertDialogCancel
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 size-8 text-muted-foreground"
          aria-label="Schließen"
        >
          <X className="size-4" />
        </AlertDialogCancel>

        <div className="overflow-y-auto">
          <AuthPanel
            embedded
            mode={mode}
            redirectPath={redirectPath}
            onAuthenticated={() => {
              onOpenChange(false);
              onAuthenticated();
            }}
          />
        </div>

        <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
          <AlertDialogCancel className="w-full">Abbrechen</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
