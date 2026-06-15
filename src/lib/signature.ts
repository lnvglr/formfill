export const PROFILE_SIGNATURE_KEY = "unterschrift";

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_SIGNATURE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const ALPHA_THRESHOLD = 20;
const WHITE_THRESHOLD = 240;
const CROP_PADDING = 4;

function isSignaturePixel(
  r: number,
  g: number,
  b: number,
  a: number
): boolean {
  if (a <= ALPHA_THRESHOLD) return false;
  return (r + g + b) / 3 < WHITE_THRESHOLD;
}

function cropImageDataToContent(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isSignaturePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return imageData;

  minX = Math.max(0, minX - CROP_PADDING);
  minY = Math.max(0, minY - CROP_PADDING);
  maxX = Math.min(width - 1, maxX + CROP_PADDING);
  maxY = Math.min(height - 1, maxY + CROP_PADDING);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = new ImageData(cropW, cropH);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcI = ((minY + y) * width + (minX + x)) * 4;
      const dstI = (y * cropW + x) * 4;
      cropped.data[dstI] = data[srcI];
      cropped.data[dstI + 1] = data[srcI + 1];
      cropped.data[dstI + 2] = data[srcI + 2];
      cropped.data[dstI + 3] = data[srcI + 3];
    }
  }

  return cropped;
}

export function fitDimensionsInBox(
  contentWidth: number,
  contentHeight: number,
  boxWidth: number,
  boxHeight: number
): { width: number; height: number } {
  if (contentWidth <= 0 || contentHeight <= 0) {
    return { width: boxWidth, height: boxHeight };
  }

  const scale = Math.min(
    boxWidth / contentWidth,
    boxHeight / contentHeight
  );
  return {
    width: contentWidth * scale,
    height: contentHeight * scale,
  };
}

export function isSignatureValue(key: string, value: string): boolean {
  return key === PROFILE_SIGNATURE_KEY && value.startsWith("data:image/");
}

export function isSignatureFieldKey(key: string): boolean {
  return key === PROFILE_SIGNATURE_KEY;
}

/** Force signature strokes to solid black (fixes legacy gray saves). */
export async function normalizeSignatureDataUrl(
  dataUrl: string
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      for (let i = 0; i < data.length; i += 4) {
        if (isSignaturePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        } else {
          data[i + 3] = 0;
        }
      }

      const cropped = cropImageDataToContent(imageData);
      const output = document.createElement("canvas");
      output.width = cropped.width;
      output.height = cropped.height;
      output.getContext("2d")?.putImageData(cropped, 0, 0);
      resolve(output.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function readSignatureImageFile(file: File): Promise<string> {
  if (!ACCEPTED_SIGNATURE_TYPES.has(file.type)) {
    throw new Error("Bitte PNG, JPEG oder WebP verwenden.");
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    throw new Error("Datei ist zu groß (max. 2 MB).");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });

  return normalizeSignatureDataUrl(dataUrl);
}
