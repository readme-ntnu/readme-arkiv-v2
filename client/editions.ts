"use client";

import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../lib/firebase/client";
import { getEditionStoragePaths, isValidEditionId } from "../utils/editions";
import { PDF_MIME_TYPE } from "../utils/pdf";

type EditionUploadInput = {
  editionId: string;
  originalFile?: File;
  publicFile?: File;
};

type EditionUploadResult = {
  originalPdfGeneration?: string;
  publicPdfGeneration?: string;
};

type EditionUploadSpec = {
  key: keyof EditionUploadResult;
  file: File;
};

async function preparePdfForUpload(file: File, editionId: string) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(await file.arrayBuffer(), {
    updateMetadata: false,
  });

  pdf.setTitle(editionId, { showInWindowTitleBar: true });
  const bytes = new Uint8Array(
    await pdf.save({
      addDefaultPage: false,
      updateFieldAppearances: false,
    }),
  );

  return new File([bytes], `${editionId}.pdf`, {
    type: PDF_MIME_TYPE,
    lastModified: file.lastModified,
  });
}

/**
 * Uploads edition bodies straight from the browser to Firebase Storage.
 * Keeping this client-side means Vercel never receives or proxies the PDFs.
 */
export async function uploadEditionFiles(
  { editionId, originalFile, publicFile }: EditionUploadInput,
  onProgressUpdate?: (percentage: number) => void,
): Promise<EditionUploadResult> {
  if (!isValidEditionId(editionId)) throw new Error("Ugyldig utgave-ID");
  const paths = getEditionStoragePaths(editionId);

  const files: EditionUploadSpec[] = [];
  if (originalFile) {
    files.push({
      key: "originalPdfGeneration",
      file: await preparePdfForUpload(originalFile, editionId),
    });
  }
  if (publicFile) {
    files.push({
      key: "publicPdfGeneration",
      file: await preparePdfForUpload(publicFile, editionId),
    });
  }

  if (files.length === 0) {
    onProgressUpdate?.(100);
    return {};
  }

  const transferred = new Map(files.map(({ key }) => [key, 0]));
  const totalBytes = files.reduce((sum, { file }) => sum + file.size, 0);
  const reportProgress = () => {
    const bytesTransferred = Array.from(transferred.values()).reduce(
      (sum, bytes) => sum + bytes,
      0,
    );
    onProgressUpdate?.(
      totalBytes === 0 ? 100 : (bytesTransferred / totalBytes) * 100,
    );
  };

  reportProgress();

  const results = await Promise.allSettled(
    files.map(
      ({ key, file }) =>
        new Promise<{ key: EditionUploadSpec["key"]; generation: string }>(
          (resolve, reject) => {
            const path =
              key === "originalPdfGeneration"
                ? paths.originalPdf
                : paths.publicPdf;
            const uploadTask = uploadBytesResumable(ref(storage, path), file, {
              contentType: PDF_MIME_TYPE,
              contentDisposition: `inline; filename="${editionId}.pdf"`,
              ...(process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
                ? {
                    customMetadata: {
                      firebaseStorageDownloadTokens: crypto.randomUUID(),
                    },
                  }
                : {}),
            });

            uploadTask.on(
              "state_changed",
              (snapshot) => {
                transferred.set(key, snapshot.bytesTransferred);
                reportProgress();
              },
              reject,
              () => {
                const generation = uploadTask.snapshot.metadata.generation;
                if (!generation) {
                  reject(new Error("Storage did not return a file generation"));
                  return;
                }
                resolve({ key, generation });
              },
            );
          },
        ),
    ),
  );

  const failed = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ reason: result.reason, version: files[index].key }]
      : [],
  );
  if (failed.length > 0) {
    const failedVersions = failed
      .map(({ version }) =>
        version === "originalPdfGeneration"
          ? "originalen"
          : "den offentlige versjonen",
      )
      .join(" og ");
    throw new AggregateError(
      failed.map(({ reason }) => reason),
      `Kunne ikke laste opp ${failedVersions}`,
    );
  }

  const uploaded: EditionUploadResult = {};
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    uploaded[result.value.key] = result.value.generation;
  }
  return uploaded;
}
