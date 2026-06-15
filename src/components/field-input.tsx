"use client";

import { useMemo } from "react";
import { FieldCombobox } from "@/components/field-combobox";
import { MaskedInput } from "@/components/masked-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import { getAutocompleteProps } from "@/lib/field-autocomplete";
import {
  getLocalizedFieldHint,
  getLocalizedFieldPlaceholder,
} from "@/lib/field-i18n";
import {
  getFieldMaskConfig,
  isPartialMaskedValue,
  normalizeDateForDisplay,
} from "@/lib/field-masks";
import { getFieldOptions } from "@/lib/field-options";
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
  const t = useT();
  const placeholder = getLocalizedFieldPlaceholder(fieldKey, type, t);
  const hint = getLocalizedFieldHint(type, t);
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
          {t("fields.validation.incomplete")}
        </p>
      )}
      {hint && showHint && !isInvalid && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
