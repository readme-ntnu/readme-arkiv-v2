"use client";

import { BookOpen, FileText, Gear } from "@gravity-ui/icons";
import { Tabs } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ROUTES } from "utils/routes";

export function AdminNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const currentTab = useMemo(() => {
    if (pathname.includes(ROUTES.ARTICLE_LIST)) return ROUTES.ARTICLE_LIST;
    if (pathname.includes(ROUTES.EDITION_LIST)) return ROUTES.EDITION_LIST;
    return pathname;
  }, [pathname]);

  return (
    <div className="max-w-[1200px] w-full">
      <Tabs
        className="w-full mb-3"
        variant="secondary"
        selectedKey={currentTab}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            <Tabs.Tab
              href={ROUTES.EDITION_LIST}
              id={ROUTES.EDITION_LIST}
              render={(domProps: any) => <Link {...domProps} />}
              className="w-[130px]"
            >
              <BookOpen className="mr-2" />
              Utgaver
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab
              href={ROUTES.ARTICLE_LIST}
              id={ROUTES.ARTICLE_LIST}
              render={(domProps: any) => <Link {...domProps} />}
              className="w-[130px]"
            >
              <FileText className="mr-2" />
              Artikler
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab
              href={ROUTES.SETTINGS}
              id={ROUTES.SETTINGS}
              render={(domProps: any) => <Link {...domProps} />}
              className="w-[130px]"
            >
              <Gear className="mr-2" />
              Instillinger
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      {children}
    </div>
  );
}
