import type { PdfFieldRect, SignaturePlacement } from "@/lib/types";

function resolveSignaturePage(
  placement: SignaturePlacement,
  numPages: number
): number {
  if (placement.page < 0) {
    return Math.max(0, numPages + placement.page);
  }
  return Math.max(0, Math.min(placement.page, numPages - 1));
}

export function resolveHighlightRects(options: {
  pdfFields?: string[];
  fieldRects: PdfFieldRect[];
  isSignatureStep?: boolean;
  signaturePlacement?: SignaturePlacement | null;
  numPages?: number;
}): PdfFieldRect[] {
  const {
    pdfFields = [],
    fieldRects,
    isSignatureStep = false,
    signaturePlacement,
    numPages = 1,
  } = options;

  if (isSignatureStep && signaturePlacement) {
    return [
      {
        name: "signature",
        page: resolveSignaturePage(signaturePlacement, numPages),
        x: signaturePlacement.x,
        y: signaturePlacement.y,
        width: signaturePlacement.width,
        height: signaturePlacement.height,
      },
    ];
  }

  if (pdfFields.length === 0) return [];

  const wanted = new Set(pdfFields);
  const rects: PdfFieldRect[] = [];
  const seen = new Set<string>();

  for (const rect of fieldRects) {
    if (!wanted.has(rect.name)) continue;
    const id = `${rect.page}:${rect.x}:${rect.y}:${rect.name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rects.push(rect);
  }

  return rects;
}
