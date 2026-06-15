import type { PdfFieldMapping } from "@/lib/types";

export const ELTERNGELD_SCHEDULE_KEY = "elterngeld_bezugszeitraum";

export type BenefitSelection = "basis" | "plus";

export type ParsedPdfCell = {
  parent: 1 | 2;
  month?: number;
  benefit?: BenefitSelection | "standard12";
};

export function isElterngeldPdfFieldName(name: string): boolean {
  return parsePdfFieldName(name) !== null;
}

export type ParentSchedule = {
  /** Quick option: Basis-Elterngeld for months 1–12 */
  standardMonths1to12: boolean;
  /** Per-month selection; omitted months = none */
  months: Partial<Record<number, BenefitSelection>>;
};

export type ElterngeldSchedule = {
  parent1: ParentSchedule;
  parent2: ParentSchedule;
};

export const BASIS_MONTHS_MAX = 18;
export const PLUS_MONTHS_MAX = 32;
export const PREMATURE_MONTHS = [15, 16, 17, 18] as const;

const EMPTY_PARENT: ParentSchedule = {
  standardMonths1to12: false,
  months: {},
};

export const EMPTY_ELTERNGELD_SCHEDULE: ElterngeldSchedule = {
  parent1: { ...EMPTY_PARENT, months: {} },
  parent2: { ...EMPTY_PARENT, months: {} },
};

export function isElterngeldScheduleField(
  key: string,
  question = "",
  type?: string
): boolean {
  if (type === "elterngeld_schedule") return true;
  const haystack = `${key} ${question}`.toLowerCase();
  return (
    /elterngeld/.test(haystack) &&
    /bezugszeitraum|lebensmonat|monate.*beantrag/.test(haystack)
  );
}

export function parseElterngeldSchedule(value: string): ElterngeldSchedule {
  if (!value?.trim()) return structuredClone(EMPTY_ELTERNGELD_SCHEDULE);
  try {
    const parsed = JSON.parse(value) as ElterngeldSchedule;
    return normalizeSchedule(parsed);
  } catch {
    return structuredClone(EMPTY_ELTERNGELD_SCHEDULE);
  }
}

export function serializeElterngeldSchedule(
  schedule: ElterngeldSchedule
): string {
  return JSON.stringify(normalizeSchedule(schedule));
}

function normalizeParent(raw: ParentSchedule | undefined): ParentSchedule {
  const months: Partial<Record<number, BenefitSelection>> = {};
  for (const [monthKey, benefit] of Object.entries(raw?.months ?? {})) {
    const month = Number(monthKey);
    if (!Number.isFinite(month) || month < 1 || month > PLUS_MONTHS_MAX) continue;
    if (benefit !== "basis" && benefit !== "plus") continue;
    if (benefit === "basis" && month > BASIS_MONTHS_MAX) continue;
    months[month] = benefit;
  }

  return {
    standardMonths1to12: Boolean(raw?.standardMonths1to12),
    months,
  };
}

function normalizeSchedule(raw: ElterngeldSchedule): ElterngeldSchedule {
  return {
    parent1: normalizeParent(raw?.parent1),
    parent2: normalizeParent(raw?.parent2),
  };
}

export function getParentSchedule(
  schedule: ElterngeldSchedule,
  parent: 1 | 2
): ParentSchedule {
  return parent === 1 ? schedule.parent1 : schedule.parent2;
}

export function setParentMonth(
  schedule: ElterngeldSchedule,
  parent: 1 | 2,
  month: number,
  benefit: BenefitSelection | null
): ElterngeldSchedule {
  const key = parent === 1 ? "parent1" : "parent2";
  const current = schedule[key];
  const months = { ...current.months };

  if (!benefit) {
    delete months[month];
  } else {
    months[month] = benefit;
  }

  return {
    ...schedule,
    [key]: {
      ...current,
      standardMonths1to12: false,
      months,
    },
  };
}

export function setStandardMonths(
  schedule: ElterngeldSchedule,
  parent: 1 | 2,
  enabled: boolean
): ElterngeldSchedule {
  const key = parent === 1 ? "parent1" : "parent2";
  return {
    ...schedule,
    [key]: {
      standardMonths1to12: enabled,
      months: enabled ? {} : schedule[key].months,
    },
  };
}

export function isMonthActive(
  parentSchedule: ParentSchedule,
  month: number,
  benefit: BenefitSelection
): boolean {
  if (parentSchedule.standardMonths1to12) {
    return benefit === "basis" && month >= 1 && month <= 12;
  }
  return parentSchedule.months[month] === benefit;
}

/** Basis months count as 1; Plus months count as 0.5 (one Basis = two Plus). */
export function countBenefitMonths(parentSchedule: ParentSchedule): number {
  if (parentSchedule.standardMonths1to12) return 12;

  let total = 0;
  for (const benefit of Object.values(parentSchedule.months)) {
    total += benefit === "basis" ? 1 : 0.5;
  }
  return total;
}

