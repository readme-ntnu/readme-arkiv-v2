import type { IEditionFileDescriptor } from "../types/editions";

type PdfMetadata = {
  generation?: string | number | null;
  size?: string | number | null;
  contentType?: string | null;
};

/** Classifies a fetched Storage object against its recorded PDF descriptor. */
export function getPdfMetadataStatus(
  metadata: PdfMetadata,
  descriptor: IEditionFileDescriptor,
): "available" | "invalid" {
  return metadata.generation != null &&
    String(metadata.generation).length > 0 &&
    String(metadata.generation) === descriptor.generation &&
    Number.isFinite(Number(metadata.size)) &&
    Number(metadata.size) > 0 &&
    Number(metadata.size) === descriptor.size &&
    metadata.contentType === "application/pdf"
    ? "available"
    : "invalid";
}

/** Only a confirmed Storage 404 means that the recorded file is missing. */
export function isStorageObjectMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const storageError = error as { code?: unknown; statusCode?: unknown };
  return [storageError.code, storageError.statusCode].some(
    (code) => code === 404 || code === "404",
  );
}
