"use server";

import { updateTag } from "next/cache";
import { getAuthenticatedUser, isReadmeMember } from "../server/auth";
import { EDITIONS_CACHE_TAG } from "../utils/editions";

export async function updateEditionsCache() {
  const user = await getAuthenticatedUser();
  if (!isReadmeMember(user)) throw new Error("Unauthorized");
  updateTag(EDITIONS_CACHE_TAG);
}
