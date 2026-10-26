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
