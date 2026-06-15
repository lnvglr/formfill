import { defaultLocale, localeNames, type Locale } from "@/i18n/config";
import { generateText, parseJsonResponse } from "@/lib/ai/provider";
import type { MissingField, RepeatableGroup } from "@/lib/types";

export type FormContentToTranslate = {
  form_title?: string;
  questions: MissingField[];
  repeatable_groups: RepeatableGroup[];
};

type TranslatePayload = {
  form_title?: string;
  questions: Array<{
    key: string;
    question: string;
    subquestion?: string;
    info?: string;
  }>;
  repeatable_groups: Array<{
    id: string;
    question: string;
    subquestion?: string;
    info?: string;
    fields: Array<{ key: string; label: string }>;
  }>;
};

function buildPayload(content: FormContentToTranslate): TranslatePayload {
  return {
    form_title: content.form_title,
    questions: content.questions.map((field) => ({
      key: field.key,
      question: field.question,
      subquestion: field.subquestion,
      info: field.info,
    })),
    repeatable_groups: content.repeatable_groups.map((group) => ({
      id: group.id,
      question: group.question,
      subquestion: group.subquestion,
      info: group.info,
      fields: group.fields.map((field) => ({
        key: field.key,
        label: field.label,
      })),
    })),
  };
}

function mergeTranslatedContent(
  original: FormContentToTranslate,
  translated: TranslatePayload
): FormContentToTranslate {
  const questionByKey = new Map(
    translated.questions.map((field) => [field.key, field])
  );

  return {
    form_title: translated.form_title ?? original.form_title,
    questions: original.questions.map((field) => {
      const match = questionByKey.get(field.key);
      if (!match) return field;
      return {
        ...field,
        question: match.question ?? field.question,
        subquestion: match.subquestion ?? field.subquestion,
        info: match.info ?? field.info,
      };
    }),
    repeatable_groups: original.repeatable_groups.map((group) => {
      const match = translated.repeatable_groups.find(
        (candidate) => candidate.id === group.id
      );
      if (!match) return group;

      const labelByKey = new Map(
        match.fields.map((field) => [field.key, field.label])
      );

      return {
        ...group,
        question: match.question ?? group.question,
        subquestion: match.subquestion ?? group.subquestion,
        info: match.info ?? group.info,
        fields: group.fields.map((field) => ({
          ...field,
          label: labelByKey.get(field.key) ?? field.label,
        })),
      };
    }),
  };
}

export async function translateFormContent(
  locale: Locale,
  content: FormContentToTranslate
): Promise<FormContentToTranslate> {
  if (locale === defaultLocale) return content;

  const hasContent =
    Boolean(content.form_title?.trim()) ||
    content.questions.length > 0 ||
    content.repeatable_groups.length > 0;

  if (!hasContent) return content;

  const targetLanguage = localeNames[locale];
  const payload = buildPayload(content);

  const system = [
    `You translate user-facing strings from German administrative forms into ${targetLanguage}.`,
    "Respond ONLY with valid JSON matching the input structure exactly.",
    "Do not change key or id fields.",
    "Translate form_title, question, subquestion, info, and label fields only.",
    "Do not translate combobox option values — they are not included.",
    "Keep instructions clear for people filling in official German forms.",
  ].join(" ");

  const raw = await generateText(
    [
      {
        role: "user",
        content: `Translate this JSON from German to ${targetLanguage}:\n${JSON.stringify(payload)}`,
      },
    ],
    system
  );

  const translated = parseJsonResponse<TranslatePayload>(raw);
  return mergeTranslatedContent(content, translated);
}
