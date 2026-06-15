import type { Translator } from "@/i18n/translate";
import { normalizeProfileKey } from "@/lib/field-keys";
import type { QuestionnaireStep } from "@/lib/questionnaire-steps";

const KNOWN_QUESTIONS: Record<string, string> = {
  "Wie heißt du?": "questionnaire.steps.name",
  "Wann bist du in die neue Wohnung eingezogen?":
    "questionnaire.steps.einzugsdatum",
};

const KNOWN_SUBQUESTIONS: Record<string, string> = {
  "Geburtsdatum und Geburtsort wie im Ausweis.":
    "questionnaire.steps.birth.subquestion",
  "Telefon und E-Mail für Rückfragen zu diesem Antrag.":
    "questionnaire.steps.contact.subquestion",
  "Wo und wann unterschreibst du das Formular?":
    "questionnaire.steps.signature_meta.subquestion",
  "Straße mit Hausnummer, Postleitzahl und Ort — wie im Formular.":
    "questionnaire.steps.address.own.subquestion",
  "Straße und Hausnummer, Postleitzahl und Ort.":
    "questionnaire.steps.address.landlord.subquestion",
  "Wähle für jeden Elternteil die Monate mit Basis-Elterngeld oder Elterngeld Plus — oder die Standardoption für Monate 1–12.":
    "questionnaire.steps.elterngeld_schedule",
};

function translateKnown(t: Translator, key: string, fallback: string): string {
  const translated = t(key);
  return translated !== key ? translated : fallback;
}

function addressStepKeys(prefix: string) {
  if (prefix.startsWith("wohnungsgeber")) {
    return {
      question: "questionnaire.steps.address.landlord.question",
      subquestion: "questionnaire.steps.address.landlord.subquestion",
    };
  }
  if (prefix.startsWith("beauftragter")) {
    return {
      question: "questionnaire.steps.address.representative.question",
      subquestion: "questionnaire.steps.address.representative.subquestion",
    };
  }
  return {
    question: "questionnaire.steps.address.own.question",
    subquestion: "questionnaire.steps.address.own.subquestion",
  };
}

export function localizeQuestionnaireStep(
  step: QuestionnaireStep,
  t: Translator
): Pick<QuestionnaireStep, "question" | "subquestion"> {
  if (step.id === "birth") {
    return {
      question: t("questionnaire.steps.birth.question"),
      subquestion: t("questionnaire.steps.birth.subquestion"),
    };
  }
  if (step.id === "contact") {
    return {
      question: t("questionnaire.steps.contact.question"),
      subquestion: t("questionnaire.steps.contact.subquestion"),
    };
  }
  if (step.id === "signature_meta") {
    return {
      question: t("questionnaire.steps.signature_meta.question"),
      subquestion: t("questionnaire.steps.signature_meta.subquestion"),
    };
  }
  if (step.id.startsWith("address:")) {
    const prefix = step.id.replace(/^address:/, "");
    const keys = addressStepKeys(prefix);
    return {
      question: translateKnown(t, keys.question, step.question),
      subquestion: step.subquestion
        ? translateKnown(t, keys.subquestion, step.subquestion)
        : undefined,
    };
  }

  const field = step.fields[0];
  const canonical = field ? normalizeProfileKey(field.key) : "";
  let question = step.question;
  if (KNOWN_QUESTIONS[step.question]) {
    question = t(KNOWN_QUESTIONS[step.question]);
  } else if (canonical === "name" && step.layout === "single") {
    question = t("questionnaire.steps.name");
  } else if (canonical === "einzugsdatum" && step.layout === "single") {
    question = t("questionnaire.steps.einzugsdatum");
  }

  let subquestion = step.subquestion;
  if (subquestion && KNOWN_SUBQUESTIONS[subquestion]) {
    subquestion = t(KNOWN_SUBQUESTIONS[subquestion]);
  }

  return { question, subquestion };
}
