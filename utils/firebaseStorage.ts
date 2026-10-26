interface StorageMediaUrlOptions {
  generation?: string;
  downloadToken?: string;
}

export function getStorageMediaUrl(
  bucketName: string,
  path: string,
  options: StorageMediaUrlOptions = {},
) {
  const host =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
      ? "http://localhost:9199"
      : "https://firebasestorage.googleapis.com";
  const query = new URLSearchParams({ alt: "media" });

  if (options.generation) {
    query.set("generation", options.generation);
  }
  if (options.downloadToken) {
    query.set("token", options.downloadToken);
  }

  return `${host}/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(path)}?${query}`;
}
