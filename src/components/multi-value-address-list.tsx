"use client";

import { useState } from "react";
import { AddressFieldInput } from "@/components/address-field-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProfileEntryId,
  type ProfileAddressEntry,
} from "@/lib/profile-multi";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Plus, Star, Trash2 } from "lucide-react";

type MultiValueAddressListProps = {
  entries: ProfileAddressEntry[];
  defaultId?: string;
  onChange: (entries: ProfileAddressEntry[], defaultId?: string) => void;
  className?: string;
};

export function MultiValueAddressList({
  entries,
  defaultId,
  onChange,
  className,
}: MultiValueAddressListProps) {
  const t = useT();
  const [emptyEntryId] = useState(() => createProfileEntryId());
  const visibleEntries =
    entries.length > 0
      ? entries
      : [
          {
            id: emptyEntryId,
            label: "",
            strasse: "",
            postleitzahl: "",
            ort: "",
          },
        ];

  const updateEntry = (
    id: string,
    patch: Partial<Omit<ProfileAddressEntry, "id">>
  ) => {
    onChange(
      visibleEntries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
      defaultId
    );
  };

  const updateAddressPart = (id: string, key: string, value: string) => {
    if (key === "strasse") updateEntry(id, { strasse: value });
    if (key === "postleitzahl") updateEntry(id, { postleitzahl: value });
    if (key === "ort") updateEntry(id, { ort: value });
  };

  const removeEntry = (id: string) => {
    const next = visibleEntries.filter((entry) => entry.id !== id);
    const nextDefault =
      defaultId === id ? next[0]?.id : defaultId ?? next[0]?.id;
    onChange(next, nextDefault);
  };

  const addEntry = () => {
    const id = createProfileEntryId();
    onChange(
      [
        ...visibleEntries,
        { id, label: "", strasse: "", postleitzahl: "", ort: "" },
      ],
      defaultId ?? (visibleEntries.length === 0 ? id : defaultId)
    );
  };

  const setDefault = (id: string) => {
    onChange(visibleEntries, id);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">
          {t("starterForm.multi.addresses")}
        </Label>
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
          const values = {
            strasse: entry.strasse,
            postleitzahl: entry.postleitzahl,
            ort: entry.ort,
          };

          return (
            <div
              key={entry.id}
              className="rounded-md border border-border/60 bg-secondary/20 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Input
                  value={entry.label ?? ""}
                  onChange={(event) =>
                    updateEntry(entry.id, { label: event.target.value })
                  }
                  placeholder={
                    index === 0
                      ? t("starterForm.multi.primaryLabel")
                      : t("starterForm.multi.secondaryAddressLabel")
                  }
                  className="h-8 max-w-[12rem] bg-background/80 text-xs"
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
              <AddressFieldInput
                fieldKey="strasse"
                values={values}
                onChange={(key, value) =>
                  updateAddressPart(entry.id, key, value)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
