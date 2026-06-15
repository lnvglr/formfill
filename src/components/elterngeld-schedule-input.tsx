"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BASIS_MONTHS_MAX,
  PLUS_MONTHS_MAX,
  PREMATURE_MONTHS,
  type BenefitSelection,
  type ElterngeldSchedule,
  getParentSchedule,
  isMonthActive,
  parseElterngeldSchedule,
  serializeElterngeldSchedule,
  setParentMonth,
  setStandardMonths,
  validateElterngeldSchedule,
} from "@/lib/elterngeld-schedule";

type ElterngeldScheduleInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function MonthCell({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-medium transition-colors sm:size-8 sm:text-xs",
        disabled && "cursor-not-allowed opacity-30",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted"
      )}
    />
  );
}

function ParentSection({
  parent,
  schedule,
  onChange,
}: {
  parent: 1 | 2;
  schedule: ElterngeldSchedule;
  onChange: (next: ElterngeldSchedule) => void;
}) {
  const parentSchedule = getParentSchedule(schedule, parent);
  const customMode = !parentSchedule.standardMonths1to12;

  const toggleMonth = (month: number, benefit: BenefitSelection) => {
    const active = isMonthActive(parentSchedule, month, benefit);
    onChange(
      setParentMonth(schedule, parent, month, active ? null : benefit)
    );
  };

  const months = useMemo(
    () => Array.from({ length: PLUS_MONTHS_MAX }, (_, i) => i + 1),
    []
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card/50 p-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Elternteil {parent}</h3>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed p-3 hover:bg-muted/40">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            checked={parentSchedule.standardMonths1to12}
            onChange={(e) =>
              onChange(setStandardMonths(schedule, parent, e.target.checked))
            }
          />
          <span className="text-sm leading-snug">
            Ich beantrage (Basis-)Elterngeld für den 1.–12. Lebensmonat
          </span>
        </label>
      </div>

      {customMode && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Oder abweichend: pro Monat entweder Basis-Elterngeld oder
            Elterngeld Plus wählen (nicht beides).
          </p>

          <div className="overflow-x-auto pb-1">
            <div className="min-w-max">
              <div className="mb-2 grid grid-cols-[5.5rem_repeat(32,minmax(1.75rem,2rem))] gap-0.5">
                <div />
                {months.map((month) => (
                  <div
                    key={`head-${month}`}
                    className={cn(
                      "text-center text-[9px] font-medium text-muted-foreground sm:text-[10px]",
                      PREMATURE_MONTHS.includes(
                        month as (typeof PREMATURE_MONTHS)[number]
                      ) && "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {month}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[5.5rem_repeat(32,minmax(1.75rem,2rem))] items-center gap-0.5">
                <Label className="pr-2 text-[10px] leading-tight sm:text-xs">
                  (Basis-) Elterngeld
                </Label>
                {months.map((month) => {
                  const disabled = month > BASIS_MONTHS_MAX;
                  return (
                    <MonthCell
                      key={`basis-${month}`}
                      disabled={disabled}
                      active={isMonthActive(parentSchedule, month, "basis")}
                      label={`Elternteil ${parent}, Monat ${month}, Basis-Elterngeld`}
                      onClick={() => toggleMonth(month, "basis")}
                    />
                  );
                })}
              </div>

              <div className="mt-1 grid grid-cols-[5.5rem_repeat(32,minmax(1.75rem,2rem))] items-center gap-0.5">
                <Label className="pr-2 text-[10px] leading-tight sm:text-xs">
                  Elterngeld Plus
                </Label>
                {months.map((month) => (
                  <MonthCell
                    key={`plus-${month}`}
                    active={isMonthActive(parentSchedule, month, "plus")}
                    label={`Elternteil ${parent}, Monat ${month}, Elterngeld Plus`}
                    onClick={() => toggleMonth(month, "plus")}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Monate 15–18 nur bei Frühgeburten. Ab Monat 19 nur Elterngeld Plus
            (ohne Lücken). Ein Monat Basis entspricht zwei Monaten Plus.
          </p>
        </div>
      )}
    </div>
  );
}

export function ElterngeldScheduleInput({
  value,
  onChange,
}: ElterngeldScheduleInputProps) {
  const schedule = useMemo(() => parseElterngeldSchedule(value), [value]);
  const errors = useMemo(() => validateElterngeldSchedule(schedule), [schedule]);

  const update = (next: ElterngeldSchedule) => {
    onChange(serializeElterngeldSchedule(next));
  };

  const clearAll = () => {
    onChange("");
  };

  return (
    <div className="flex flex-col gap-4">
      <ParentSection parent={1} schedule={schedule} onChange={update} />
      <ParentSection parent={2} schedule={schedule} onChange={update} />

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          Auswahl zurücksetzen
        </Button>
      </div>
    </div>
  );
}
