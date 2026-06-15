"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type FieldComboboxProps = {
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  name?: string;
  autoComplete?: string;
};

export function FieldCombobox({
  value,
  options,
  placeholder,
  onChange,
  onKeyDown,
  autoFocus = true,
  name,
  autoComplete,
}: FieldComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [value, open]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((prev) =>
        Math.min(prev + 1, Math.max(filteredOptions.length - 1, 0))
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter" && open && highlightIndex >= 0) {
      const option = filteredOptions[highlightIndex];
      if (option) {
        event.preventDefault();
        selectOption(option);
        return;
      }
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    onKeyDown?.(event);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="h-12 bg-secondary/50 pr-9 text-base"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          name={name}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Vorschläge anzeigen"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
          onClick={() => setOpen((prev) => !prev)}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {open && filteredOptions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={value === option}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                index === highlightIndex && "bg-accent text-accent-foreground",
                value === option && index !== highlightIndex && "font-medium"
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
