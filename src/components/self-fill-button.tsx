"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { UserRound } from "lucide-react";

type SelfFillButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

export function SelfFillButton({ disabled, onClick }: SelfFillButtonProps) {
  const t = useT();

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
      {t("questionnaire.selfFill")}
    </Button>
  );
}
