"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressFieldInput } from "@/components/address-field-input";
import { ElterngeldScheduleInput } from "@/components/elterngeld-schedule-input";
import { FieldInput } from "@/components/field-input";
import { Label } from "@/components/ui/label";
import { RepeatableFieldGroupInput } from "@/components/repeatable-field-group-input";
import {
  buildQuestionnaireSteps,
  formatFieldLabel,
  getStepAnswerKeys,
  getStepPdfFields,
  isStepAnswered,
  type QuestionnaireStep,
} from "@/lib/questionnaire-steps";
import { countRepeatInstancesFromAnswers } from "@/lib/repeatable-fields";
import type { MissingField, RepeatableGroup } from "@/lib/types";
import { QuestionInfoButton } from "@/components/question-info-button";
import { QuestionnaireStepIndicator } from "@/components/questionnaire-step-indicator";
import { SignaturePad } from "@/components/signature-pad";
import { normalizeProfileKey } from "@/lib/field-keys";
import { getAddressKeyPrefix } from "@/lib/field-autocomplete";
import { resolveSignatureLocation } from "@/lib/signature-defaults";
import {
  buildSelfFillForStep,
  hasSelfFillData,
  isSelfFillableQuestionnaireStep,
} from "@/lib/profile-self-fill";
import { SelfFillButton } from "@/components/self-fill-button";
import type { ProfileData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";

type QuestionnaireProps = {
  questions: MissingField[];
  repeatableGroups?: RepeatableGroup[];
  formTitle?: string;
  profile?: ProfileData;
  initialAnswers?: Record<string, string>;
  locationFallback?: string;
  savedSignature?: string;
  showSignatureStep?: boolean;
  onComplete: (answers: Record<string, string>, signature: string | null) => void;
  onSkipAll: () => void;
  onAnswersChange?: (answers: Record<string, string>) => void;
  onStepChange?: (step: {
    index: number;
    fieldKeys: string[];
    pdfFields: string[];
    isSignatureStep: boolean;
  }) => void;
};

export function Questionnaire({
  questions,
  repeatableGroups = [],
  formTitle,
  profile = {},
  initialAnswers = {},
  locationFallback,
  savedSignature,
  showSignatureStep = true,
  onComplete,
  onSkipAll,
  onAnswersChange,
  onStepChange,
}: QuestionnaireProps) {
  const steps = useMemo(
    () => buildQuestionnaireSteps(questions, repeatableGroups),
    [questions, repeatableGroups]
  );

  const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      repeatableGroups.map((group) => [
        group.id,
        countRepeatInstancesFromAnswers(group, initialAnswers),
      ])
    )
  );

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [signature, setSignature] = useState<string | null>(
    savedSignature ?? null
  );
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const skipAnswersChangeRef = useRef(false);
  const questionsRef = useRef(questions);
  const locationRequestedRef = useRef(false);

  const needsSignatureOrt = useMemo(
    () =>
      questions.some(
        (field) => normalizeProfileKey(field.key) === "unterschrift_ort"
      ),
    [questions]
  );

  const totalSteps = steps.length + (showSignatureStep ? 1 : 0);
  const isSignatureStep = showSignatureStep && index === steps.length;
  const current = steps[index];
  const isLast = index === totalSteps - 1;

  const requiredCount =
    steps.filter((s) => s.required !== false).length +
    (showSignatureStep ? 1 : 0);
  const optionalCount = steps.filter((s) => s.required === false).length;

  const answeredCount = useMemo(() => {
    let count = steps.filter((s) =>
      isStepAnswered(s, answers, repeatCounts)
    ).length;
    if (showSignatureStep && signature) count += 1;
    return count;
  }, [answers, steps, showSignatureStep, signature, repeatCounts]);

  useEffect(() => {
    const questionsChanged = questionsRef.current !== questions;
    questionsRef.current = questions;

    skipAnswersChangeRef.current = true;

    if (questionsChanged) {
      locationRequestedRef.current = false;
      setAnswers(initialAnswers);
      setSignature(savedSignature ?? null);
      setRepeatCounts(
        Object.fromEntries(
          repeatableGroups.map((group) => [
            group.id,
            countRepeatInstancesFromAnswers(group, initialAnswers),
          ])
        )
      );
      setIndex(0);
      return;
    }

    setAnswers((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [key, value] of Object.entries(initialAnswers)) {
        if (value !== undefined && prev[key] !== value) {
          next[key] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setSignature((prev) => prev ?? savedSignature ?? null);
  }, [questions, initialAnswers, savedSignature, repeatableGroups]);

  useEffect(() => {
    if (skipAnswersChangeRef.current) {
      skipAnswersChangeRef.current = false;
      return;
    }
    onAnswersChange?.(answers);
  }, [answers, onAnswersChange]);

  useEffect(() => {
    if (!needsSignatureOrt || locationRequestedRef.current) return;
    locationRequestedRef.current = true;

    void resolveSignatureLocation(locationFallback).then((ort) => {
      if (!ort) return;
      setAnswers((prev) => {
        if (prev.unterschrift_ort?.trim()) return prev;
        return { ...prev, unterschrift_ort: ort };
      });
    });
  }, [needsSignatureOrt, locationFallback]);

  const currentFieldKeys = useMemo(() => {
    if (isSignatureStep) return [];
    if (!current) return [];
    if (current.layout === "repeat" && current.repeatGroup) {
      return getStepAnswerKeys(current, repeatCounts);
    }
    if (current.layout === "address" && current.addressKey) {
      const prefix = getAddressKeyPrefix(current.addressKey);
      return [`${prefix}strasse`, `${prefix}postleitzahl`, `${prefix}ort`];
    }
    return current.fields.map((field) => field.key);
  }, [current, isSignatureStep, repeatCounts]);

  const currentPdfFields = useMemo(() => {
    if (isSignatureStep || !current) return [];
    return getStepPdfFields(current);
  }, [current, isSignatureStep]);

  useEffect(() => {
    onStepChange?.({
      index,
      fieldKeys: currentFieldKeys,
      pdfFields: currentPdfFields,
      isSignatureStep,
    });
  }, [index, currentFieldKeys, currentPdfFields, isSignatureStep, onStepChange]);

  const goNext = () => {
    if (isLast) {
      onComplete(answers, signature);
      return;
    }
    setDirection("forward");
    setIndex((i) => i + 1);
  };

  const goBack = () => {
    if (index === 0) return;
    setDirection("back");
    setIndex((i) => i - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!current) return;

    const hasTextarea = current.fields.some((f) => f.type === "textarea");
    if (e.key === "Enter" && e.shiftKey && hasTextarea) {
      e.preventDefault();
      goNext();
      return;
    }
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !hasTextarea &&
      current.layout !== "address" &&
      current.layout !== "elterngeld_schedule" &&
      !isSignatureStep
    ) {
      e.preventDefault();
      goNext();
    }
  };

  const isCurrentRequired = isSignatureStep
    ? true
    : current?.required !== false;

  const stepHint = (() => {
    if (isSignatureStep) return null;
    if (!current) return null;
    const suffix = isCurrentRequired
      ? "Pflichtfeld für diesen Antrag"
      : "Optional — leer lassen zum Überspringen";
    const hasTextarea = current.fields.some((f) => f.type === "textarea");
    if (hasTextarea) {
      return `Umschalt+Enter zum Weiter · ${suffix}`;
    }
    if (current.layout === "address") {
      return `Enter im Ort-Feld zum Weiter · ${suffix}`;
    }
    return `Enter zum Weiter · ${suffix}`;
  })();

  const renderFields = (step: QuestionnaireStep) => {
    if (step.layout === "repeat" && step.repeatGroup) {
      const group = step.repeatGroup;
      return (
        <RepeatableFieldGroupInput
          group={group}
          instanceCount={repeatCounts[group.id] ?? 0}
          values={answers}
          profile={profile}
          onChange={(key, value) =>
            setAnswers((prev) => ({ ...prev, [key]: value }))
          }
          onInstanceCountChange={(count) =>
            setRepeatCounts((prev) => ({ ...prev, [group.id]: count }))
          }
          onLastFieldKeyDown={handleKeyDown}
        />
      );
    }

    if (step.layout === "elterngeld_schedule") {
      const field = step.fields[0];
      if (!field) return null;
      return (
        <ElterngeldScheduleInput
          value={answers[field.key] ?? ""}
          onChange={(value) =>
            setAnswers((prev) => ({ ...prev, [field.key]: value }))
          }
        />
      );
    }

    if (step.layout === "address" && step.addressKey) {
      return (
        <AddressFieldInput
          fieldKey={step.addressKey}
          values={answers}
          onChange={(key, value) =>
            setAnswers((prev) => ({ ...prev, [key]: value }))
          }
          onLastFieldKeyDown={handleKeyDown}
        />
      );
    }

    if (step.layout === "fields") {
      return (
        <div className="flex flex-col gap-5">
          {step.fields.map((field, fieldIndex) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {formatFieldLabel(field)}
              </Label>
              <FieldInput
                fieldKey={field.key}
                type={field.type}
                options={field.options}
                value={answers[field.key] ?? ""}
                onChange={(value) =>
                  setAnswers((prev) => ({ ...prev, [field.key]: value }))
                }
                onKeyDown={
                  fieldIndex === step.fields.length - 1
                    ? handleKeyDown
                    : undefined
                }
                showHint={false}
                autoFocus={fieldIndex === 0}
              />
            </div>
          ))}
        </div>
      );
    }

    const field = step.fields[0];
    if (!field) return null;

    return (
      <FieldInput
        fieldKey={field.key}
        type={field.type}
        options={field.options}
        value={answers[field.key] ?? ""}
        onChange={(value) =>
          setAnswers((prev) => ({ ...prev, [field.key]: value }))
        }
        onKeyDown={handleKeyDown}
      />
    );
  };

  const applySelfFill = () => {
    if (!current || isSignatureStep) return;
    const fills = buildSelfFillForStep(current, profile);
    if (Object.keys(fills).length === 0) return;
    setAnswers((prev) => ({ ...prev, ...fills }));
  };

  const showSelfFill =
    !isSignatureStep &&
    current &&
    isSelfFillableQuestionnaireStep(current) &&
    current.layout !== "repeat";

  const selfFillFieldKeys = current
    ? getStepAnswerKeys(current, repeatCounts)
    : [];
  const canSelfFill =
    showSelfFill && hasSelfFillData(profile, selfFillFieldKeys);

  return (
    <div className="mb-4 flex min-h-[280px] flex-col sm:mb-6 sm:min-h-[360px] lg:mb-8 lg:min-h-[420px]">
      <div className="mb-4 sm:mb-8">
        <QuestionnaireStepIndicator
          totalSteps={totalSteps}
          currentIndex={index}
          requiredCount={requiredCount}
          optionalCount={optionalCount}
          answeredCount={answeredCount}
          formTitle={formTitle}
        />
      </div>

      <div
        key={isSignatureStep ? "signature" : current?.id}
        className={cn(
          "flex flex-1 flex-col justify-center gap-6 animate-in duration-300",
          direction === "forward"
            ? "fade-in slide-in-from-right-4"
            : "fade-in slide-in-from-left-4"
        )}
      >
        {isSignatureStep ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-sm border-primary/40 bg-primary/5 text-[10px] text-primary"
              >
                Pflichtfeld
              </Badge>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h3 className="text-xl leading-snug font-medium tracking-tight md:text-2xl">
                  Unterschrift hinzufügen
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Zeichne deine Unterschrift oder lade ein Bild hoch — sie wird
                  ins PDF eingefügt.
                </p>
              </div>
              <QuestionInfoButton
                title="Unterschrift"
                info="Deine Unterschrift wird direkt in das PDF eingefügt und in deinem Profil gespeichert. Du kannst sie zeichnen oder als Bild hochladen. Beim nächsten Antrag kannst du sie wiederverwenden."
              />
            </div>
            <SignaturePad
              value={signature ?? undefined}
              onChange={(v) => {
                setSignature(v);
              }}
            />
          </>
        ) : current ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {isCurrentRequired ? (
                <Badge
                  variant="outline"
                  className="rounded-sm border-primary/40 bg-primary/5 text-[10px] text-primary"
                >
                  Pflichtfeld
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-sm text-[10px] text-muted-foreground"
                >
                  Optional
                </Badge>
              )}
              {current.reason === "stale" && (
                <Badge
                  variant="outline"
                  className="rounded-sm border-amber-500/50 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-500"
                >
                  Veraltet?
                </Badge>
              )}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h3 className="text-xl leading-snug font-medium tracking-tight md:text-2xl">
                  {current.question}
                </h3>
                {current.subquestion && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {current.subquestion}
                  </p>
                )}
              </div>
              {current.info && (
                <QuestionInfoButton
                  title={current.question}
                  info={current.info}
                />
              )}
            </div>

            {showSelfFill && (
              <SelfFillButton disabled={!canSelfFill} onClick={applySelfFill} />
            )}

            {renderFields(current)}

            {stepHint && (
              <p className="text-[11px] text-muted-foreground">{stepHint}</p>
            )}
          </>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={index === 0}
          className="w-full text-muted-foreground sm:w-auto"
        >
          <ArrowLeft className="size-4" />
          Zurück
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!isSignatureStep && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSkipAll}
              className="w-full sm:w-auto"
            >
              Alle überspringen
            </Button>
          )}
          <Button size="sm" onClick={goNext} className="w-full sm:w-auto">
            {isLast ? (
              showSignatureStep ? (
                <>
                  <span className="sm:hidden">PDF erstellen</span>
                  <span className="hidden sm:inline">
                    PDF erstellen & herunterladen
                  </span>
                </>
              ) : (
                "PDF aktualisieren"
              )
            ) : (
              "Weiter"
            )}
            {!isLast && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
