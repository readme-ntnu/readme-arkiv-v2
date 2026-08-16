"use server";

import { refresh, revalidatePath, updateTag } from "next/cache";
import { ROUTES } from "../../../utils/routes";
import { getAuthenticatedUser } from "./auth";
import { EDITIONS_CACHE_TAG } from "./cacheTags";

export async function updateEditionsCache() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  updateTag(EDITIONS_CACHE_TAG);
  revalidatePath(ROUTES.ADMIN, "layout"); // Refresh the cached <Link> components for the tab
  refresh();
}
