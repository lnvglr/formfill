"use client";

import { Label } from "@/components/ui/label";
import type { ProfileValueOption } from "@/lib/profile-multi";
import { cn } from "@/lib/utils";

type ProfileValuePickerProps = {
  label: string;
  options: ProfileValueOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
};

export function ProfileValuePicker({
  label,
  options,
  selectedId,
  onSelect,
  className,
}: ProfileValuePickerProps) {
  if (options.length <= 1) return null;

  const currentId = selectedId ?? options[0]?.id;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={currentId}
        onChange={(event) => onSelect(event.target.value)}
        className="h-10 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
