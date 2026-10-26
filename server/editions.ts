import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { IEdition, IEditionYearGroup } from "../types/editions";
import {
  EDITIONS_CACHE_TAG,
  getEditionStoragePaths,
  isFaultyEditionFileStatus,
  isValidEditionId,
} from "../utils/editions";
import { getStorageMediaUrl } from "../utils/firebaseStorage";
import { db, storage } from "../lib/firebase/admin";
import {
  type IFirestoreEditionRecord,
  parseEditionRecord,
} from "./editionRecord";
import { getSettings } from "./settings";

function getThumbnailUrl(editionId: string, record: IFirestoreEditionRecord) {
  if (
    !record.thumbnail ||
    isFaultyEditionFileStatus(record.thumbnail.status)
  ) {
    return null;
  }
  return getStorageMediaUrl(
    storage.bucket().name,
    getEditionStoragePaths(editionId).thumbnail,
    { generation: record.thumbnail.generation },
  );
}

function isIncompleteRecord(record: IFirestoreEditionRecord) {
  return (
    !record.originalPdf ||
    !record.thumbnail ||
    isFaultyEditionFileStatus(record.originalPdf.status) ||
    isFaultyEditionFileStatus(record.thumbnail.status) ||
    record.thumbnail.originalPdfGeneration !== record.originalPdf.generation ||
    (record.publicPdf !== null &&
      isFaultyEditionFileStatus(record.publicPdf.status))
  );
}

function toEdition(
  id: string,
  record: IFirestoreEditionRecord,
  showListingEditions: boolean,
): IEdition {
  return {
    id,
    editionYear: record.editionYear,
    editionNumber: record.editionNumber,
    isListingEdition: record.listinglop,
    originalPdf: record.originalPdf,
    publicPdf: record.publicPdf,
    thumbnail: record.thumbnail,
    thumbnailUrl: getThumbnailUrl(id, record),
    isHiddenInOverview: record.listinglop && !showListingEditions,
    isIncomplete: isIncompleteRecord(record),
  };
}

export async function getEdition(editionId: string): Promise<IEdition | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(EDITIONS_CACHE_TAG);

  if (!isValidEditionId(editionId)) return null;

  const snapshot = await db.collection("editions").doc(editionId).get();
  if (!snapshot.exists) return null;

  const record = parseEditionRecord(snapshot.id, snapshot.data());
  if (!record) return null;

  const settingsSnapshot = await getSettings();
  const showListing =
    settingsSnapshot !== null ? settingsSnapshot.showListing : true;

  return toEdition(editionId, record, showListing);
}

export async function getEditions({
  filterListingEditions = false,
  includeIncomplete = false,
}: {
  filterListingEditions?: boolean;
  includeIncomplete?: boolean;
} = {}): Promise<IEditionYearGroup[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(EDITIONS_CACHE_TAG);

  const [editionSnapshot, settingsSnapshot] = await Promise.all([
    db.collection("editions").get(),
    getSettings(),
  ]);

  const showListing =
    settingsSnapshot !== null ? settingsSnapshot.showListing : true;

  const yearEditionMap = new Map<number, IEdition[]>();

  for (const editionDoc of editionSnapshot.docs) {
    const record = parseEditionRecord(editionDoc.id, editionDoc.data());
    if (!record) continue;

    const edition = toEdition(editionDoc.id, record, showListing);

    if (!includeIncomplete && edition.isIncomplete) continue;
    if (filterListingEditions && edition.isListingEdition && !showListing) {
      continue;
    }

    yearEditionMap.set(edition.editionYear, [
      ...(yearEditionMap.get(edition.editionYear) ?? []),
      edition,
    ]);
  }

  return Array.from(yearEditionMap.entries())
    .map(([year, editions]) => ({
      year,
      editions: editions.sort((a, b) => b.id.localeCompare(a.id)),
    }))
    .sort((a, b) => b.year - a.year);
}
