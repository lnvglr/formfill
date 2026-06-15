"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type ViewHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function ViewHeader({ title, subtitle, onBack }: ViewHeaderProps) {
  return (
    <div className="mb-4 flex items-start gap-3 sm:mb-6 lg:mb-8">
      <Button
        variant="ghost"
        size="icon"
        className="mt-0.5 size-8 shrink-0 text-muted-foreground"
        onClick={onBack}
        aria-label="Zurück"
      >
        <ArrowLeft className="size-4" />
      </Button>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
