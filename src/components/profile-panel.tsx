"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/signature-pad";
import { StarterProfileForm } from "@/components/starter-profile-form";
import { getFieldDisplayLabel } from "@/lib/field-keys";
import { getFreshnessLabel } from "@/lib/profile-freshness";
import {
  groupProfileFields,
  type ProfileGroupId,
} from "@/lib/profile-groups";
import {
  isSignatureFieldKey,
  isSignatureValue,
  PROFILE_SIGNATURE_KEY,
} from "@/lib/signature";
import type { ProfileData, ProfileField } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type ProfilePanelProps = {
  profile: ProfileData;
  fields: ProfileField[];
  onUpdateField: (key: string, value: string) => Promise<void>;
  onDeleteField: (key: string) => Promise<void>;
  onSaveProfile: (data: ProfileData) => Promise<void>;
};

const freshnessDot = {
  fresh: "bg-emerald-500",
  aging: "bg-amber-500",
  stale: "bg-orange-400",
};

function SignatureEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <SignaturePad
        value={value || undefined}
        onChange={(dataUrl) => onChange(dataUrl ?? "")}
        showProfileHint={false}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || !value.startsWith("data:image/")}
        >
          <Check className="size-3.5" />
          Speichern
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="size-3.5" />
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

export function ProfilePanel({
  profile,
  fields,
  onUpdateField,
  onDeleteField,
  onSaveProfile,
}: ProfilePanelProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<ProfileGroupId>>(
    new Set()
  );

  const signatureField = fields.find((field) =>
    isSignatureFieldKey(field.key)
  );
  const isEditingSignature =
    editingKey === PROFILE_SIGNATURE_KEY ||
    (editingKey !== null && isSignatureFieldKey(editingKey));

  const staleCount = fields.filter((f) => f.freshness === "stale").length;
  const agingCount = fields.filter((f) => f.freshness === "aging").length;
  const groups = useMemo(() => groupProfileFields(fields), [fields]);

  const toggleGroup = (id: ProfileGroupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (field: ProfileField) => {
    setEditingKey(field.key);
    setEditValue(field.value);
  };

  const startAddSignature = () => {
    setEditingKey(PROFILE_SIGNATURE_KEY);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = async (key: string) => {
    const isSignature = isSignatureFieldKey(key);
    if (isSignature) {
      if (!editValue.startsWith("data:image/")) return;
    } else if (!editValue.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onUpdateField(key, isSignature ? editValue : editValue.trim());
      setEditingKey(null);
      setEditValue("");
      toast.success("Gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await onDeleteField(key);
      toast.success("Feld gelöscht");
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-card/40 px-4 py-2.5 text-xs">
        <div>
          <span className="text-muted-foreground">Felder </span>
          <span className="font-mono font-medium">{fields.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Gruppen </span>
          <span className="font-mono font-medium">{groups.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Zu prüfen </span>
          <span
            className={cn(
              "font-mono font-medium",
              staleCount + agingCount > 0
                ? "text-amber-600 dark:text-amber-500"
                : "text-foreground"
            )}
          >
            {staleCount + agingCount}
          </span>
        </div>
      </div>

      {fields.length === 0 && !isEditingSignature ? (
        <div className="flex flex-col gap-4">
          <StarterProfileForm profile={profile} onSave={onSaveProfile} />
          <p className="text-center text-xs text-muted-foreground">
            Oder lade einen Antrag hoch — weitere Felder werden automatisch
            ergänzt.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.id);
            const needsAttention = group.fields.some(
              (f) => f.freshness !== "fresh"
            );

            return (
              <section
                key={group.id}
                className="overflow-hidden rounded-md border bg-card/30"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/40"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                  <span className="text-xs font-medium">{group.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {group.fields.length}
                  </span>
                  {needsAttention && (
                    <Badge
                      variant="outline"
                      className="ml-1 h-4 rounded-sm px-1 text-[9px] border-amber-500/40 text-amber-500"
                    >
                      prüfen
                    </Badge>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="border-t">
                    {group.fields.map((field, index) => {
                      const isEditing = editingKey === field.key;
                      const isSignature = isSignatureFieldKey(field.key);
                      const label = getFieldDisplayLabel(field.key);

                      if (isEditing && isSignature) {
                        return (
                          <div
                            key={field.key}
                            className={cn(
                              "px-3 py-3",
                              index > 0 && "border-t border-border/50"
                            )}
                          >
                            <p className="mb-3 text-[11px] text-muted-foreground">
                              {label}
                            </p>
                            <SignatureEditor
                              value={editValue}
                              onChange={setEditValue}
                              onSave={() => saveEdit(field.key)}
                              onCancel={cancelEdit}
                              saving={saving}
                            />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={field.key}
                          className={cn(
                            "group grid grid-cols-1 gap-2 px-3 py-2 sm:grid-cols-[minmax(7rem,26%)_1fr_auto] sm:items-center sm:gap-3",
                            index > 0 && "border-t border-border/50"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                freshnessDot[field.freshness]
                              )}
                              title={getFreshnessLabel(field.freshness)}
                            />
                            <span className="truncate text-[11px] text-muted-foreground">
                              {label}
                            </span>
                          </div>

                          <div className="min-w-0 sm:col-start-2">
                            {isEditing ? (
                              <div className="flex gap-1.5">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-8 bg-secondary/50 text-xs"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(field.key);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-8 shrink-0"
                                  onClick={() => saveEdit(field.key)}
                                  disabled={saving}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 shrink-0"
                                  onClick={cancelEdit}
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            ) : isSignatureValue(field.key, field.value) ? (
                              <div className="inline-block rounded border bg-white px-2 py-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={field.value}
                                  alt="Gespeicherte Unterschrift"
                                  className="h-10 max-w-[180px] object-contain"
                                />
                              </div>
                            ) : (
                              <p className="text-xs leading-snug break-words text-foreground">
                                {field.value}
                              </p>
                            )}

                            {!isEditing && (
                              <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/80">
                                Aktualisiert{" "}
                                {new Date(field.updated_at).toLocaleDateString(
                                  "de-DE"
                                )}
                              </p>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="flex shrink-0 gap-0.5 sm:justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => startEdit(field)}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(field.key)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {!signatureField && !isEditingSignature && (
        <section className="rounded-md border border-dashed bg-card/30 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Unterschrift</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Zeichne oder lade ein Bild hoch — wird bei Anträgen
                wiederverwendet.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={startAddSignature}
            >
              <Plus className="size-3.5" />
              Unterschrift hinzufügen
            </Button>
          </div>
        </section>
      )}

      {!signatureField && isEditingSignature && (
        <section className="rounded-md border bg-card/30 px-4 py-4">
          <p className="mb-3 text-sm font-medium">Unterschrift hinzufügen</p>
          <SignatureEditor
            value={editValue}
            onChange={setEditValue}
            onSave={() => saveEdit(PROFILE_SIGNATURE_KEY)}
            onCancel={cancelEdit}
            saving={saving}
          />
        </section>
      )}
    </div>
  );
}
