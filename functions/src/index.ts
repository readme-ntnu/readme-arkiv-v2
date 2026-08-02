import * as admin from "firebase-admin";
import { PDFiumLibrary } from "@hyzyla/pdfium";

import * as path from "path";
import sharp from "sharp";
import * as os from "os";
import * as fs from "fs-extra";
import fetch from "node-fetch";
import {
  onObjectFinalized,
  onObjectDeleted,
} from "firebase-functions/v2/storage";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";

setGlobalOptions({
  maxInstances: 5,
});

admin.initializeApp();

const THUMB_MAX_WIDTH = 620;

const VERCEL_REBUILD_URL = process.env.VERCEL_REBUILD_URL;
const pdfiumLibrary = PDFiumLibrary.init();

const vercelRebuild = async () => {
  if (process.env.NODE_ENV === "production") {
    if (VERCEL_REBUILD_URL == undefined) {
      console.error(
        "VERCEL_REBUILD_URL is not set. Vercel rebuild pings will be skipped.",
      );
      return;
    }

    console.log("Pinging Vercel for rebuild.");
    await fetch(VERCEL_REBUILD_URL, { method: "POST" })
      .then((response) => {
        console.log("Got response from Vercel for rebuild", response);
      })
      .catch((err) => {
        console.error("Got error when trying to ping Vercel for rebuild", err);
      });
  } else {
    console.log(
      `In env "${process.env.NODE_ENV}". Vercel rebuild pings will be skipped.`,
    );
  }
};

exports.handlePDFUploadv2 = onObjectFinalized(
  {
    region: "europe-west1",
    timeoutSeconds: 180,
    memory: "512MiB",
    secrets: ["VERCEL_REBUILD_URL"],
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

    await vercelRebuild();

    return fs.remove(workingDir);
  },
);

exports.handlePdfDeletev2 = onObjectDeleted(
  { region: "europe-west1", secrets: ["VERCEL_REBUILD_URL"] },
  async (object) => {
    const filePath = object.data.name as string;
    if (!filePath.match(/pdf\/\d{4}\/.+\.pdf/g)) {
      return console.log("Object is not a pdf.");
    }

    await vercelRebuild();
  },
);

exports.handleSettingsChangev2 = onDocumentWritten(
  {
    document: "/settings/{docID}",
    region: "europe-west1",
    secrets: ["VERCEL_REBUILD_URL"],
  },
  async () => {
    await vercelRebuild();
  },
);
