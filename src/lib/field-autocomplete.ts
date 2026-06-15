import { normalizeProfileKey } from "@/lib/field-keys";
import type { FieldType } from "@/lib/types";

export type AutocompleteProps = {
  autoComplete?: string;
  name?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
};

const ADDRESS_PARTS = ["strasse", "postleitzahl", "ort"] as const;

export function getAddressPartKeys(prefix: string): Record<
  (typeof ADDRESS_PARTS)[number],
  string
> {
  return {
    strasse: `${prefix}strasse`,
    postleitzahl: `${prefix}postleitzahl`,
    ort: `${prefix}ort`,
  };
}

export function getAddressKeyPrefix(fieldKey: string): string {
  const canonical = normalizeProfileKey(fieldKey);
  const k = fieldKey.toLowerCase();

  if (ADDRESS_PARTS.includes(canonical as (typeof ADDRESS_PARTS)[number])) {
    return "";
  }

  if (/wohnungsgeber/.test(k)) return "wohnungsgeber_";
  if (/beauftragt|eigene_person/.test(k)) return "beauftragter_";

  if (k.endsWith("_adresse") || k.endsWith("_anschrift")) {
    const base = fieldKey.replace(/_adresse$|_anschrift$/i, "");
    return base ? `${base}_` : "";
  }

  return "";
}

export function getAutocompleteProps(
  fieldKey: string,
  type: FieldType
): AutocompleteProps {
  const canonical = normalizeProfileKey(fieldKey);
  const prefix = getAddressKeyPrefix(fieldKey);
  const section = prefix ? prefix.replace(/_$/, "") : "home";

  switch (canonical) {
    case "name":
      return { autoComplete: "name", name: `${section}-name` };
    case "strasse":
      return {
        autoComplete: "street-address",
        name: `${section}-street-address`,
      };
    case "postleitzahl":
      return {
        autoComplete: "postal-code",
        name: `${section}-postal-code`,
        inputMode: "numeric",
      };
    case "ort":
      return {
        autoComplete: "address-level2",
        name: `${section}-city`,
      };
    case "email":
      return { autoComplete: "email", name: `${section}-email` };
    case "telefon":
      return { autoComplete: "tel", name: `${section}-tel`, inputMode: "tel" };
    case "geburtsdatum":
      return { autoComplete: "bday", name: "bday" };
    default:
      if (type === "email") return { autoComplete: "email" };
      if (type === "phone") return { autoComplete: "tel", inputMode: "tel" };
      if (type === "date") return { autoComplete: "bday" };
      if (type === "name") return { autoComplete: "name" };
      return {};
  }
}
