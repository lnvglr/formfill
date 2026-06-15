"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractPdfText } from "@/lib/pdf";
import { buildQuestionList } from "@/lib/analyze-client";
import { fillFormLocally, fetchFieldMappings, attachPdfFieldsToQuestions } from "@/lib/client-fill";
import { base64ToUint8Array, extractPdfFormFieldNames } from "@/lib/pdf-fill-client";
import {
  contextsToFieldRects,
  extractPdfFieldContexts,
} from "@/lib/pdf-field-context";
import { resolveHighlightRects } from "@/lib/pdf-field-rects";
import { fileToBase64, base64ToBlobUrl, hashFileSha256 } from "@/lib/pdf-utils";
import { useVault } from "@/components/vault-provider";
import { Questionnaire } from "@/components/questionnaire";
import { FormPdfPreview } from "@/components/form-pdf-preview";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { missingLabelsToFields, formatProfileValue, inferFieldType } from "@/lib/field-types";
import { getAddressKeyPrefix } from "@/lib/field-autocomplete";
import { getStreetLineFromProfile, normalizeProfileKey } from "@/lib/field-keys";
import { buildQuestionnaireSteps } from "@/lib/questionnaire-steps";
import { getTodayForDateInput } from "@/lib/signature-defaults";
import {
  clearSessionFields,
  isSessionOnlyFieldKey,
  mergeSessionFields,
  omitSessionFields,
  pickSessionFields,
  readSessionFields,
} from "@/lib/session-fields";
import { readProfileSelections, clearProfileSelections } from "@/lib/profile-selections";
import { PROFILE_SIGNATURE_KEY } from "@/lib/signature";
import type {
  FillResponse,
  MissingField,
  PdfFieldRect,
  PdfStructureMapping,
  ProfileData,
  ProfileField,
  RepeatableGroup,
} from "@/lib/types";
import type { ProfileMultiStore } from "@/lib/profile-multi";
import type { BillingStatus } from "@/lib/db/billing";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/i18n/client";
import { Download, Eye, EyeOff, FileText, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type UploadPanelProps = {
  profile: ProfileData;
  profileFields: ProfileField[];
  billing: BillingStatus | null;
  isGuest?: boolean;
  onProfileUpdate: (
    data: ProfileData,
    multi?: ProfileMultiStore
  ) => Promise<void>;
  onFormFilled: () => Promise<void>;
  onBillingRefresh?: () => Promise<void>;
  onSignIn?: () => void;
};

type Step = "idle" | "loading" | "questions" | "result";

export function UploadPanel({
  profile,
  profileFields,
  billing,
  isGuest = false,
  onProfileUpdate,
  onFormFilled,
  onBillingRefresh,
  onSignIn,
}: UploadPanelProps) {
  const t = useT();
  const locale = useLocale();
  const { encryptPdfToStorage, profileMulti } = useVault();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [statusText, setStatusText] = useState("");
  const [isError, setIsError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfText, setPdfText] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [questions, setQuestions] = useState<MissingField[]>([]);
  const [repeatableGroups, setRepeatableGroups] = useState<RepeatableGroup[]>([]);
  const [result, setResult] = useState<FillResponse | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sessionFields, setSessionFields] = useState<Record<string, string>>({});
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<PdfStructureMapping | null>(
    null
  );
  const [fieldRects, setFieldRects] = useState<PdfFieldRect[]>([]);
  const [questionStep, setQuestionStep] = useState({
    index: 0,
    fieldKeys: [] as string[],
    pdfFields: [] as string[],
    isSignatureStep: false,
  });
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const pendingSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    setSessionFields(readSessionFields());
  }, []);

  const sessionProfile = useMemo(
    () => ({ ...profile, ...sessionFields }),
    [profile, sessionFields]
  );

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const reset = () => {
    setStep("idle");
    setStatusText("");
    setIsError(false);
    setPdfText("");
    setPdfBase64("");
    setFileName("");
    setFileHash("");
    setFormTitle("");
    setQuestions([]);
    setRepeatableGroups([]);
    setResult(null);
    setFieldMapping(null);
    setFieldRects([]);
    setQuestionStep({ index: 0, fieldKeys: [], pdfFields: [], isSignatureStep: false });
    setIsFollowUp(false);
    setShowMobilePreview(false);
    pendingSignatureRef.current = null;
    clearSessionFields();
    setSessionFields({});
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const flushSessionFieldsToVault = async (baseProfile: ProfileData) => {
    const pending = readSessionFields();
    clearSessionFields();
    setSessionFields({});

    if (Object.keys(pending).length === 0) return;

    await onProfileUpdate({ ...omitSessionFields(baseProfile), ...pending });
  };

  const handleAnswersChange = useCallback((answers: Record<string, string>) => {
    const updates = pickSessionFields(answers);
    if (Object.keys(updates).length === 0) return;

    const current = readSessionFields();
    const hasChanges = Object.entries(updates).some(
      ([key, value]) => current[key] !== value
    );
    if (!hasChanges) return;

    mergeSessionFields(updates);
    setSessionFields(readSessionFields());
  }, []);

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error(t("upload.toast.invalidFile"));
      return;
    }

    setFileName(file.name);
    clearSessionFields();
    clearProfileSelections();
    setSessionFields({});
    setStep("loading");
    setIsError(false);
    setStatusText(t("upload.status.reading"));
    setResult(null);
    setQuestions([]);
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);

    try {
      const [text, base64, fileHash] = await Promise.all([
        extractPdfText(file),
        fileToBase64(file),
        hashFileSha256(file),
      ]);
      setPdfText(text);
      setPdfBase64(base64);
      setFileHash(fileHash);
      setStatusText(t("upload.status.analyzing"));

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfText: text, fileHash }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error ?? t("upload.error.analysis"));
      }

      const analyzed = await analyzeRes.json();

      const pdfBytes = base64ToUint8Array(base64);
      const fieldContexts = await extractPdfFieldContexts(pdfBytes);
      const requiredFields = analyzed.required_fields ?? analyzed.missing_fields ?? [];
      const baseQuestions = buildQuestionList(
        requiredFields,
        sessionProfile,
        profileFields,
        profileMulti
      );

      const mapping = await fetchFieldMappings({
        pdfText: text,
        pdfFieldNames: fieldContexts.map((context) => context.pdf_field),
        fieldContexts,
        requiredFields: baseQuestions,
        fileName: file.name,
      });

      setFieldMapping(mapping);
      setFieldRects(contextsToFieldRects(fieldContexts));
      let nextQuestions = attachPdfFieldsToQuestions(
        baseQuestions,
        mapping.mappings,
        fieldContexts.map((context) => context.pdf_field)
      );
      let nextFormTitle = analyzed.form_title ?? file.name;
      let nextRepeatableGroups: RepeatableGroup[] =
        analyzed.repeatable_groups ?? [];

      if (locale !== "de") {
        setStatusText(t("upload.status.translating"));
        const translateRes = await fetch("/api/translate-form-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            form_title: nextFormTitle,
            questions: nextQuestions,
            repeatable_groups: nextRepeatableGroups,
          }),
        });

        if (!translateRes.ok) {
          const err = await translateRes.json();
          throw new Error(err.error ?? t("upload.error.translation"));
        }

        const translated = await translateRes.json();
        nextFormTitle = translated.form_title ?? nextFormTitle;
        nextQuestions = translated.questions ?? nextQuestions;
        nextRepeatableGroups =
          translated.repeatable_groups ?? nextRepeatableGroups;
      }

      setFormTitle(nextFormTitle);
      setQuestions(nextQuestions);
      setRepeatableGroups(nextRepeatableGroups);
      if (analyzed.matched_document) {
        toast.success(
          t("upload.toast.formRecognized", {
            title: analyzed.matched_document.title,
            jurisdiction: analyzed.matched_document.jurisdiction_code,
          })
        );
      }
      setStep("questions");
    } catch (error) {
      setIsError(true);
      setStatusText(
        error instanceof Error ? error.message : t("upload.error.unknown")
      );
      setStep("loading");
    }
  };

  const fillForm = async (
    currentProfile: ProfileData,
    signature: string | null,
    title?: string,
    allowFollowUp = true
  ) => {
    setStep("loading");
    setIsError(false);
    setStatusText(t("upload.status.filling"));

    try {
      const filled = await fillFormLocally({
        pdfBase64,
        pdfText,
        profile: currentProfile,
        profileMulti,
        profileSelections: readProfileSelections(),
        signature,
        fileName: title ?? fileName,
        cachedMapping: fieldMapping ?? undefined,
      });

      let sourcePdfEncrypted: string | undefined;
      let filledPdfEncrypted: string | undefined;

      if (!isGuest) {
        if (pdfBase64) {
          const sourceBytes = base64ToUint8Array(pdfBase64);
          sourcePdfEncrypted = await encryptPdfToStorage(sourceBytes);
        }

        if (filled.pdf_base64) {
          const filledBytes = base64ToUint8Array(filled.pdf_base64);
          filledPdfEncrypted = await encryptPdfToStorage(filledBytes);
        }
      }

      let displayResult: FillResponse = {
        ...filled,
        filled_fields: filled.filled_fields,
        pdf_base64: filled.pdf_base64,
        pdf_field_mappings: filled.pdf_field_mappings,
      };

      if (!isGuest) {
        const saveRes = await fetch("/api/fill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            result: {
              title: filled.title,
              missing: filled.missing,
              filled_fields: filled.filled_fields.map(({ label }) => ({
                label,
                value: "",
              })),
              has_form_fields: filled.has_form_fields,
            },
            fileName: title ?? fileName,
            sourcePdfEncrypted,
            filledPdfEncrypted,
            sourceFileHash: fileHash || undefined,
          }),
        });

        if (!saveRes.ok) {
          const err = await saveRes.json();
          throw new Error(err.error ?? t("upload.error.save"));
        }

        const saved: FillResponse = await saveRes.json();
        displayResult = {
          ...saved,
          filled_fields: filled.filled_fields,
          pdf_base64: filled.pdf_base64,
          pdf_field_mappings: filled.pdf_field_mappings,
        };
      }

      if (allowFollowUp && displayResult.missing.length > 0) {
        const existingKeys = new Set(Object.keys(currentProfile));
        const followUpQuestions = missingLabelsToFields(
          displayResult.missing,
          existingKeys
        );

        if (followUpQuestions.length > 0) {
          setResult(displayResult);
          if (displayResult.pdf_base64) {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(base64ToBlobUrl(displayResult.pdf_base64));
          }
          setQuestions(
            attachPdfFieldsToQuestions(
              buildQuestionList(
                followUpQuestions,
                currentProfile,
                profileFields,
                profileMulti
              ),
              fieldMapping?.mappings ?? [],
              fieldRects.map((rect) => rect.name)
            )
          );
          setIsFollowUp(true);
          setStep("questions");
          toast.info(
            t("upload.toast.missingFields", {
              count: followUpQuestions.length,
            })
          );
          return;
        }
      }

      setResult(displayResult);
      setIsFollowUp(false);

      if (displayResult.pdf_base64) {
        const url = base64ToBlobUrl(displayResult.pdf_base64);
        setPdfPreviewUrl(url);
      }

      await flushSessionFieldsToVault(currentProfile);
      setStep("result");
      await onFormFilled();
    } catch (error) {
      setIsError(true);
      setStatusText(
        error instanceof Error ? error.message : t("upload.error.fill")
      );
      setStep("loading");
    }
  };

  const submitAnswers = async (
    answers: Record<string, string>,
    signature: string | null
  ) => {
    const profileUpdates: ProfileData = { ...profile };
    const sessionUpdates: Record<string, string> = {};

    for (const [key, raw] of Object.entries(answers)) {
      const trimmed = raw?.trim();
      if (!trimmed) continue;
      const question = questions.find((q) => q.key === key);
      const fieldType = question?.type ?? inferFieldType(key, key);
      const value =
        fieldType === "elterngeld_schedule"
          ? trimmed
          : formatProfileValue(fieldType, trimmed);
      if (isSessionOnlyFieldKey(key)) {
        sessionUpdates[key] = value;
      } else {
        profileUpdates[key] = value;
      }
    }

    mergeSessionFields(sessionUpdates);
    const mergedSessionFields = readSessionFields();
    setSessionFields(mergedSessionFields);

    const effectiveSignature =
      signature ??
      pendingSignatureRef.current ??
      profile[PROFILE_SIGNATURE_KEY] ??
      null;

    if (!isFollowUp && effectiveSignature) {
      profileUpdates[PROFILE_SIGNATURE_KEY] = effectiveSignature;
      pendingSignatureRef.current = effectiveSignature;
    }

    await onProfileUpdate(profileUpdates);

    const fillProfile: ProfileData = {
      ...profileUpdates,
      ...mergedSessionFields,
    };

    await fillForm(fillProfile, effectiveSignature, formTitle, !isFollowUp);
  };

  const skipAnswers = async () => {
    const effectiveSignature =
      pendingSignatureRef.current ?? profile[PROFILE_SIGNATURE_KEY] ?? null;
    await fillForm(sessionProfile, effectiveSignature, formTitle, !isFollowUp);
  };

  const downloadPdf = async () => {
    if (!pdfPreviewUrl || !result) return;

    if (isGuest) {
      triggerDownload();
      toast.info(t("upload.toast.createAccount"));
      return;
    }

    if (billing?.can_download_unlimited) {
      triggerDownload();
      return;
    }

    if (!result.application_id) {
      toast.error(t("upload.toast.saveFailed"));
      return;
    }

    setDownloading(true);
    try {
      const res = await fetch("/api/billing/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: result.application_id }),
      });

      if (res.status === 402) {
        setUpgradeOpen(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t("upload.error.downloadUnavailable"));
      }

      triggerDownload();
      await onBillingRefresh?.();
      toast.success(t("upload.toast.downloadUnlocked"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("upload.error.downloadFailed")
      );
    } finally {
      setDownloading(false);
    }
  };

  const triggerDownload = () => {
    if (!pdfPreviewUrl) return;
    const link = document.createElement("a");
    link.href = pdfPreviewUrl;
    link.download = `${result?.title ?? fileName ?? "antrag"}-ausgefuellt.pdf`;
    link.click();
  };

  const copyResult = async () => {
    if (!result) return;
    const text = formatResultText(result, t);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const questionnaireSteps = useMemo(
    () => buildQuestionnaireSteps(questions, repeatableGroups),
    [questions, repeatableGroups]
  );

  const initialAnswers = useMemo(() => {
    const result = Object.fromEntries(
        questionnaireSteps.flatMap((step) => {
          if (step.layout === "address" && step.addressKey) {
            const prefix = getAddressKeyPrefix(step.addressKey);
            const entries: [string, string][] = [];
            const street = getStreetLineFromProfile(sessionProfile, prefix);
            if (street) entries.push([`${prefix}strasse`, street]);
            for (const part of ["postleitzahl", "ort"] as const) {
              const key = `${prefix}${part}`;
              if (sessionProfile[key]) entries.push([key, sessionProfile[key]]);
            }
            return entries;
          }
          return step.fields
            .filter((field) => sessionProfile[field.key])
            .map((field) => [field.key, sessionProfile[field.key]] as [string, string]);
        })
      );

    const needsSignatureDatum = questions.some(
      (field) => normalizeProfileKey(field.key) === "unterschrift_datum"
    );
    if (needsSignatureDatum && !result.unterschrift_datum?.trim()) {
      result.unterschrift_datum = getTodayForDateInput();
    }
    return result;
  }, [questionnaireSteps, sessionProfile, questions]);

  const handleQuestionStepChange = useCallback(
    (step: {
      index: number;
      fieldKeys: string[];
      pdfFields: string[];
      isSignatureStep: boolean;
    }) => {
      setQuestionStep(step);
    },
    []
  );

  const highlightRects = useMemo(() => {
    return resolveHighlightRects({
      pdfFields: questionStep.pdfFields,
      fieldRects,
      isSignatureStep: questionStep.isSignatureStep,
      signaturePlacement: fieldMapping?.signature_placement,
    });
  }, [fieldRects, questionStep, fieldMapping?.signature_placement]);

  const showQuestionnaire = step === "questions";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[13px] font-semibold tracking-wide">
          {t("upload.title")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("upload.subtitle")}
        </p>
      </div>

      {step === "idle" && (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center rounded-md border border-dashed bg-card px-4 py-8 text-center transition-colors sm:px-8 sm:py-12",
            isDragging && "border-primary bg-primary/10",
            "hover:border-primary hover:bg-primary/5"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
          <FileText className="mb-3 size-8 text-muted-foreground" />
          <p className="text-[15px] font-medium">{t("upload.dropzone.title")}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("upload.dropzone.hint")}
          </p>
        </label>
      )}

      {step === "loading" && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-md border bg-card px-4 py-2.5 text-xs text-muted-foreground",
            isError && "border-destructive text-destructive"
          )}
        >
          {!isError && <Loader2 className="size-3.5 animate-spin text-primary" />}
          <span>{statusText}</span>
          {isError && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={reset}
            >
              {t("upload.error.retry")}
            </Button>
          )}
        </div>
      )}

      {showQuestionnaire && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
          <Card>
            <CardContent className="p-4 sm:p-6 md:p-8">
              <Questionnaire
                questions={questions}
                repeatableGroups={repeatableGroups}
                formTitle={isFollowUp ? t("upload.followUp.title") : formTitle}
                profile={sessionProfile}
                profileMulti={profileMulti}
                initialAnswers={initialAnswers}
                locationFallback={sessionProfile.ort}
                savedSignature={sessionProfile[PROFILE_SIGNATURE_KEY]}
                showSignatureStep={!isFollowUp}
                onComplete={submitAnswers}
                onSkipAll={skipAnswers}
                onAnswersChange={handleAnswersChange}
                onStepChange={handleQuestionStepChange}
              />
            </CardContent>
          </Card>

          {pdfBase64 && (
            <div className="flex flex-col gap-4 xl:sticky xl:top-8">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs xl:hidden"
                onClick={() => setShowMobilePreview((open) => !open)}
              >
                {showMobilePreview ? (
                  <>
                    <EyeOff className="size-3.5" />
                    {t("upload.preview.hide")}
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" />
                    {t("upload.preview.show")}
                  </>
                )}
              </Button>

              <div
                className={cn(
                  "flex flex-col gap-4",
                  !showMobilePreview && "hidden xl:flex"
                )}
              >
              <Card>
                <CardContent className="p-4">
                  <FormPdfPreview
                    pdfBase64={pdfBase64}
                    highlightRects={highlightRects}
                    signaturePlacement={
                      questionStep.isSignatureStep
                        ? fieldMapping?.signature_placement
                        : null
                    }
                    title={t("upload.preview.emptyForm")}
                  />
                </CardContent>
              </Card>

              {isFollowUp && result?.pdf_base64 && pdfPreviewUrl && (
                <Card>
                  <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
                    <CardTitle className="text-xs">{t("upload.preview.filled")}</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-7 text-xs"
                      onClick={() => void downloadPdf()}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Download className="size-3" />
                      )}
                      {t("upload.preview.redownload")}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <iframe
                      src={pdfPreviewUrl}
                      title={t("upload.preview.filledPdf")}
                      className="h-[min(50vh,400px)] w-full rounded-md border bg-white"
                    />
                  </CardContent>
                </Card>
              )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "result" && result && (
        <Card>
          <CardHeader className="flex-col items-start gap-3 pb-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" />
              <CardTitle className="text-sm">{t("upload.result.title")}</CardTitle>
            </div>
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap">
              {pdfPreviewUrl && (
                <Button
                  size="sm"
                  onClick={() => void downloadPdf()}
                  disabled={downloading}
                  className="h-9 w-full text-xs sm:h-7 sm:w-auto"
                >
                  {downloading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Download className="size-3" />
                  )}
                  {t("upload.result.download")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full font-mono text-[10px] sm:h-7 sm:w-auto"
                onClick={copyResult}
              >
                {copied ? (
                  <>
                    <Check className="size-3" /> {t("upload.result.copied")}
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> {t("upload.result.copy")}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full text-xs sm:h-7 sm:w-auto"
                onClick={reset}
              >
                {t("upload.result.newApplication")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                title={t("upload.preview.pdf")}
                className="h-[min(70vh,600px)] w-full rounded-md border bg-white"
              />
            )}
            {!result.has_form_fields && (
              <p className="text-xs text-amber-500">
                {t("upload.result.noFormFields")}
              </p>
            )}
            {result.missing.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  {t("upload.result.missingPrefix")} {result.missing.join(", ")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-fit text-xs"
                  onClick={() => {
                    const followUpQuestions = missingLabelsToFields(
                      result.missing,
                      new Set(Object.keys(sessionProfile))
                    );
                    if (followUpQuestions.length === 0) return;
                    setQuestions(
                      attachPdfFieldsToQuestions(
                        followUpQuestions,
                        fieldMapping?.mappings ?? [],
                        fieldRects.map((rect) => rect.name)
                      )
                    );
                    setIsFollowUp(true);
                    setStep("questions");
                  }}
                >
                  {t("upload.result.addMissing")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        billing={billing}
        onBillingRefresh={onBillingRefresh}
      />
    </div>
  );
}

function formatResultText(
  data: FillResponse,
  t: (key: string) => string
): string {
  let output = `${data.title}\n${"─".repeat(50)}\n\n`;

  data.filled_fields.forEach((f) => {
    output += `${f.label}\n  → ${f.value}\n\n`;
  });

  if (data.missing.length > 0) {
    output += `\n${"─".repeat(50)}\n${t("upload.copyResult.missingHeader")}\n`;
    data.missing.forEach((m) => {
      output += `  • ${m}\n`;
    });
  }

  return output;
}
