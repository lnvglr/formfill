export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let text = "";
  const maxPages = Math.min(pdf.numPages, 8);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ") + "\n";
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Kein Text extrahierbar (gescanntes PDF?)");
  }

  return trimmed;
}
