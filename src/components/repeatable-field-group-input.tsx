"use client";

import { FieldInput } from "@/components/field-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import {
  buildRepeatableFieldKey,
  getRepeatableFieldLabel,
} from "@/lib/repeatable-fields";
import {
  buildSelfFillForRepeatableInstance,
  hasSelfFillData,
} from "@/lib/profile-self-fill";
import type { ProfileData, RepeatableGroup } from "@/lib/types";
import { SelfFillButton } from "@/components/self-fill-button";
import { Plus, Trash2 } from "lucide-react";

type RepeatableFieldGroupInputProps = {
  group: RepeatableGroup;
  instanceCount: number;
  values: Record<string, string>;
  profile: ProfileData;
  onChange: (key: string, value: string) => void;
  onInstanceCountChange: (count: number) => void;
  onLastFieldKeyDown?: (e: React.KeyboardEvent) => void;
};

export function RepeatableFieldGroupInput({
  group,
  instanceCount,
  values,
  profile,
  onChange,
  onInstanceCountChange,
  onLastFieldKeyDown,
}: RepeatableFieldGroupInputProps) {
  const t = useT();
  const canAdd = instanceCount < group.maxInstances;
  const indices = Array.from({ length: instanceCount }, (_, i) => group.startIndex + i);

  const addInstance = () => {
    if (!canAdd) return;
    onInstanceCountChange(instanceCount + 1);
  };

  const removeInstance = (index: number) => {
    const lastIndex = group.startIndex + instanceCount - 1;
    if (index !== lastIndex) return;
    for (const field of group.fields) {
      onChange(buildRepeatableFieldKey(group.id, index, field.key), "");
    }
    onInstanceCountChange(instanceCount - 1);
  };

  return (
    <div className="flex flex-col gap-6">
      {indices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("questionnaire.repeatable.empty")}
        </p>
      ) : (
        indices.map((index, rowIndex) => (
          <div
            key={index}
            className="rounded-md border bg-secondary/20 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("questionnaire.repeatable.person", { index })}
              </p>
              <div className="flex items-center gap-1">
                <SelfFillButton
                  disabled={
                    !hasSelfFillData(
                      profile,
                      group.fields.map((field) => field.key)
                    )
                  }
                  onClick={() => {
                    const fills = buildSelfFillForRepeatableInstance(
                      group,
                      index,
                      profile
                    );
                    for (const [key, value] of Object.entries(fills)) {
                      onChange(key, value);
                    }
                  }}
                />
                {rowIndex === indices.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => removeInstance(index)}
                  >
                    <Trash2 className="size-3.5" />
                    {t("questionnaire.repeatable.remove")}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {group.fields.map((field, fieldIndex) => {
                const fieldKey = buildRepeatableFieldKey(
                  group.id,
                  index,
                  field.key
                );
                const isLastField =
                  rowIndex === indices.length - 1 &&
                  fieldIndex === group.fields.length - 1;

                return (
                  <div key={fieldKey} className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {getRepeatableFieldLabel(group, field.key)}
                    </Label>
                    <FieldInput
                      fieldKey={fieldKey}
                      type={field.type}
                      options={field.options}
                      value={values[fieldKey] ?? ""}
                      onChange={(value) => onChange(fieldKey, value)}
                      onKeyDown={isLastField ? onLastFieldKeyDown : undefined}
                      showHint={false}
                      autoFocus={rowIndex === 0 && fieldIndex === 0}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {canAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          onClick={addInstance}
        >
          <Plus className="size-3.5" />
          {t("questionnaire.repeatable.addPerson")}
        </Button>
      )}
    </div>
  );
}
