export const PDF_MIME_TYPE = "application/pdf";
export const LARGE_PDF_SIZE_BYTES = 40 * 1_000_000;
export const PDF_VALIDATION_ERROR = "Dette må være en PDF-fil.";

export function isPdfFile(value: unknown): value is File {
  return (
    typeof File !== "undefined" &&
    value instanceof File &&
    value.type === PDF_MIME_TYPE &&
    value.name.toLowerCase().endsWith(".pdf")
  );
}

export function isLargePdf(file: File | undefined) {
  return !!file && file.size > LARGE_PDF_SIZE_BYTES;
}

export function formatFileSize(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
