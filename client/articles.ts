"use client";

import {
  doc,
  deleteDoc,
  collection,
  addDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase/client";
import type { IArticle, IEditArticle } from "../types/articles";
import { getPageNumber } from "../utils/articles";
import { getEditionRoute } from "../utils/routes";

export const deleteArticle = async (id: string) => {
  await deleteDoc(doc(db, `articles/${id}`));
};

export const addNewArticle = async (
  valuesToPost: IEditArticle,
  onSuccess: () => void,
  onError: () => void,
) => {
  // Making a true copy to avoid pass-by-reference issues
  const article: Partial<IArticle> = {
    ...valuesToPost,
    pages: valuesToPost.pages.split(",").map((v) => parseInt(v)),
    edition: `${valuesToPost.editionYear}-0${valuesToPost.editionNumber}`,
  };

  try {
    const url = getArticlePDFURL(article as IArticle);
    article.url = url;
    await addDoc(collection(db, "articles"), article);
    console.log("Article added to DB");
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error(
      "Something when wrong during edition upload, failed with error: ",
      error,
    );
    if (onError) {
      onError();
    }
  }
};

export const getArticleByID = async (id: string) => {
  const articleDoc = await getDoc(doc(db, `articles/${id}`));

  const article = { ...articleDoc.data(), id: articleDoc.id } as IArticle;
  return article;
};

export const updateArticle = async (
  valuesToPost: IEditArticle,
  id: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const article: IArticle = {
    ...valuesToPost,
    pages: valuesToPost.pages.split(",").map((v) => parseInt(v)),
    edition: `${valuesToPost.editionYear}-0${valuesToPost.editionNumber}`,
    id: id,
  };
  try {
    const url = getArticlePDFURL(article);
    article.url = url;
    const articleRef = doc(db, `articles/${article.id}`);
    await updateDoc(articleRef, article as { [x: string]: any });
    console.log("Article added to DB");
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error(
      "Something when wrong during edition upload, failed with error: ",
      error,
    );
    if (onError) {
      onError();
    }
  }
};

const getArticlePDFURL = (article: IArticle) => {
  let pdfURL = getEditionRoute(article.edition);
  if (article.pages) {
    pdfURL = `${pdfURL}#page=${getPageNumber(article)}`;
  }
  return pdfURL;
};
