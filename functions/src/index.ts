import * as admin from "firebase-admin";

import * as path from "path";
import sharp from "sharp";
import * as os from "os";
import * as fs from "fs-extra";
import pdf2jpg from "pdf2jpg";
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

const VERCEL_REBUILD_URL = process.env.VERCEL_REBUILD_URL || "";

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
    const tempPNGFilePath = path
      .join(workingDir, fileName)
      .replace(".pdf", ".png");

    await fs.ensureDir(workingDir);

    await bucket
      .file(filePath)
      .download({ destination: tempFilePath, validation: false });
    console.log("PDF downloaded locally to", tempFilePath);

    await fs.ensureFile(tempFilePath);

    await pdf2jpg(tempFilePath, { page: 1 }).then(
      (buffer: string | NodeJS.ArrayBufferView) =>
        fs.writeFileSync(tempPNGFilePath, buffer),
    );

    const metadata = {
      contentType: "image/jpeg",
    };
    const thumbFilePath = path
      .join(path.dirname(filePath), fileName)
      .replace(".pdf", ".jpg")
      .replace("pdf", "images");

    const thumbnailUploadStream = bucket
      .file(thumbFilePath)
      .createWriteStream({ metadata });

    // Create Sharp pipeline for resizing the image and use pipe to read from bucket read stream
    const pipeline = sharp();
    pipeline
      .resize(THUMB_MAX_WIDTH)
      .toFormat("jpeg")
      .pipe(thumbnailUploadStream);

    fs.createReadStream(tempPNGFilePath).pipe(pipeline);

    await new Promise((resolve, reject) =>
      thumbnailUploadStream.on("finish", resolve).on("error", reject),
    );

    if (process.env.NODE_ENV === "production") {
      console.log("Pinging Vercel for rebuild.");
      await fetch(VERCEL_REBUILD_URL, { method: "POST" })
        .then((response) => {
          console.log("Got response from Vercel for rebuild", response);
        })
        .catch((err) => {
          console.error(
            "Got error when trying to ping Vercel for rebuild",
            err,
          );
        });
    } else {
      console.log(
        `In env ${process.env.NODE_ENV}, not pinging Vercel for rebuild.`,
      );
    }

    return fs.remove(workingDir);
  },
);

exports.handlePdfDeletev2 = onObjectDeleted(
  { region: "europe-west1" },
  async (object) => {
    const filePath = object.data.name as string;
    if (!filePath.match(/pdf\/\d{4}\/.+\.pdf/g)) {
      return console.log("Object is not a pdf.");
    }

    if (process.env.NODE_ENV === "production") {
      await fetch(VERCEL_REBUILD_URL, { method: "POST" });
      console.log("Pinging Vercel for rebuild.");
    } else {
      console.log(
        `In env ${process.env.NODE_ENV}, not pinging Vercel for rebuild.`,
      );
    }
  },
);

exports.handleSettingsChangev2 = onDocumentWritten(
  "/settings/{docID}",
  async () => {
    if (process.env.NODE_ENV === "production") {
      await fetch(VERCEL_REBUILD_URL, { method: "POST" });
      console.log("Pinging Vercel for rebuild.");
    } else {
      console.log(
        `In env ${process.env.NODE_ENV}, not pinging Vercel for rebuild.`,
      );
    }
  },
);
