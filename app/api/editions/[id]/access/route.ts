import type { File } from "@google-cloud/storage";
import { NextRequest, NextResponse } from "next/server";
import { isNonAnonymousUser, verifyAuthorizationHeader } from "server/auth";
import { getEdition } from "server/editions";
import { db, storage } from "lib/firebase/admin";
import {
  EDITIONS_CACHE_TAG,
  getEditionStoragePaths,
  isFaultyEditionFileStatus,
  isValidEditionId,
  resolveEditionAccess,
} from "utils/editions";
import { getStorageMediaUrl } from "utils/firebaseStorage";
import {
  EditionPdfVersion,
  isEditionPdfVersionRequestType,
  type EditionFileStatus,
  type EditionPdfVersionRequest,
  type IEditionFileDescriptor,
} from "types/editions";
import { revalidateTag } from "next/cache";
import { IFirestoreEditionFileDescriptor } from "server/editionRecord";
import { getPdfStorageStatus } from "server/editionFiles";

const SIGNED_URL_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

// Access responses must never be stored in a shared cache.
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Authorization",
};

// Creates a JSON response with private cache headers.
function json(body: object, status: number = 200) {
  return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}

// Returns the shared response for inconsistent edition files.
function editionUnavailable() {
  return json(
    {
      code: "EDITION_UNAVAILABLE",
      message: "Utgaven er midlertidig utilgjengelig.",
    },
    503,
  );
}

// Chooses the filename shown when the PDF is downloaded.
function getFileDownloadName(id: string, version: EditionPdfVersionRequest) {
  switch (version) {
    case "auto":
      return `${id}.pdf`;
    case "original":
      return `${id}_original.pdf`;
    case "public":
      return `${id}_public.pdf`;
  }
}

// Updates a status of an edition (but only if the record hasn't been updated in the meantime)
async function updatePdfStatus(
  id: string,
  version: EditionPdfVersion,
  prevDescriptor: IEditionFileDescriptor,
  newStatus: EditionFileStatus,
) {
  if (newStatus === "unknown" || newStatus === prevDescriptor.status) return;

  const field = version === "original" ? "originalPdf" : "publicPdf";
  const editionRef = db.collection("editions").doc(id);

  try {
    const changed = await db.runTransaction(async (transaction) => {
      const currentDescriptor = (await transaction.get(editionRef)).get(
        field,
      ) as IFirestoreEditionFileDescriptor | undefined;
      if (
        currentDescriptor?.generation !== prevDescriptor.generation ||
        currentDescriptor.status === newStatus
      ) {
        return false;
      }
      transaction.update(editionRef, { [`${field}.status`]: newStatus });
      return true;
    });
    if (changed) revalidateTag(EDITIONS_CACHE_TAG, "max");
  } catch (error) {
    console.error(`Could not update ${version} PDF status for ${id}`, error);
  }
}

// Creates an authorized URL for the original PDF.
async function getOriginalUrl(
  file: File,
  path: string,
  descriptor: IEditionFileDescriptor,
  downloadName: string,
) {
  // The emulator cannot create GCS signed URLs.
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    const [metadata] = await file.getMetadata();
    const rawDownloadTokens = metadata.metadata?.firebaseStorageDownloadTokens;
    const downloadToken =
      typeof rawDownloadTokens === "string"
        ? rawDownloadTokens
            .split(",")
            .map((token: string) => token.trim())
            .find(Boolean)
        : undefined;
    if (!downloadToken) {
      throw new Error("Original PDF is missing its emulator download token");
    }
    return getStorageMediaUrl(file.bucket.name, path, {
      generation: descriptor.generation,
      downloadToken,
    });
  }

  // Production originals receive a short-lived signed URL.
  const [url] = await file.getSignedUrl({
    action: "read",
    version: "v4",
    expires: Date.now() + SIGNED_URL_LIFETIME_MS,
    responseDisposition: `inline; filename="${downloadName}"`,
    responseType: "application/pdf",
  });

  return url;
}

// Resolves access and returns the selected PDF URL.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check that id is valid
  if (!isValidEditionId(id)) {
    return json({ code: "INVALID_EDITION", message: "Ugyldig utgave." }, 400);
  }

  // Check that the version requested is either "auto", "original" or "public"
  const versionValue = request.nextUrl.searchParams.get("version") ?? "auto";
  if (!isEditionPdfVersionRequestType(versionValue)) {
    return json(
      { code: "INVALID_VERSION", message: "Ugyldig PDF-versjon." },
      400,
    );
  }

  // Get the Firestore record
  const editionRecord = await getEdition(id);
  if (!editionRecord) {
    return json(
      { code: "EDITION_NOT_FOUND", message: "Utgaven finnes ikke." },
      404,
    );
  }

  const { originalPdf: originalPdfDescriptor, publicPdf: publicPdfDescriptor } =
    editionRecord;

  // Authentication is only needed when the original may be requested.
  const user =
    publicPdfDescriptor && versionValue !== "public"
      ? await verifyAuthorizationHeader(request.headers.get("authorization"))
      : null;

  // Resolves acces to either the original or public PDF version depending on the auth state and the requested version value
  const decision = resolveEditionAccess(
    versionValue,
    isNonAnonymousUser(user),
    publicPdfDescriptor !== null,
  );

  if (decision.outcome === "public-not-found") {
    return json(
      {
        code: "PUBLIC_VERSION_NOT_FOUND",
        message: "Utgaven har ingen offentlig versjon.",
      },
      404,
    );
  }

  if (decision.outcome === "authentication-required") {
    return json(
      {
        code: "AUTH_REQUIRED",
        message: "Logg inn for å se originalversjonen.",
      },
      401,
    );
  }

  const resolvedVersion = decision.version;
  const descriptor =
    resolvedVersion === "public" ? publicPdfDescriptor : originalPdfDescriptor;
  if (!descriptor) return editionUnavailable();

  const paths = getEditionStoragePaths(id);
  const bucket = storage.bucket();
  const path =
    resolvedVersion === "public" ? paths.publicPdf : paths.originalPdf;
  const file = bucket.file(path, { generation: descriptor.generation });
  const status = await getPdfStorageStatus(file, descriptor);
  await updatePdfStatus(id, resolvedVersion, descriptor, status);
  if (isFaultyEditionFileStatus(status)) return editionUnavailable();

  try {
    // Public PDFs use Storage directly; originals use a signed URL.
    const inlineUrl =
      resolvedVersion === "public"
        ? getStorageMediaUrl(bucket.name, path, {
            generation: descriptor.generation,
          })
        : await getOriginalUrl(
            file,
            path,
            descriptor,
            getFileDownloadName(editionRecord.id, versionValue),
          );

    return json({ url: inlineUrl, version: resolvedVersion });
  } catch {
    return editionUnavailable();
  }
}
