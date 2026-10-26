import * as admin from "firebase-admin";
import { PDFiumLibrary } from "@hyzyla/pdfium";

import sharp from "sharp";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { setGlobalOptions } from "firebase-functions/v2/options";

setGlobalOptions({
  maxInstances: 5,
});

admin.initializeApp();

const THUMB_MAX_WIDTH = 620;
const ORIGINAL_PDF_PATTERN = /^pdf\/(\d{4})\/(\d{4})-(0[1-6])\.pdf$/;

const pdfiumLibrary = PDFiumLibrary.init();

exports.handlePDFUploadv2 = onObjectFinalized(
  {
    region: "europe-west1",
    timeoutSeconds: 180,
    memory: "512MiB",
  },
  async (object) => {
    const fileBucket = object.data.bucket;
    const filePath = object.data.name as string;
    const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);
    const pathMatch = filePath.match(ORIGINAL_PDF_PATTERN);

    // Only process PDFs at the expected original-edition path.
    if (
      !pathMatch ||
      pathMatch[1] !== pathMatch[2] || // The directory and filename years must match.
      object.data.contentType !== "application/pdf"
    ) {
      console.log("Object is not an original edition PDF.", { filePath });
      return;
    }

    const bucket = admin.storage().bucket(fileBucket);
    const originalFile = bucket.file(filePath);
    const sourceGeneration = String(object.data.generation);

    // Ignore events that refer to an older file generation.
    const [currentOriginalMetadata] = await originalFile.getMetadata();
    if (String(currentOriginalMetadata.generation) !== sourceGeneration) {
      console.log("Skipping obsolete thumbnail generation.", {
        filePath,
        sourceGeneration,
        currentGeneration: String(currentOriginalMetadata.generation),
      });
      return;
    }

    // Render the PDF's first page as a resized JPEG thumbnail.
    const [pdfBuffer] = await originalFile.download({ validation: false });
    const library = await pdfiumLibrary;
    const document = await library.loadDocument(pdfBuffer);
    let thumbnail: Uint8Array;

    try {
      const firstPage = document.getPage(0);
      const renderedPage = await firstPage.render({
        scale: 2,
        render: async ({ data, width, height }) =>
          sharp(data, {
            raw: { width, height, channels: 4 },
          })
            .resize(THUMB_MAX_WIDTH)
            .jpeg()
            .toBuffer(),
      });
      thumbnail = renderedPage.data;
    } finally {
      document.destroy();
    }

    // Confirm that the original was not replaced during rendering.
    const [latestOriginalMetadata] = await originalFile.getMetadata();
    if (String(latestOriginalMetadata.generation) !== sourceGeneration) {
      console.log("Discarding thumbnail rendered from an obsolete PDF.", {
        filePath,
        sourceGeneration,
        currentGeneration: String(latestOriginalMetadata.generation),
      });
      return;
    }

    const editionId = fileName.replace(/\.pdf$/, "");
    const year = pathMatch[1];
    const thumbFilePath = `images/${year}/${editionId}.jpg`;
    const thumbnailFile = bucket.file(thumbFilePath);

    // Store the thumbnail. Its source PDF generation is recorded in Firestore.
    await thumbnailFile.save(Buffer.from(thumbnail), {
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=300",
        contentDisposition: `inline; filename="${editionId}.jpg"`,
      },
    });

    const [thumbnailMetadata] = await thumbnailFile.getMetadata();
    const editionRef = admin.firestore().collection("editions").doc(editionId);

    // Update Firestore only if the edition still uses this original.
    await admin.firestore().runTransaction(async (transaction) => {
      const editionSnapshot = await transaction.get(editionRef);
      if (!editionSnapshot.exists) {
        console.log("No edition record exists for generated thumbnail.", {
          editionId,
        });
        return;
      }

      const edition = editionSnapshot.data();
      if (String(edition?.originalPdf?.generation) !== sourceGeneration) {
        console.log(
          "Edition record references another original PDF generation.",
          {
            editionId,
            sourceGeneration,
            recordGeneration: edition?.originalPdf?.generation,
          },
        );
        return;
      }

      transaction.update(editionRef, {
        thumbnail: {
          generation: String(thumbnailMetadata.generation),
          originalPdfGeneration: sourceGeneration,
          status: "available",
        },
      });
    });
  },
);
