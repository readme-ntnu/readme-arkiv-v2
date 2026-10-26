export type EditionVersionRequest = "auto" | "original" | "public";

export type EditionAccessDecision =
  | { outcome: "available"; version: "original" | "public" }
  | { outcome: "authentication-required" }
  | { outcome: "public-not-found" };

/**
 * Resolve only the product access matrix. Callers must still verify that every
 * recorded descriptor points to the expected Storage object and generation.
 */
export function resolveEditionAccess(
  requestedVersion: EditionVersionRequest,
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
