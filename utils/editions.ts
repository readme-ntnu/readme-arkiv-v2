import type {
  EditionAccessDecision,
  EditionFileStatus,
  EditionPdfVersionRequest,
} from "types/editions";

const EDITION_ID_PATTERN = /^(\d{4})-(0[1-6])$/;

export const EDITIONS_CACHE_TAG = "editions";

export function parseEditionId(value: string) {
  const match = value.match(EDITION_ID_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  if (year < 1999 || year >= 3000) return null;

  return { editionYear: year, editionNumber: Number(match[2]) };
}

export function isValidEditionId(value: string): boolean {
  return parseEditionId(value) !== null;
}

export function isFaultyEditionFileStatus(value: EditionFileStatus) {
  return value === "missing" || value === "invalid";
}

export function getEditionStoragePaths(editionId: string) {
  const edition = parseEditionId(editionId);
  if (!edition) throw new Error("Invalid edition id");

  return {
    originalPdf: `pdf/${edition.editionYear}/${editionId}.pdf`,
    publicPdf: `pdf_public/${edition.editionYear}/${editionId}_public.pdf`,
    thumbnail: `images/${edition.editionYear}/${editionId}.jpg`,
  };
}

/**
 * Resolve only the product access matrix. Callers must still verify that every
 * recorded descriptor points to the expected Storage object and generation.
 */
export function resolveEditionAccess(
  requestedVersion: EditionPdfVersionRequest,
  isAuthenticated: boolean,
  hasPublicVersion: boolean,
): EditionAccessDecision {
  switch (requestedVersion) {
    case "public":
      return hasPublicVersion
        ? { outcome: "available", version: "public" }
        : { outcome: "public-not-found" };
    case "original":
      return hasPublicVersion && !isAuthenticated
        ? { outcome: "authentication-required" }
        : { outcome: "available", version: "original" };
    case "auto":
      return hasPublicVersion && !isAuthenticated
        ? { outcome: "available", version: "public" }
        : { outcome: "available", version: "original" };
  }
}
