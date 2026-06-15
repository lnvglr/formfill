import { PDFDocument } from "pdf-lib";
import type { PdfFieldContext, PdfFieldRect } from "@/lib/types";

type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function findWidgetPageIndex(
  doc: PDFDocument,
  widget: { P: () => unknown; dict: unknown }
): number {
  const pages = doc.getPages();
  const pageRef = widget.P();
  const byRef = pages.findIndex((page) => page.ref === pageRef);
  if (byRef >= 0) return byRef;

  const widgetRef = doc.context.getObjectRef(widget.dict as never);
  if (!widgetRef) return 0;

  const page = doc.findPageForAnnotationRef(widgetRef);
  if (!page) return 0;

  return pages.findIndex((candidate) => candidate.ref === page.ref);
}

function findNearbyLabel(textItems: TextItem[], rect: PdfFieldRect): string {
  const fieldTop = rect.y + rect.height;
  const fieldBottom = rect.y;
  const fieldLeft = rect.x;
  const fieldRight = rect.x + rect.width;

  const scored = textItems
    .filter((item) => item.str.trim().length > 0)
    .map((item) => {
      const textTop = item.y + item.height;
      const textBottom = item.y;
      const textRight = item.x + item.width;
      const textCenterY = (textTop + textBottom) / 2;
      const fieldCenterY = (fieldTop + fieldBottom) / 2;

      const verticalOverlap =
        textBottom <= fieldTop + 4 && textTop >= fieldBottom - 4;
      const leftOfField = textRight <= fieldLeft + 12;
      const aboveField =
        textBottom >= fieldTop - 6 &&
        textBottom <= fieldTop + 40 &&
        item.x <= fieldRight + 20;

      let score = Number.POSITIVE_INFINITY;

      if (verticalOverlap && leftOfField) {
        score =
          fieldLeft -
          textRight +
          Math.abs(textCenterY - fieldCenterY) * 0.4;
      } else if (aboveField) {
        score =
          fieldTop -
          textBottom +
          Math.abs(item.x - fieldLeft) * 0.25 +
          80;
      }

      return { item, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.score - b.score);

  return scored
    .slice(0, 5)
    .map((entry) => entry.item.str.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

async function loadPageTextItems(
  pdfBytes: Uint8Array
): Promise<Map<number, TextItem[]>> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const pdf = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise;
  const pageText = new Map<number, TextItem[]>();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: TextItem[] = [];

    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str.trim()) continue;
      const transform = raw.transform;
      const x = transform[4];
      const y = transform[5];
      const width = raw.width ?? Math.abs(transform[0]) * raw.str.length;
      const height = Math.abs(transform[3]) || 10;
      items.push({ str: raw.str, x, y, width, height });
    }

    pageText.set(pageNumber - 1, items);
  }

  return pageText;
}

export async function extractPdfFieldContexts(
  pdfBytes: Uint8Array
): Promise<PdfFieldContext[]> {
  const doc = await PDFDocument.load(pdfBytes);
  const pageText = await loadPageTextItems(pdfBytes);
  const contexts: PdfFieldContext[] = [];

  try {
    const form = doc.getForm();
    for (const field of form.getFields()) {
      for (const widget of field.acroField.getWidgets()) {
        const rectangle = widget.getRectangle();
        const page = findWidgetPageIndex(doc, widget);
        const rect: PdfFieldRect = {
          name: field.getName(),
          page,
          x: rectangle.x,
          y: rectangle.y,
          width: rectangle.width,
          height: rectangle.height,
        };
        const nearbyLabel =
          findNearbyLabel(pageText.get(page) ?? [], rect) || field.getName();

        contexts.push({
          pdf_field: field.getName(),
          page,
          rect,
          nearby_label: nearbyLabel,
        });
      }
    }
  } catch {
    return [];
  }

  return contexts;
}

export function contextsToFieldRects(
  contexts: PdfFieldContext[]
): PdfFieldRect[] {
  return contexts.map((context) => context.rect);
}
