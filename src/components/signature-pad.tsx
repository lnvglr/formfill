"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fitDimensionsInBox,
  normalizeSignatureDataUrl,
  readSignatureImageFile,
} from "@/lib/signature";
import { cn } from "@/lib/utils";
import { Eraser, ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

type SignaturePadProps = {
  value?: string;
  onChange: (dataUrl: string | null) => void;
  className?: string;
  showProfileHint?: boolean;
};

export function SignaturePad({
  value,
  onChange,
  className,
  showProfileHint = true,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000";

    if (value) {
      const img = new Image();
      img.onload = () => {
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const { width, height } = fitDimensionsInBox(
          imgW,
          imgH,
          rect.width,
          rect.height
        );
        ctx.drawImage(
          img,
          (rect.width - width) / 2,
          (rect.height - height) / 2,
          width,
          height
        );
        setIsEmpty(false);
      };
      img.src = value;
    } else {
      setIsEmpty(true);
    }
  }, [value]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    void normalizeSignatureDataUrl(canvas.toDataURL("image/png")).then(
      (dataUrl) => {
        onChange(dataUrl);
        setIsEmpty(false);
      }
    );
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    ctx.strokeStyle = "#000000";
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    exportCanvas();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    setIsEmpty(true);
    onChange(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const dataUrl = await readSignatureImageFile(file);
      onChange(dataUrl);
      setIsEmpty(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload fehlgeschlagen"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative overflow-hidden rounded-md border border-dashed border-border bg-secondary/30">
        <canvas
          ref={canvasRef}
          className="h-44 w-full touch-none cursor-crosshair sm:h-36"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        {isEmpty && !value && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Hier unterschreiben oder Bild hochladen
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {showProfileHint ? (
          <p className="text-[11px] text-muted-foreground">
            Wird in deinem Profil gespeichert und wiederverwendet
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImageUp className="size-3.5" />
            )}
            Bild hochladen
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <Eraser className="size-3.5" />
            Löschen
          </Button>
        </div>
      </div>
    </div>
  );
}
