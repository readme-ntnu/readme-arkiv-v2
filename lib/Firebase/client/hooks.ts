import {
  collection,
  DocumentData,
  endBefore,
  limit,
  limitToLast,
  orderBy,
  query,
  QueryDocumentSnapshot,
  QueryEndAtConstraint,
  QueryLimitConstraint,
  QueryOrderByConstraint,
  QueryStartAtConstraint,
  SnapshotOptions,
  startAfter,
  updateDoc,
  WithFieldValue,
} from "firebase/firestore";
import { useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { IArticle, ISettings } from "../../types";
import { db } from "./firebase";

const articleConverter = {
  toFirestore(post: WithFieldValue<IArticle>): DocumentData {
    return post;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): IArticle {
    const data = snapshot.data(options)!;
    return { ...data, id: snapshot.id } as IArticle;
  },
};

const firstField = "edition";
const secondField = "pages";
const pageSize = 20;
const baseQuery = [orderBy(firstField, "desc"), orderBy(secondField, "desc")];
type Query =
  | QueryOrderByConstraint
  | QueryLimitConstraint
  | QueryStartAtConstraint
  | QueryEndAtConstraint;

export const useArticleList = () => {
  const [dynamicQuery, setQuery] = useState<Query[]>([
    ...baseQuery,
    limit(pageSize),
  ]);

  const [data, loading, error] = useCollectionData<IArticle>(
    query(
      collection(db, "articles").withConverter(articleConverter),
      ...dynamicQuery
    )
  );

  const [pageNum, setPageNum] = useState(0);

  const prevPage = () => {
    if (pageNum - 1 < 0 || !data) return;

    const first = data[0];
    setPageNum(pageNum - 1);
    setQuery([
      ...baseQuery,
      endBefore(first[firstField], first[secondField]),
      limitToLast(pageSize),
    ]);
  };

  const nextPage = () => {
    if (!data) return;

    const last = data[data.length - 1];
    setPageNum(pageNum + 1);
    setQuery([
      ...baseQuery,
      startAfter(last[firstField], last[secondField]),
      limit(pageSize),
    ]);
  };

  return [data, loading, error, pageNum, nextPage, prevPage] as const;
};

const settingsConverter = {
  toFirestore(post: WithFieldValue<ISettings>): DocumentData {
    return post;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ISettings {
    const data = snapshot.data(options)!;
    return { ...data } as ISettings;
  },
};

export const useSettings = () => {
  const [data, loading, error, snapshot] = useCollectionData<ISettings>(
    query(collection(db, "settings").withConverter(settingsConverter))
  );

  const updateSettings = async (newSettings: ISettings) => {
    if (snapshot) {
      await updateDoc(snapshot.docs[0].ref, { ...newSettings });
    }
  };

  return [data?.at(0), loading, error, updateSettings] as const;
};
