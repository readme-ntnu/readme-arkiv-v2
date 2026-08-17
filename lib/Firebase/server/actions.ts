"use server";

import { updateTag } from "next/cache";
import { getAuthenticatedUser } from "./auth";
import { EDITIONS_CACHE_TAG } from "./cacheTags";

export async function updateEditionsCache() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  updateTag(EDITIONS_CACHE_TAG);
}
