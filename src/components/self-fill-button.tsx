"use client";

import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";

type SelfFillButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

export function SelfFillButton({ disabled, onClick }: SelfFillButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1 text-xs"
      disabled={disabled}
      onClick={onClick}
    >
      <UserRound className="size-3.5" />
      Das bin ich
    </Button>
  );
}
