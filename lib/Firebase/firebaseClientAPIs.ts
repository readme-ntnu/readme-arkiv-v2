import { ref, deleteObject, uploadBytesResumable } from "firebase/storage";
import {
  doc,
  deleteDoc,
  collection,
  addDoc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, storage } from "./firebase";
import { IArticle, IEditArticle, IEdition, INewEditionData } from "../types";

export const deleteArticle = async (id: string) => {
  await deleteDoc(doc(db, `articles/${id}`));
};

export const addEdition = async (
  edition: INewEditionData,
  onProgressUpdate?: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const path = `pdf/${edition.editionYear}/${edition.editionFile.name}`;
    const metadata = {
      contentType: "application/pdf",
      customMetadata: {
        listinglop: String(edition.listingslop),
      },
    };
    const pdfRef = ref(storage, path);

    const uploadTask = uploadBytesResumable(
      pdfRef,
      edition.editionFile,
      metadata
    );

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgressUpdate && onProgressUpdate(progress);
      },
      (error) => {
        console.error("could not upload pdf file: ", error.code);
        reject(error);
      },
      () => {
        const downloadURL = getPDFDownloadURL(
          `${edition.editionYear}`,
          edition.editionFile.name
        );
        console.log(`File available at ${downloadURL}`);
        const editionName = edition.editionFile.name.replace(".pdf", "");
        updateArticlePDFURL(editionName, downloadURL);
        resolve();
      }
    );
  });
};

export const deleteEdition = async (editionString: string) => {
  const [year, edition] = editionString.split("-");
  const path = `${year}/${year}-${edition}`;
  const pdfPath = `pdf/${path}.pdf`;
  const thumbPath = `images/${path}.jpg`;

  const pdfRef = ref(storage, pdfPath);
  const thumbRef = ref(storage, thumbPath);

  const errors: Error[] = [];

  await deleteObject(thumbRef).catch((err) => {
    errors.push(err);
  });

  await deleteObject(pdfRef).catch((err) => {
    errors.push(err);
  });

  if (errors.length > 0) {
    throw new Error(
      `Kunne ikke slette utgave:\n${errors.map((e) => e.message).join("\n")}`,
    );
  }
};

export const addNewArticle = async (
  valuesToPost: IEditArticle,
  onSuccess: () => void,
  onError: () => void
) => {
  // Making a true copy to avoid pass-by-reference issues
  const article: Partial<IArticle> = {
    ...valuesToPost,
    pages: valuesToPost.pages.split(",").map((v) => parseInt(v)),
    tags: valuesToPost.tags.split(",").map((v) => v.trim()),
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
      error
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
  onError?: () => void
) => {
  const article: IArticle = {
    ...valuesToPost,
    pages: valuesToPost.pages.split(",").map((v) => parseInt(v)),
    tags: valuesToPost.tags.split(",").map((v) => v.trim()),
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
      error
    );
    if (onError) {
      onError();
    }
  }
};

const getArticlePDFURL = (article: IArticle) => {
  const year = article.edition.split("-")[0];
  let pdfURL = getPDFDownloadURL(year, article.edition);
  if (article.pages) {
    pdfURL = `${pdfURL}#page=${getPageNumber(article)}`;
  }
  return pdfURL;
};

const updateArticlePDFURL = async (editionName: unknown, newURL: string) => {
  const articles = await getDocs(
    query(collection(db, "articles"), where("edition", "==", editionName))
  );
  if (articles && !articles.empty) {
    articles.forEach(async (docSnap) => {
      await updateDoc(docSnap.ref, {
        url: `${newURL}#page=${getPageNumber(docSnap.data() as IArticle)}`,
      });
    });
  }
};

export const getPageNumber = (article: IArticle) => {
  const [editionYear, editionNumber] = article.edition.split("-");
  if (
    parseInt(editionYear) > 2013 ||
    (parseInt(editionYear) === 2013 && parseInt(editionNumber) === 6)
  ) {
    return Math.floor(article.pages[0] / 2) + 1;
  } else {
    return article.pages[0];
  }
};

const getPDFDownloadURL = (year: string, name: string) => {
  const root =
    process.env.NODE_ENV === "production"
      ? "https://storage.googleapis.com"
      : "http://localhost:9199";
  let url = `${root}/${ref(storage).bucket}/pdf/${year}/${name}`;
  if (!url.endsWith(".pdf")) {
    url += ".pdf";
  }
  return url;
};
