"use client";

import { useState } from "react";
import { MultiValueAddressList } from "@/components/multi-value-address-list";
import { MultiValueContactList } from "@/components/multi-value-contact-list";
import { FieldInput } from "@/components/field-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatProfileValue, inferFieldType } from "@/lib/field-types";
import { pickStarterValues } from "@/lib/starter-profile-fields";
import {
  hydrateMultiFromProfile,
  syncProfileFromMulti,
  type ProfileMultiStore,
} from "@/lib/profile-multi";
import type { ProfileData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type StarterProfileFormProps = {
  profile: ProfileData;
  profileMulti: ProfileMultiStore;
  onSave: (data: ProfileData, multi: ProfileMultiStore) => Promise<void>;
  onCancel: () => void;
  className?: string;
};

export function StarterProfileForm({
  profile,
  profileMulti,
  onSave,
  onCancel,
  className,
}: StarterProfileFormProps) {
  const t = useT();
  const [values, setValues] = useState(() => pickStarterValues(profile));
  const [multi, setMulti] = useState(() =>
    hydrateMultiFromProfile(profile, profileMulti)
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = { ...profile };

      for (const key of ["name", "geburtsdatum", "geburtsort"] as const) {
        const raw = values[key]?.trim() ?? "";
        if (!raw) {
          delete next[key];
          continue;
        }
        next[key] = formatProfileValue(inferFieldType(key, key), raw);
      }

      const cleanedMulti: ProfileMultiStore = {
        emails: multi.emails.filter((entry) => entry.value.trim()),
        phones: multi.phones.filter((entry) => entry.value.trim()),
        addresses: multi.addresses.filter(
          (entry) =>
            entry.strasse.trim() ||
            entry.postleitzahl.trim() ||
            entry.ort.trim()
        ),
        defaults: multi.defaults,
      };

      const syncedProfile = syncProfileFromMulti(next, cleanedMulti);
      await onSave(syncedProfile, cleanedMulti);
      toast.success(t("profile.toast.saved"));
      onCancel();
    } catch {
      toast.error(t("profile.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cn("rounded-md border bg-card/30 p-4", className)}>
      <p className="text-sm font-medium">{t("starterForm.title")}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("starterForm.subtitle")}
      </p>

      <div className="mt-5 flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("starterForm.label.name")}
            </Label>
            <FieldInput
              fieldKey="name"
              type="name"
              value={values.name ?? ""}
              onChange={(value) =>
                setValues((prev) => ({ ...prev, name: value }))
              }
              showHint={false}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("starterForm.label.birthDate")}
            </Label>
            <FieldInput
              fieldKey="geburtsdatum"
              type="date"
              value={values.geburtsdatum ?? ""}
              onChange={(value) =>
                setValues((prev) => ({ ...prev, geburtsdatum: value }))
              }
              showHint={false}
              autoFocus={false}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">
              {t("starterForm.label.birthPlace")}
            </Label>
            <FieldInput
              fieldKey="geburtsort"
              type="text"
              value={values.geburtsort ?? ""}
              onChange={(value) =>
                setValues((prev) => ({ ...prev, geburtsort: value }))
              }
              showHint={false}
              autoFocus={false}
            />
          </div>
        </div>

        <MultiValueContactList
          label={t("starterForm.label.email")}
          fieldKey="email"
          fieldType="email"
          entries={multi.emails}
          defaultId={multi.defaults?.emailId}
          onChange={(emails, emailId) =>
            setMulti((prev) => ({
              ...prev,
              emails,
              defaults: { ...prev.defaults, emailId },
            }))
          }
        />

        <MultiValueContactList
          label={t("starterForm.label.phone")}
          fieldKey="telefon"
          fieldType="phone"
          entries={multi.phones}
          defaultId={multi.defaults?.phoneId}
          onChange={(phones, phoneId) =>
            setMulti((prev) => ({
              ...prev,
              phones,
              defaults: { ...prev.defaults, phoneId },
            }))
          }
        />

        <MultiValueAddressList
          entries={multi.addresses}
          defaultId={multi.defaults?.addressId}
          onChange={(addresses, addressId) =>
            setMulti((prev) => ({
              ...prev,
              addresses,
              defaults: { ...prev.defaults, addressId },
            }))
          }
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="size-3.5" />
            {t("common.cancel")}
          </Button>
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
            {t("common.save")}
          </Button>
        </div>
      </div>
    </section>
  );
}
