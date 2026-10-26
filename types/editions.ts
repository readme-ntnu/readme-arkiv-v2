export interface IEditionFileDescriptor {
  generation: string;
  size: number;
  status: EditionFileStatus;
}

export interface IEditionThumbnailDescriptor {
  generation: string;
  originalPdfGeneration: string;
  status: EditionFileStatus;
}

export interface IEdition {
  /* Props form Firebase */
  id: string;
  editionYear: number;
  editionNumber: number;
  isListingEdition: boolean;
  originalPdf: IEditionFileDescriptor | null;
  publicPdf: IEditionFileDescriptor | null;
  thumbnail: IEditionThumbnailDescriptor | null;

  /* Dervied props */
  thumbnailUrl: string | null;
  isHiddenInOverview: boolean;
  isIncomplete: boolean;
}

export interface IEditionYearGroup {
  year: number;
  editions: IEdition[];
}

const EDITION_FILE_STATUS_TYPES = [
  "available",
  "missing",
  "invalid",
  "unknown",
] as const;
export type EditionFileStatus = (typeof EDITION_FILE_STATUS_TYPES)[number];

export function isEditionFileStatusType(
  value: unknown,
): value is EditionFileStatus {
  return (
    typeof value === "string" &&
    (EDITION_FILE_STATUS_TYPES as readonly string[]).includes(value)
  );
}

const EDITION_PDF_VERSION_REQUESTS_TYPES = [
  "auto",
  "original",
  "public",
] as const;
export type EditionPdfVersionRequest =
  (typeof EDITION_PDF_VERSION_REQUESTS_TYPES)[number];

export function isEditionPdfVersionRequestType(
  value: unknown,
): value is EditionPdfVersionRequest {
  return (
    typeof value === "string" &&
    (EDITION_PDF_VERSION_REQUESTS_TYPES as readonly string[]).includes(value)
  );
}

export type EditionPdfVersion = "original" | "public";

export type EditionAccessDecision =
  | { outcome: "available"; version: EditionPdfVersion }
  | { outcome: "authentication-required" }
  | { outcome: "public-not-found" };