export type ElterngeldScheduleError =
  | { code: "minMonths"; parent: 1 | 2 }
  | { code: "required" };

export function getElterngeldScheduleErrors(
  schedule: ElterngeldSchedule
): ElterngeldScheduleError[] {
  const errors: ElterngeldScheduleError[] = [];

  for (const parent of [1, 2] as const) {
    const parentSchedule = getParentSchedule(schedule, parent);
    const count = countBenefitMonths(parentSchedule);
    if (count > 0 && count < 2) {
      errors.push({ code: "minMonths", parent });
    }
  }

  if (
    !schedule.parent1.standardMonths1to12 &&
    !schedule.parent2.standardMonths1to12 &&
    countBenefitMonths(schedule.parent1) === 0 &&
    countBenefitMonths(schedule.parent2) === 0
  ) {
    errors.push({ code: "required" });
  }

  return errors;
}

export function validateElterngeldSchedule(
  schedule: ElterngeldSchedule
): string[] {
  return getElterngeldScheduleErrors(schedule).map((error) => {
    if (error.code === "minMonths") {
      return `Elternteil ${error.parent}: Mindestens zwei Monate (oder ein Monat Basis-Elterngeld) erforderlich.`;
    }
    return "Bitte mindestens einen Bezugszeitraum angeben.";
  });
}

export function isElterngeldScheduleAnswered(value: string): boolean {
  const schedule = parseElterngeldSchedule(value);
  return validateElterngeldSchedule(schedule).length === 0;
}

function parsePdfFieldName(name: string): ParsedPdfCell | null {
  const normalized = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

  let parent: 1 | 2 | null = null;
  if (
    /\b(elternteil[_\s-]?1|et[_\s-]?1|parent[_\s-]?1|teil1)\b/.test(normalized) ||
    /\b1\b.*\belternteil\b/.test(normalized)
  ) {
    parent = 1;
  } else if (
    /\b(elternteil[_\s-]?2|et[_\s-]?2|parent[_\s-]?2|teil2)\b/.test(normalized) ||
    /\b2\b.*\belternteil\b/.test(normalized)
  ) {
    parent = 2;
  }

  if (!parent) return null;

  if (
    /(1[\s._-]*12|12[\s._-]*monat|standard|basis.*12)/.test(normalized) &&
    /(basis|bm|elterngeld)/.test(normalized)
  ) {
    return { parent, benefit: "standard12" };
  }

  const monthMatch =
    normalized.match(/(?:monat|lebensmonat|lm|m)[\s._-]*(\d{1,2})\b/) ??
    normalized.match(/\b(\d{1,2})\b(?=.*(?:monat|lm))/);
  const month = monthMatch ? Number(monthMatch[1]) : undefined;

  let benefit: BenefitSelection | "standard12" | undefined;
  if (/(elterngeld[\s._-]*plus|plus|ep\b|egplus)/.test(normalized)) {
    benefit = "plus";
  } else if (/(basis[\s._-]*elterngeld|basis|bm\b)/.test(normalized)) {
    benefit = "basis";
  }

  if (!benefit && !month) return null;
  return { parent, month, benefit };
}

function shouldCheckCell(
  schedule: ElterngeldSchedule,
  cell: ParsedPdfCell
): boolean {
  const parentSchedule = getParentSchedule(schedule, cell.parent);

  if (cell.benefit === "standard12") {
    return parentSchedule.standardMonths1to12;
  }

  if (!cell.month || !cell.benefit) return false;
  return isMonthActive(parentSchedule, cell.month, cell.benefit);
}

/** Map schedule selections onto PDF checkbox field names. */
export function expandScheduleToPdfMappings(
  schedule: ElterngeldSchedule,
  pdfFieldNames: string[],
  label = "Elterngeld Bezugszeitraum"
): PdfFieldMapping[] {
  const mappings: PdfFieldMapping[] = [];

  for (const pdfField of pdfFieldNames) {
    const cell = parsePdfFieldName(pdfField);
    if (!cell) continue;
    if (!shouldCheckCell(schedule, cell)) continue;

    mappings.push({
      pdf_field: pdfField,
      value: "x",
      label,
    });
  }

  return mappings;
}

export function formatElterngeldScheduleSummary(value: string): string {
  const schedule = parseElterngeldSchedule(value);
  const parts: string[] = [];

  for (const parent of [1, 2] as const) {
    const parentSchedule = getParentSchedule(schedule, parent);
    if (parentSchedule.standardMonths1to12) {
      parts.push(`ET${parent}: Basis Monate 1–12`);
      continue;
    }

    const entries = Object.entries(parentSchedule.months)
      .map(([month, benefit]) => `M${month} ${benefit === "basis" ? "Basis" : "Plus"}`)
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

    if (entries.length > 0) {
      parts.push(`ET${parent}: ${entries.join(", ")}`);
    }
  }

  return parts.join(" · ") || "—";
}
