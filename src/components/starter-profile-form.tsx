"use client";

import { useState } from "react";
import { AddressFieldInput } from "@/components/address-field-input";
import { FieldInput } from "@/components/field-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatProfileValue, inferFieldType } from "@/lib/field-types";
import {
  countStarterFieldsFilled,
  hasStarterFields,
  pickStarterValues,
  STARTER_PROFILE_FIELDS,
} from "@/lib/starter-profile-fields";
import type { ProfileData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

type StarterProfileFormProps = {
  profile: ProfileData;
  onSave: (data: ProfileData) => Promise<void>;
  className?: string;
};

export function StarterProfileForm({
  profile,
  onSave,
  className,
}: StarterProfileFormProps) {
  const [expanded, setExpanded] = useState(() => !hasStarterFields(profile));
  const [values, setValues] = useState(() => pickStarterValues(profile));
  const [saving, setSaving] = useState(false);

  const filledCount = countStarterFieldsFilled(profile);
  const totalGroups = STARTER_PROFILE_FIELDS.length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = { ...profile };

      for (const key of [
        "name",
        "geburtsdatum",
        "geburtsort",
        "strasse",
        "postleitzahl",
        "ort",
        "telefon",
        "email",
      ] as const) {
        const raw = values[key]?.trim() ?? "";
        if (!raw) {
          delete next[key];
          continue;
        }

        next[key] = formatProfileValue(inferFieldType(key, key), raw);
      }

      await onSave(next);
      toast.success("Grunddaten gespeichert");
      setExpanded(false);
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="gap-0 p-4 pb-0">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-start gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <CardTitle className="text-[13px] font-semibold tracking-wide">
              Grunddaten vorab eingeben
            </CardTitle>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Optional — Name, Geburtsdatum und Adresse werden beim ersten
              Antrag automatisch vorausgefüllt.
            </p>
            {!expanded && filledCount > 0 && (
              <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-500">
                {filledCount} von {totalGroups} Bereichen gespeichert
              </p>
            )}
          </div>
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="flex flex-col gap-5 p-4 pt-4">
          <div className="grid gap-5 sm:grid-cols-2">
            {STARTER_PROFILE_FIELDS.map((field) => {
              if (field.type === "address") {
                return (
                  <div
                    key={field.key}
                    className="flex flex-col gap-1.5 sm:col-span-2"
                  >
                    <Label className="text-xs text-muted-foreground">
                      {field.label}
                    </Label>
                    <AddressFieldInput
                      fieldKey={field.key}
                      values={values}
                      onChange={(key, value) =>
                        setValues((prev) => ({ ...prev, [key]: value }))
                      }
                    />
                  </div>
                );
              }

              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {field.label}
                  </Label>
                  <FieldInput
                    fieldKey={field.key}
                    type={field.type}
                    value={values[field.key] ?? ""}
                    onChange={(value) =>
                      setValues((prev) => ({ ...prev, [field.key]: value }))
                    }
                    showHint={false}
                    autoFocus={false}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Speichern
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
