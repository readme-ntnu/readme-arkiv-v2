import type { IArticle } from "../types/articles";

export function getPageNumber(article: IArticle) {
  const [editionYear, editionNumber] = article.edition.split("-");
  if (
    parseInt(editionYear) > 2013 ||
    (parseInt(editionYear) === 2013 && parseInt(editionNumber) === 6)
  ) {
    return Math.floor(article.pages[0] / 2) + 1;
  }

  return article.pages[0];
}
