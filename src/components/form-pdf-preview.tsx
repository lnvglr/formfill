"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { base64ToUint8Array } from "@/lib/pdf-fill-client";
import type { PdfFieldRect, SignaturePlacement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { iconDirectional } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormPdfPreviewProps = {
  pdfBase64: string;
  highlightRects?: PdfFieldRect[];
  signaturePlacement?: SignaturePlacement | null;
  title?: string;
  className?: string;
};

const HIGHLIGHT_FILL = "rgba(59, 130, 246, 0.28)";
const HIGHLIGHT_STROKE = "rgb(37, 99, 235)";

function resolveSignaturePage(
  placement: SignaturePlacement,
  numPages: number
): number {
  if (placement.page < 0) {
    return Math.max(0, numPages + placement.page);
  }
  return Math.max(0, Math.min(placement.page, numPages - 1));
}

export function FormPdfPreview({
  pdfBase64,
  highlightRects = [],
  signaturePlacement,
  title,
  className,
}: FormPdfPreviewProps) {
  const t = useT();
  const resolvedTitle = title ?? t("upload.preview.emptyForm");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [rendering, setRendering] = useState(false);

  const focusPage = useMemo(() => {
    if (highlightRects.length > 0) {
      return highlightRects[0]?.page ?? 0;
    }
    if (signaturePlacement) {
      return resolveSignaturePage(signaturePlacement, Math.max(numPages, 1));
    }
    return 0;
  }, [highlightRects, signaturePlacement, numPages]);

  useEffect(() => {
    setPageIndex(focusPage);
  }, [focusPage, pdfBase64]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setRendering(true);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const bytes = base64ToUint8Array(pdfBase64);
        const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        if (cancelled) return;

        setNumPages(pdf.numPages);
        const safePageIndex = Math.min(
          Math.max(0, pageIndex),
          Math.max(0, pdf.numPages - 1)
        );
        const page = await pdf.getPage(safePageIndex + 1);
        const viewport = page.getViewport({ scale: 1.35 });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        if (cancelled) return;

        const pageHeight = viewport.height / viewport.scale;
        const rectsForPage = highlightRects.filter(
          (rect) => rect.page === safePageIndex
        );

        for (const rect of rectsForPage) {
          const x = rect.x * viewport.scale;
          const y = (pageHeight - rect.y - rect.height) * viewport.scale;
          const width = rect.width * viewport.scale;
          const height = rect.height * viewport.scale;

          ctx.fillStyle = HIGHLIGHT_FILL;
          ctx.strokeStyle = HIGHLIGHT_STROKE;
          ctx.lineWidth = 2;
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
        }

        if (
          signaturePlacement &&
          safePageIndex ===
            resolveSignaturePage(signaturePlacement, pdf.numPages) &&
          rectsForPage.length === 0
        ) {
          const x = signaturePlacement.x * viewport.scale;
          const y =
            (pageHeight - signaturePlacement.y - signaturePlacement.height) *
            viewport.scale;
          const width = signaturePlacement.width * viewport.scale;
          const height = signaturePlacement.height * viewport.scale;

          ctx.fillStyle = HIGHLIGHT_FILL;
          ctx.strokeStyle = HIGHLIGHT_STROKE;
          ctx.lineWidth = 2;
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [pdfBase64, pageIndex, highlightRects, signaturePlacement]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{resolvedTitle}</p>
        {numPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((page) => Math.max(0, page - 1))}
            >
              <ChevronLeft className={iconDirectional("size-4")} />
            </Button>
            <span className="min-w-16 text-center font-mono text-[10px] text-muted-foreground">
              {pageIndex + 1} / {numPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={pageIndex >= numPages - 1}
              onClick={() =>
                setPageIndex((page) => Math.min(numPages - 1, page + 1))
              }
            >
              <ChevronRight className={iconDirectional("size-4")} />
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "overflow-auto rounded-md border bg-white",
          rendering && "opacity-70"
        )}
      >
        <canvas ref={canvasRef} className="mx-auto block max-w-full" />
      </div>

      {highlightRects.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {t("upload.preview.highlightHint")}
        </p>
      )}
    </div>
  );
}
