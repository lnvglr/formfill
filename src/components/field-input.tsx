"use client";

import { useMemo } from "react";
import { FieldCombobox } from "@/components/field-combobox";
import { MaskedInput } from "@/components/masked-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAutocompleteProps } from "@/lib/field-autocomplete";
import { normalizeProfileKey } from "@/lib/field-keys";
import {
  getFieldMaskConfig,
  isPartialMaskedValue,
  normalizeDateForDisplay,
} from "@/lib/field-masks";
import { getFieldOptions } from "@/lib/field-options";
import {
  getFieldHint,
  getFieldPlaceholder,
} from "@/lib/field-types";
import type { FieldType } from "@/lib/types";

type FieldInputProps = {
  fieldKey: string;
  type: FieldType;
  value: string;
  options?: string[];
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  showHint?: boolean;
  autoFocus?: boolean;
};

function placeholderFor(fieldKey: string, type: FieldType): string {
  const canonical = normalizeProfileKey(fieldKey);
  switch (canonical) {
    case "strasse":
      return "Musterstraße 12a";
    case "postleitzahl":
      return "10115";
    case "ort":
      return "Berlin";
    default:
      return getFieldPlaceholder(type);
  }
}

export function FieldInput({
  fieldKey,
  type,
  value,
  options,
  onChange,
  onKeyDown,
  showHint = true,
  autoFocus = true,
}: FieldInputProps) {
  const placeholder = placeholderFor(fieldKey, type);
  const hint = getFieldHint(type);
  const autocomplete = getAutocompleteProps(fieldKey, type);
  const maskConfig = getFieldMaskConfig(fieldKey, type);
  const maskOptions = maskConfig
    ? (({ validate: _validate, ...options }) => options)(maskConfig)
    : null;
  const displayValue = useMemo(() => {
    if (!maskConfig || type !== "date") return value;
    return normalizeDateForDisplay(value);
  }, [maskConfig, type, value]);
  const isInvalid =
    Boolean(displayValue.trim()) &&
    isPartialMaskedValue(fieldKey, type, displayValue);
  const comboboxOptions =
    options ?? (type === "combobox" ? getFieldOptions(fieldKey, "") : []);

  const input =
    type === "combobox" && comboboxOptions.length > 0 ? (
      <FieldCombobox
        autoFocus={autoFocus}
        value={value}
        options={comboboxOptions}
        placeholder={placeholder}
        onChange={onChange}
        onKeyDown={onKeyDown}
        name={autocomplete.name}
        autoComplete={autocomplete.autoComplete}
      />
    ) : type === "textarea" ? (
      <Textarea
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="min-h-[120px] resize-none bg-secondary/50 text-base"
        autoComplete={autocomplete.autoComplete}
        name={autocomplete.name}
      />
    ) : maskOptions ? (
      <MaskedInput
        autoFocus={autoFocus}
        inputMode={autocomplete.inputMode}
        value={displayValue}
        onMaskedChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="h-12 bg-secondary/50 text-base"
        autoComplete={autocomplete.autoComplete}
        name={autocomplete.name}
        aria-invalid={isInvalid || undefined}
        maskOptions={maskOptions}
      />
    ) : (
      <Input
        autoFocus={autoFocus}
        type={
          type === "email"
            ? "email"
            : type === "number"
              ? "number"
              : "text"
        }
        inputMode={autocomplete.inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="h-12 bg-secondary/50 text-base"
        autoComplete={autocomplete.autoComplete}
        name={autocomplete.name}
      />
    );

  return (
    <div className="flex flex-col gap-2">
      {input}
      {isInvalid && (
        <p className="text-[11px] text-destructive">
          Bitte die Angabe vollständig und korrekt ausfüllen.
        </p>
      )}
      {hint && showHint && !isInvalid && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
