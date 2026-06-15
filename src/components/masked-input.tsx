"use client";

import { useEffect, useRef } from "react";
import { MaskInput, type MaskInputOptions } from "maska";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MaskedInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "onChange"
> & {
  maskOptions: MaskInputOptions;
  onMaskedChange: (masked: string) => void;
};

export function MaskedInput({
  maskOptions,
  onMaskedChange,
  value,
  className,
  ...props
}: MaskedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const maskRef = useRef<MaskInput | null>(null);
  const onMaskedChangeRef = useRef(onMaskedChange);

  useEffect(() => {
    onMaskedChangeRef.current = onMaskedChange;
  }, [onMaskedChange]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    maskRef.current = new MaskInput(input, {
      ...maskOptions,
      onMaska: (detail) => {
        onMaskedChangeRef.current(detail.masked);
      },
    });

    return () => {
      maskRef.current?.destroy();
      maskRef.current = null;
    };
  }, [
    maskOptions.eager,
    maskOptions.reversed,
    JSON.stringify(maskOptions.mask),
  ]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !maskRef.current) return;

    const next = String(value ?? "");
    if (input.value !== next) {
      input.value = next;
      maskRef.current.updateValue(input);
    }
  }, [value]);

  return (
    <Input
      ref={inputRef}
      type="text"
      defaultValue={value}
      className={cn(className)}
      {...props}
    />
  );
}
