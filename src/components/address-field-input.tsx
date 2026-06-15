"use client";

import { MaskedInput } from "@/components/masked-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAddressKeyPrefix,
  getAddressPartKeys,
  getAutocompleteProps,
} from "@/lib/field-autocomplete";
import { getFieldMaskConfig, isPartialMaskedValue } from "@/lib/field-masks";

type AddressFieldInputProps = {
  fieldKey: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onLastFieldKeyDown?: (e: React.KeyboardEvent) => void;
};

const inputClass = "h-12 bg-secondary/50 text-base";

export function AddressFieldInput({
  fieldKey,
  values,
  onChange,
  onLastFieldKeyDown,
}: AddressFieldInputProps) {
  const prefix = getAddressKeyPrefix(fieldKey);
  const keys = getAddressPartKeys(prefix);
  const plzMaskConfig = getFieldMaskConfig(keys.postleitzahl, "number");
  const plzMaskOptions = plzMaskConfig
    ? (({ validate: _validate, ...options }) => options)(plzMaskConfig)
    : null;
  const plzValue = values[keys.postleitzahl] ?? "";
  const plzInvalid =
    Boolean(plzValue.trim()) &&
    isPartialMaskedValue(keys.postleitzahl, "number", plzValue);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={keys.strasse} className="text-xs text-muted-foreground">
          Straße und Hausnummer
        </Label>
        <Input
          id={keys.strasse}
          autoFocus
          value={values[keys.strasse] ?? ""}
          onChange={(e) => onChange(keys.strasse, e.target.value)}
          placeholder="Musterstraße 12a"
          className={inputClass}
          {...getAutocompleteProps(keys.strasse, "text")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor={keys.postleitzahl}
            className="text-xs text-muted-foreground"
          >
            PLZ
          </Label>
          {plzMaskOptions ? (
            <MaskedInput
              id={keys.postleitzahl}
              value={plzValue}
              onMaskedChange={(value) => onChange(keys.postleitzahl, value)}
              placeholder="10115"
              className={inputClass}
              inputMode="numeric"
              aria-invalid={plzInvalid || undefined}
              maskOptions={plzMaskOptions}
              {...getAutocompleteProps(keys.postleitzahl, "number")}
            />
          ) : (
            <Input
              id={keys.postleitzahl}
              value={plzValue}
              onChange={(e) => onChange(keys.postleitzahl, e.target.value)}
              placeholder="10115"
              className={inputClass}
              inputMode="numeric"
              {...getAutocompleteProps(keys.postleitzahl, "number")}
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={keys.ort} className="text-xs text-muted-foreground">
            Ort
          </Label>
          <Input
            id={keys.ort}
            value={values[keys.ort] ?? ""}
            onChange={(e) => onChange(keys.ort, e.target.value)}
            onKeyDown={onLastFieldKeyDown}
            placeholder="Berlin"
            className={inputClass}
            {...getAutocompleteProps(keys.ort, "text")}
          />
        </div>
      </div>
    </div>
  );
}
