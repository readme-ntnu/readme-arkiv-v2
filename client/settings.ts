"use client";

import {
  collection,
  DocumentData,
  query,
  QueryDocumentSnapshot,
  SnapshotOptions,
  updateDoc,
  WithFieldValue,
} from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { db } from "../lib/firebase/client";
import type { ISettings } from "../types/settings";

const settingsConverter = {
  toFirestore(post: WithFieldValue<ISettings>): DocumentData {
    return post;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): ISettings {
    const data = snapshot.data(options)!;
    return { ...data } as ISettings;
  },
};

export const useSettings = () => {
  const [data, loading, error, snapshot] = useCollectionData<ISettings>(
    query(collection(db, "settings").withConverter(settingsConverter)),
  );

  const updateSettings = async (newSettings: ISettings) => {
    if (snapshot) {
      await updateDoc(snapshot.docs[0].ref, { ...newSettings });
    }
  };

  return [data?.at(0), loading, error, updateSettings] as const;
};
