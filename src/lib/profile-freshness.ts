export type FreshnessTier = "stable" | "slow" | "medium" | "fast";

export type FreshnessStatus = "fresh" | "aging" | "stale";

const TIER_MAX_DAYS: Record<FreshnessTier, number> = {
  stable: 3650,
  slow: 730,
  medium: 365,
  fast: 365,
};

const TIER_LABELS: Record<FreshnessTier, string> = {
  stable: "Dauerhaft gültig",
  slow: "Alle ~2 Jahre prüfen",
  medium: "Jährlich prüfen",
  fast: "Jährlich prüfen",
};

const STATUS_LABELS: Record<FreshnessStatus, string> = {
  fresh: "Aktuell",
  aging: "Bald prüfen",
  stale: "Möglicherweise veraltet",
};

export function classifyFieldKey(key: string): FreshnessTier {
  const k = key.toLowerCase();

  if (
    /name|vorname|nachname|geburt|geschlecht|staatsangehor|nationalitat|religion|familienstand|geburtsort|unterschrift/.test(
      k
    )
  ) {
    return "stable";
  }

  if (
    /adresse|strasse|straße|plz|postleitzahl|stadt|wohnort|telefon|phone|email|e_mail|mobil|hausnummer/.test(
      k
    )
  ) {
    return "slow";
  }

  if (
    /gehalt|einkommen|salary|lohn|verdienst|kontostand|iban|bank|steuer|steuerklasse/.test(
      k
    )
  ) {
    return "fast";
  }

  if (/arbeitgeber|beruf|position|unternehmen|employer|job|firma/.test(k)) {
    return "medium";
  }

  return "medium";
}

export function getFreshnessStatus(
  key: string,
  updatedAt: string | Date
): FreshnessStatus {
  const tier = classifyFieldKey(key);

  if (tier === "stable") {
    return "fresh";
  }

  const updated =
    typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const ageDays = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
  const maxDays = TIER_MAX_DAYS[tier];
  const ratio = ageDays / maxDays;

  if (ratio >= 1) return "stale";
  if (ratio >= 0.75) return "aging";
  return "fresh";
}

export function getFreshnessLabel(status: FreshnessStatus): string {
  return STATUS_LABELS[status];
}

export function getTierHint(tier: FreshnessTier): string {
  return TIER_LABELS[tier];
}

export function isFieldStale(key: string, updatedAt: string): boolean {
  return getFreshnessStatus(key, updatedAt) === "stale";
}
