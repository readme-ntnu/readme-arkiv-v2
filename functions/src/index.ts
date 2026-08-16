import * as admin from "firebase-admin";
import { PDFiumLibrary } from "@hyzyla/pdfium";

import * as path from "path";
import sharp from "sharp";
import * as os from "os";
import * as fs from "fs-extra";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { setGlobalOptions } from "firebase-functions/v2/options";

setGlobalOptions({
  maxInstances: 5,
});

admin.initializeApp();

const THUMB_MAX_WIDTH = 620;

const pdfiumLibrary = PDFiumLibrary.init();

exports.handlePDFUploadv2 = onObjectFinalized(
  {
    region: "europe-west1",
    timeoutSeconds: 180,
    memory: "512MiB",
  },
  async (object) => {
    const fileBucket = object.data.bucket; // The Storage bucket that contains the file.
    const filePath = object.data.name as string; // File path in the bucket.
    // Get the file name.
    const fileName = path.basename(filePath);
    // Exit if the image is already a thumbnail.
    if (!filePath.match(/pdf\/\d{4}\/.+\.pdf/g)) {
      return console.log("Object is not a pdf.");
    }

    const bucket = admin.storage().bucket(fileBucket);
    const workingDir = path.join(os.tmpdir(), "thumbs");
    const tempFilePath = path.join(workingDir, fileName);

    await fs.ensureDir(workingDir);

    await bucket
      .file(filePath)
      .download({ destination: tempFilePath, validation: false });
    console.log("PDF downloaded locally to", tempFilePath);

    await fs.ensureFile(tempFilePath);

    const library = await pdfiumLibrary;
    const pdfBuffer = await fs.readFile(tempFilePath);
    const document = await library.loadDocument(Uint8Array.from(pdfBuffer));
    let thumbnail: Uint8Array;

    try {
      const firstPage = document.getPage(0);
      const renderedPage = await firstPage.render({
        scale: 2,
        render: async ({ data, width, height }) =>
          Uint8Array.from(
            await sharp(data, {
              raw: { width, height, channels: 4 },
            })
              .resize(THUMB_MAX_WIDTH)
              .jpeg()
              .toBuffer(),
          ),
      });
      thumbnail = renderedPage.data;
    } finally {
      document.destroy();
    }

    const metadata = {
      contentType: "image/jpeg",
    };
    const thumbFilePath = path
      .join(path.dirname(filePath), fileName)
      .replace(".pdf", ".jpg")
      .replace("pdf", "images");

    await bucket.file(thumbFilePath).save(Buffer.from(thumbnail), { metadata });

    return fs.remove(workingDir);
  },
);
