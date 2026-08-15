"use client";

import { useEffect, useState } from "react";
import { ArticleForm } from "../_components/ArticleForm";

import {
  getArticleByID,
  updateArticle,
} from "../../../../lib/Firebase/client/api";
import { IEditArticle } from "../../../../lib/types";

import { Spinner } from "@heroui/react";
import { ROUTES } from "../../../../utils/routes";
import PageHeader from "@/components/PageHeader";
import { useRouter } from "next/navigation";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [article, setArticle] = useState<IEditArticle>();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isSubscribed = true;
    const fetchData = async () => {
      const { id } = await params;
      const article = await getArticleByID(id as string);

      if (!article && isSubscribed) {
        router.push(ROUTES.ARTICLE_LIST);
        return;
      }

      const [editionYear, editionNumber] = article.edition.split("-");
      const editArticle: IEditArticle = {
        ...article,
        editionYear: Number(editionYear),
        editionNumber: Number(editionNumber),
        pages: article.pages.join(", "),
      };
      if (isSubscribed) {
        setArticle(editArticle);
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      isSubscribed = false;
    };
  }, [params, router]);

  return (
    <div className="flex flex-col items-left gap-5 max-w-[500px] w-full mx-auto">
      <PageHeader
        title="Oppdater artikkel"
        backButtonRoute={ROUTES.ARTICLE_LIST}
      />
      {loading ? (
        <Spinner size="lg" />
      ) : (
        <ArticleForm
          article={article}
          doHandleSubmit={(values, { setStatus, setSubmitting }) => {
            updateArticle(
              values,
              article?.id as string,
              () => {
                setSubmitting(false);
                setStatus({ success: true });
              },
              () => {
                setSubmitting(false);
                setStatus({ error: true });
              },
            );
          }}
        />
      )}
    </div>
  );
}
