"use client";

import { cn } from "@/lib/utils";

type QuestionnaireStepIndicatorProps = {
  totalSteps: number;
  currentIndex: number;
  requiredCount: number;
  optionalCount: number;
  answeredCount: number;
  formTitle?: string;
};

export function QuestionnaireStepIndicator({
  totalSteps,
  currentIndex,
  requiredCount,
  optionalCount,
  answeredCount,
  formTitle,
}: QuestionnaireStepIndicatorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="font-mono tracking-wide">
          Schritt {currentIndex + 1} von {totalSteps}
        </span>
        <span>
          {requiredCount} Pflicht
          {optionalCount > 0 && ` · ${optionalCount} optional`}
        </span>
      </div>

      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: totalSteps }).map((_, stepIndex) => (
          <div
            key={stepIndex}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              stepIndex < currentIndex && "bg-primary/70",
              stepIndex === currentIndex && "bg-primary",
              stepIndex > currentIndex && "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {formTitle && (
          <p className="min-w-0 truncate text-muted-foreground">
            <span className="font-mono">Formular:</span>{" "}
            <span className="text-foreground">{formTitle}</span>
          </p>
        )}
        <p className="font-mono text-muted-foreground">
          {answeredCount} beantwortet
        </p>
      </div>
    </div>
  );
}
