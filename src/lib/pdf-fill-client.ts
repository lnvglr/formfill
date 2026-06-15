import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  rgb,
} from "pdf-lib";
import type { PdfFieldMapping, SignaturePlacement } from "@/lib/types";
import {
  fitDimensionsInBox,
  normalizeSignatureDataUrl,
} from "@/lib/signature";

const DEFAULT_SIGNATURE: SignaturePlacement = {
  page: -1,
  x: 72,
  y: 72,
  width: 180,
  height: 60,
};

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function extractPdfFormFieldNames(
  pdfBytes: Uint8Array
): Promise<string[]> {
  const doc = await PDFDocument.load(pdfBytes);
  try {
    const form = doc.getForm();
    return form.getFields().map((field) => field.getName());
  } catch {
    return [];
  }
}

export async function fillPdfDocument(options: {
  pdfBytes: Uint8Array;
  mappings: PdfFieldMapping[];
  filledFields: { label: string; value: string }[];
  signatureDataUrl?: string;
  signaturePlacement?: SignaturePlacement;
}): Promise<Uint8Array> {
  const {
    pdfBytes,
    mappings,
    filledFields,
    signatureDataUrl,
    signaturePlacement = DEFAULT_SIGNATURE,
  } = options;

  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  const fields = form.getFields();
  const fieldByName = new Map(fields.map((f) => [f.getName(), f]));
  const applied = new Set<string>();

  for (const mapping of mappings) {
    if (!mapping.pdf_field || !mapping.value) continue;
    const field = fieldByName.get(mapping.pdf_field);
    if (field && setFieldValue(field, mapping.value)) {
      applied.add(mapping.pdf_field);
    }
  }

  for (const mapping of mappings) {
    if (applied.has(mapping.pdf_field)) continue;
    const match = matchPdfFieldByName(fields, mapping.pdf_field);
    if (match && setFieldValue(match, mapping.value)) {
      applied.add(match.getName());
    }
  }

  for (const item of filledFields) {
    const match = mappings.find((mapping) => mapping.label === item.label);
    if (!match) continue;
    const field = matchPdfFieldByName(fields, match.pdf_field);
    if (field && !applied.has(field.getName())) {
      if (setFieldValue(field, item.value)) {
        applied.add(field.getName());
      }
    }
  }

  try {
    form.updateFieldAppearances();
  } catch {
    // continue without appearance update
  }

  if (fields.length === 0 && filledFields.length > 0) {
    await appendSummaryPage(doc, filledFields);
  }

  if (signatureDataUrl) {
    const normalized = await normalizeSignatureDataUrl(signatureDataUrl);
    await embedSignature(doc, normalized, signaturePlacement);
  }

  return doc.save();
}

function setFieldValue(
  field: ReturnType<ReturnType<PDFDocument["getForm"]>["getFields"]>[number],
  value: string
): boolean {
  try {
    if (field instanceof PDFTextField) {
      field.setText(value);
      return true;
    }
    if (field instanceof PDFCheckBox) {
      const truthy = /^(ja|yes|true|1|x|✓)$/i.test(value.trim());
      if (truthy) field.check();
      else field.uncheck();
      return true;
    }
    if (field instanceof PDFDropdown) {
      field.select(value);
      return true;
    }
    if (field instanceof PDFRadioGroup) {
      field.select(value);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
}

export function matchPdfFieldByName<
  T extends { getName(): string },
>(fields: T[], pdfField: string): T | null {
  const exact = fields.find((field) => field.getName() === pdfField);
  if (exact) return exact;

  const target = normalizeFieldName(pdfField);
  if (!target) return null;

  const normalizedMatches = fields.filter(
    (field) => normalizeFieldName(field.getName()) === target
  );
  if (normalizedMatches.length === 1) return normalizedMatches[0];

  return null;
}

async function appendSummaryPage(
  doc: PDFDocument,
  filledFields: { label: string; value: string }[]
) {
  const page = doc.addPage();
  const font = await doc.embedFont("Helvetica");
  const { height } = page.getSize();
  let y = height - 50;

  page.drawText("Ausgefüllte Angaben (Formfill)", {
    x: 50,
    y,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 30;

  for (const field of filledFields.slice(0, 40)) {
    const line = `${field.label}: ${field.value}`;
    page.drawText(line.slice(0, 90), {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
    if (y < 60) break;
  }
}

async function embedSignature(
  doc: PDFDocument,
  dataUrl: string,
  placement: SignaturePlacement
) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBytes = base64ToUint8Array(base64);
  const isPng = dataUrl.includes("image/png");
  const image = isPng
    ? await doc.embedPng(imageBytes)
    : await doc.embedJpg(imageBytes);

  const pages = doc.getPages();
  const pageIndex =
    placement.page < 0 ? pages.length + placement.page : placement.page;
  const page = pages[Math.max(0, Math.min(pageIndex, pages.length - 1))];

  const { width, height } = fitDimensionsInBox(
    image.width,
    image.height,
    placement.width,
    placement.height
  );

  page.drawImage(image, {
    x: placement.x + (placement.width - width) / 2,
    y: placement.y + (placement.height - height) / 2,
    width,
    height,
  });
}
