import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { db } from "../lib/firebase/admin";
import type { ISettings } from "../types/settings";
import { EDITIONS_CACHE_TAG } from "../utils/editions";

export async function getSettings(): Promise<ISettings | null> {
  "use cache";
  cacheLife("max");
  cacheTag(EDITIONS_CACHE_TAG);

  const snapshot = await db.collection("settings").limit(1).get();
  const data = snapshot.docs[0]?.data();

  if (typeof data?.showListing !== "boolean") return null;

  return { showListing: data.showListing };
}
