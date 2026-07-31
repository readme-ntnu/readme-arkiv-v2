export interface IEdition {
  pdfUrl: string;
  imageUrl: string;
  edition: string;
}

export interface IEditionData {
  year: number;
  editions: IEdition[];
}

export interface IArticle {
  author: string;
  title: string;
  content: string;
  edition: string;
  layout: string;
  pages: number[];
  photo: string;
  tags: string[];
  type: string;
  url: string;
  id: string;
}

export interface ISettings {
  showListing: boolean;
}

export type ISubmitArticleFunction = (
  valuesToSubmit: IEditArticle,
  statusFunctions: {
    setSubmitting: (value: boolean) => void;
    setStatus: ({
      success,
      error,
    }: {
      success?: boolean;
      error?: boolean;
    }) => void;
  },
) => void;

export type ISubmitEditionFunction = (
  values: INewEditionData,
  statusFunctions: {
    setSubmitting: (value: boolean) => void;
    setStatus: ({
      success,
      error,
      progress,
    }: {
      success?: boolean;
      error?: boolean;
      progress?: number;
    }) => void;
  },
) => void;

export interface INewEditionData {
  editionYear: number;
  editionNumber: number;
  editionFile: any;
  listingslop: boolean;
}

export interface IEditArticle {
  author: string;
  title: string;
  content: string;
  editionYear: number;
  editionNumber: number;
  layout: string;
  pages: string;
  photo: string;
  tags: string[];
  type: string;
  url: string;
  id?: string;
}
