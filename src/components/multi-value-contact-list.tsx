"use client";

import { useState } from "react";
import { FieldInput } from "@/components/field-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProfileEntryId,
  type ProfileValueEntry,
} from "@/lib/profile-multi";
import type { FieldType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Plus, Star, Trash2 } from "lucide-react";

type MultiValueContactListProps = {
  label: string;
  fieldKey: string;
  fieldType: FieldType;
  entries: ProfileValueEntry[];
  defaultId?: string;
  onChange: (entries: ProfileValueEntry[], defaultId?: string) => void;
  className?: string;
};

export function MultiValueContactList({
  label,
  fieldKey,
  fieldType,
  entries,
  defaultId,
  onChange,
  className,
}: MultiValueContactListProps) {
  const t = useT();
  const [emptyEntryId] = useState(() => createProfileEntryId());
  const updateEntry = (
    id: string,
    patch: Partial<Pick<ProfileValueEntry, "value" | "label">>
  ) => {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
      defaultId
    );
  };

  const removeEntry = (id: string) => {
    const next = entries.filter((entry) => entry.id !== id);
    const nextDefault =
      defaultId === id ? next[0]?.id : defaultId ?? next[0]?.id;
    onChange(next, nextDefault);
  };

  const addEntry = () => {
    const id = createProfileEntryId();
    onChange(
      [...entries, { id, value: "", label: "" }],
      defaultId ?? (entries.length === 0 ? id : defaultId)
    );
  };

  const setDefault = (id: string) => {
    onChange(entries, id);
  };

  const visibleEntries =
    entries.length > 0
      ? entries
      : [{ id: emptyEntryId, value: "", label: "" }];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={addEntry}
        >
          <Plus className="size-3.5" />
          {t("starterForm.multi.addAnother")}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {visibleEntries.map((entry, index) => {
          const isDefault = (defaultId ?? visibleEntries[0]?.id) === entry.id;
          return (
            <div
              key={entry.id}
              className="rounded-md border border-border/60 bg-secondary/20 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Input
                  value={entry.label ?? ""}
                  onChange={(event) =>
                    updateEntry(entry.id, { label: event.target.value })
                  }
                  placeholder={
                    index === 0
                      ? t("starterForm.multi.primaryContactLabel")
                      : t("starterForm.multi.secondaryContactLabel")
                  }
                  className="h-8 max-w-[10rem] bg-background/80 text-xs"
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant={isDefault ? "secondary" : "ghost"}
                    className="size-7"
                    title={t("starterForm.multi.setDefault")}
                    onClick={() => setDefault(entry.id)}
                  >
                    <Star
                      className={cn(
                        "size-3.5",
                        isDefault && "fill-current text-amber-500"
                      )}
                    />
                  </Button>
                  {visibleEntries.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEntry(entry.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <FieldInput
                fieldKey={fieldKey}
                type={fieldType}
                value={entry.value}
                onChange={(value) => updateEntry(entry.id, { value })}
                showHint={false}
                autoFocus={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
