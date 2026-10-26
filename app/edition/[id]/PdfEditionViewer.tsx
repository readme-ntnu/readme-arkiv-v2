"use client";

import {
  ArrowDownToLine,
  MagnifierMinus,
  MagnifierPlus,
  Xmark,
} from "@gravity-ui/icons";
import { Button, ButtonGroup, Spinner } from "@heroui/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const PDF_OPTIONS = {
  wasmUrl: "/wasm/",
};

type PageSize = {
  width: number;
  height: number;
};

type ZoomPoint = {
  x: number;
  y: number;
};

type ZoomAnchor = ZoomPoint & {
  element: HTMLElement;
  clientX: number;
  clientY: number;
};

type SafariGestureEvent = Event & {
  clientX: number;
  clientY: number;
  scale: number;
};

type PdfEditionViewerProps = {
  url: string;
  filename: string;
  onDownload: () => Promise<{
    url: string;
    requiresClientDownload: boolean;
  }>;
};

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.25;
const RENDER_DEBOUNCE_MS = 600;
const MAX_PAGE_WIDTH = 960;
const MAX_RENDERED_PAGE_WIDTH = 6000;
const PAGE_GUTTER = 16;
const PAGE_RENDER_BUFFER_PX = 3000;
const TOOLBAR_TOP = "max(0.75rem, env(safe-area-inset-top))";
const TOOLBAR_RIGHT = "max(0.75rem, env(safe-area-inset-right))";
const CONTENT_TOP = `calc(${TOOLBAR_TOP} + 3.25rem)`;
const CONTENT_BOTTOM = "max(1rem, env(safe-area-inset-bottom))";

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function pageFromHash() {
  const match = /^#page=([1-9]\d*)$/.exec(window.location.hash);
  const page = Number(match?.[1]);
  return Number.isSafeInteger(page) ? page : null;
}

function PdfMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center gap-3 p-6 text-center">
      {children}
    </div>
  );
}

function PdfPage({
  pageNumber,
  pageSize,
  pageHeight,
  zoom,
  renderZoom,
}: {
  pageNumber: number;
  pageSize: PageSize;
  pageHeight: number;
  zoom: number;
  renderZoom: number;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const targetRenderZoomRef = useRef(renderZoom);
  const [isNearViewport, setIsNearViewport] = useState(
    () => pageNumber === 1 || !("IntersectionObserver" in window),
  );
  const [isVisible, setIsVisible] = useState(
    () => pageNumber === 1 || !("IntersectionObserver" in window),
  );
  const [activeRenderZoom, setActiveRenderZoom] = useState(renderZoom);

  const layoutHeight = Math.max(1, Math.floor(pageHeight * zoom));
  const pageRatio = pageSize.width / pageSize.height;
  const pageWidth = Math.max(1, Math.floor(pageHeight * zoom * pageRatio));
  const pageBaseWidth = pageHeight * pageRatio;
  const renderScales =
    isVisible && activeRenderZoom !== renderZoom
      ? [activeRenderZoom, renderZoom]
      : [renderZoom];

  useLayoutEffect(() => {
    targetRenderZoomRef.current = renderZoom;
  }, [renderZoom]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || !("IntersectionObserver" in window)) return;
    const scrollRoot = page.closest<HTMLDivElement>("[data-pdf-scroller]");

    const bufferObserver = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      {
        root: scrollRoot,
        rootMargin: `${PAGE_RENDER_BUFFER_PX}px 0px`,
      },
    );
    const viewportObserver = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { root: scrollRoot },
    );

    bufferObserver.observe(page);
    viewportObserver.observe(page);
    return () => {
      bufferObserver.disconnect();
      viewportObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={pageRef}
      id={`pdf-page-${pageNumber}`}
      data-pdf-page={pageNumber}
      role="group"
      className="relative overflow-hidden bg-white shadow-lg"
      style={{
        height: layoutHeight,
        width: pageWidth,
        scrollMarginTop: CONTENT_TOP,
      }}
      aria-label={`Side ${pageNumber}`}
    >
      {isNearViewport &&
        renderScales.map((scale) => {
          const isActive = scale === activeRenderZoom;
          const pixelRatio = Math.max(
            1,
            Math.min(
              window.devicePixelRatio || 1,
              MAX_RENDERED_PAGE_WIDTH /
                (Math.max(pageBaseWidth, pageHeight) * scale),
            ),
          );

          return (
            <div
              key={scale}
              aria-hidden={!isActive}
              className="absolute left-0 top-0"
              style={{
                pointerEvents: isActive ? "auto" : "none",
                transform: `scale(${zoom / scale})`,
                transformOrigin: "top left",
                visibility: isActive ? "visible" : "hidden",
              }}
            >
              <Page
                _enableRegisterUnregisterPage={false}
                pageNumber={pageNumber}
                height={pageHeight}
                scale={scale}
                devicePixelRatio={pixelRatio}
                renderAnnotationLayer={isActive}
                renderTextLayer={isActive}
                onRenderSuccess={() => {
                  if (scale === targetRenderZoomRef.current) {
                    setActiveRenderZoom(scale);
                  }
                }}
                className="overflow-hidden bg-white"
                loading={
                  <div
                    className="flex items-center justify-center bg-white"
                    style={{
                      height: Math.max(1, Math.floor(pageHeight * scale)),
                    }}
                  >
                    <Spinner />
                  </div>
                }
              />
            </div>
          );
        })}
    </div>
  );
}

export default function PdfEditionViewer({
  url,
  filename,
  onDownload,
}: PdfEditionViewerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const zoomAnchorRef = useRef<ZoomAnchor | null>(null);
  const measuredWidthRef = useRef(320);
  const gestureActiveRef = useRef(false);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [viewportWidth, setViewportWidth] = useState(320);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [renderZoom, setRenderZoom] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pageError, setPageError] = useState(false);

  const closeViewer = useCallback(() => window.close(), []);

  const downloadPdf = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const download = await onDownload();
      let downloadUrl = download.url;
      let objectUrl: string | null = null;

      if (download.requiresClientDownload) {
        const response = await fetch(download.url);
        if (!response.ok) throw new Error("Could not fetch PDF");
        objectUrl = URL.createObjectURL(await response.blob());
        downloadUrl = objectUrl;
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      if (objectUrl) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    } catch {
      setDownloadError("Kunne ikke laste ned PDF-en.");
    } finally {
      setIsDownloading(false);
    }
  }, [filename, isDownloading, onDownload]);

  const captureAnchor = useCallback((point?: ZoomPoint) => {
    const scroller = scrollerRef.current;
    const documentElement = documentRef.current;
    if (!scroller || !documentElement) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const clientX = point?.x ?? scrollerRect.left + scrollerRect.width / 2;
    const clientY = point?.y ?? scrollerRect.top + scrollerRect.height / 3;
    const page = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-pdf-page]");
    const element = page ?? documentElement;
    const elementRect = element.getBoundingClientRect();

    zoomAnchorRef.current = {
      element,
      clientX,
      clientY,
      x: Math.min(
        1,
        Math.max(0, (clientX - elementRect.left) / elementRect.width),
      ),
      y: Math.min(
        1,
        Math.max(0, (clientY - elementRect.top) / elementRect.height),
      ),
    };
  }, []);

  const updateZoom = useCallback(
    (value: number, point?: ZoomPoint) => {
      const nextZoom = clampZoom(value);
      if (nextZoom === zoomRef.current) return;

      captureAnchor(point);

      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    },
    [captureAnchor],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const measure = () => {
      const width = Math.max(1, Math.floor(scroller.clientWidth));
      if (width === measuredWidthRef.current) return;

      captureAnchor();
      measuredWidthRef.current = width;
      setViewportWidth(width);
    };
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [captureAnchor]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const anchor = zoomAnchorRef.current;
    if (!scroller || !anchor) return;

    const rect = anchor.element.getBoundingClientRect();
    scroller.scrollBy(
      rect.left + rect.width * anchor.x - anchor.clientX,
      rect.top + rect.height * anchor.y - anchor.clientY,
    );
    zoomAnchorRef.current = null;
  }, [viewportWidth, zoom]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setRenderZoom(zoom),
      RENDER_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [zoom]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame: number | null = null;
    let pendingZoom = zoomRef.current;
    let pendingClientX = 0;
    let pendingClientY = 0;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (!event.deltaY || gestureActiveRef.current) return;

      if (frame === null) pendingZoom = zoomRef.current;
      const delta =
        event.deltaMode === 0
          ? Math.min(20, Math.max(-20, event.deltaY))
          : Math.sign(event.deltaY) * 10;
      pendingZoom = clampZoom(pendingZoom * Math.exp(-delta / 100));
      pendingClientX = event.clientX;
      pendingClientY = event.clientY;

      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateZoom(pendingZoom, {
          x: pendingClientX,
          y: pendingClientY,
        });
      });
    };

    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      scroller.removeEventListener("wheel", handleWheel);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [updateZoom]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let startZoom = zoomRef.current;
    const pointFromEvent = (event: SafariGestureEvent) => {
      const rect = scroller.getBoundingClientRect();
      return {
        x: Number.isFinite(event.clientX)
          ? event.clientX
          : rect.left + rect.width / 2,
        y: Number.isFinite(event.clientY)
          ? event.clientY
          : rect.top + rect.height / 3,
      };
    };
    const handleGestureStart = (rawEvent: Event) => {
      const event = rawEvent as SafariGestureEvent;
      event.preventDefault();
      gestureActiveRef.current = true;
      startZoom = zoomRef.current;
    };
    const handleGestureChange = (rawEvent: Event) => {
      const event = rawEvent as SafariGestureEvent;
      event.preventDefault();
      if (!Number.isFinite(event.scale)) return;
      updateZoom(startZoom * event.scale, pointFromEvent(event));
    };
    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      gestureActiveRef.current = false;
    };

    scroller.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    scroller.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });
    scroller.addEventListener("gestureend", handleGestureEnd, {
      passive: false,
    });
    return () => {
      scroller.removeEventListener("gesturestart", handleGestureStart);
      scroller.removeEventListener("gesturechange", handleGestureChange);
      scroller.removeEventListener("gestureend", handleGestureEnd);
      gestureActiveRef.current = false;
    };
  }, [updateZoom]);

  useEffect(() => {
    if (!pageSizes.length) return;

    const scrollToHash = () => {
      const requestedPage = pageFromHash();
      if (!requestedPage) return;

      const page = Math.min(requestedPage, pageSizes.length);
      if (page !== requestedPage) {
        window.history.replaceState(window.history.state, "", `#page=${page}`);
      }
      document
        .getElementById(`pdf-page-${page}`)
        ?.scrollIntoView({ block: "start", inline: "center" });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [pageSizes.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !pageSizes.length) return;

    let frame: number | null = null;
    const updateCurrentPage = () => {
      frame = null;
      const viewport = scroller.getBoundingClientRect();
      const readingLine = viewport.top + viewport.height / 3;
      let nextPage = 1;
      let nearestDistance = Number.POSITIVE_INFINITY;

      scroller
        .querySelectorAll<HTMLElement>("[data-pdf-page]")
        .forEach((page) => {
          const rect = page.getBoundingClientRect();
          const distance =
            readingLine < rect.top
              ? rect.top - readingLine
              : readingLine > rect.bottom
                ? readingLine - rect.bottom
                : 0;

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nextPage = Number(page.dataset.pdfPage);
          }
        });

      setCurrentPage((current) => (current === nextPage ? current : nextPage));
    };
    const scheduleUpdate = () => {
      if (frame === null)
        frame = window.requestAnimationFrame(updateCurrentPage);
    };

    scheduleUpdate();
    scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      scroller.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [pageSizes.length, viewportWidth, zoom]);

  function scrollToPage(page: number) {
    window.history.replaceState(window.history.state, "", `#page=${page}`);
    document.getElementById(`pdf-page-${page}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "center",
    });
  }

  function submitPageInput(value: string) {
    const requestedPage = Number(value);
    if (!Number.isFinite(requestedPage) || !pageSizes.length) return;

    const page = Math.min(
      pageSizes.length,
      Math.max(1, Math.trunc(requestedPage)),
    );
    scrollToPage(page);
  }

  const widestPageRatio = pageSizes.length
    ? Math.max(...pageSizes.map(({ width, height }) => width / height))
    : 1;
  const fittedPageWidth = Math.max(
    1,
    Math.min(MAX_PAGE_WIDTH, viewportWidth - PAGE_GUTTER * 2),
  );
  const pageHeight = Math.max(1, fittedPageWidth / widestPageRatio);
  const documentWidth = Math.max(
    viewportWidth,
    fittedPageWidth * zoom + PAGE_GUTTER * 2,
  );
  return (
    <div
      ref={scrollerRef}
      data-pdf-scroller
      className="fixed inset-0 z-50 overflow-auto overscroll-contain bg-background"
      style={{ overflowAnchor: "none" }}
    >
      <div
        className="pointer-events-none fixed left-1/2 z-[60] -translate-x-1/2"
        style={{ top: TOOLBAR_TOP }}
      >
        <div
          role="group"
          aria-label="PDF-kontroller"
          className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-full bg-background p-1 shadow-lg"
        >
          <label
            htmlFor="pdf-page-number"
            className="flex h-9 cursor-text items-center whitespace-nowrap rounded-full bg-default px-2 text-sm tabular-nums transition-colors focus-within:bg-default-hover"
          >
            <input
              id="pdf-page-number"
              type="number"
              min={1}
              max={pageSizes.length || 1}
              step={1}
              inputMode="numeric"
              aria-label="Gå til side"
              disabled={!pageSizes.length}
              value={pageInput ?? (pageSizes.length ? String(currentPage) : "")}
              onFocus={(event) => {
                setPageInput(String(currentPage));
                event.currentTarget.select();
              }}
              onChange={(event) => setPageInput(event.currentTarget.value)}
              onBlur={(event) => {
                submitPageInput(event.currentTarget.value);
                setPageInput(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="h-full w-5 bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span aria-hidden="true" className="px-1 text-foreground-500">
              /
            </span>
            <span
              className="min-w-4 text-left mr-1"
              aria-label={
                pageSizes.length
                  ? `${pageSizes.length} sider totalt`
                  : "Laster sidetall"
              }
            >
              {pageSizes.length || "–"}
            </span>
          </label>
          <ButtonGroup
            variant="tertiary"
            className="overflow-hidden rounded-full bg-default"
          >
            <Button
              isIconOnly
              aria-label="Zoom ut"
              isDisabled={!pageSizes.length || zoom <= MIN_ZOOM}
              onPress={() => updateZoom(zoomRef.current - ZOOM_STEP)}
            >
              <MagnifierMinus />
            </Button>
            <Button
              className="min-w-16 tabular-nums"
              aria-label={`Tilpass til bredden, nå ${Math.round(zoom * 100)} prosent`}
              isDisabled={!pageSizes.length}
              onPress={() => updateZoom(1)}
            >
              <ButtonGroup.Separator />
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              isIconOnly
              aria-label="Zoom inn"
              isDisabled={!pageSizes.length || zoom >= MAX_ZOOM}
              onPress={() => updateZoom(zoomRef.current + ZOOM_STEP)}
            >
              <ButtonGroup.Separator />
              <MagnifierPlus />
            </Button>
          </ButtonGroup>
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Last ned PDF"
            isPending={isDownloading}
            onPress={() => void downloadPdf()}
          >
            <ArrowDownToLine />
          </Button>
        </div>
      </div>

      <div
        className="pointer-events-auto fixed z-[60] rounded-full bg-background p-1 shadow-lg"
        style={{ top: TOOLBAR_TOP, right: TOOLBAR_RIGHT }}
      >
        <Button
          isIconOnly
          variant="tertiary"
          aria-label="Lukk fane"
          onPress={closeViewer}
        >
          <Xmark />
        </Button>
      </div>

      {downloadError && (
        <p
          role="alert"
          className="fixed left-1/2 z-[60] -translate-x-1/2 rounded-full bg-background px-4 py-2 text-sm shadow-lg"
          style={{ top: CONTENT_TOP }}
        >
          {downloadError}
        </p>
      )}

      <div
        ref={documentRef}
        className="min-h-full max-w-none"
        style={{
          width: documentWidth,
          paddingTop: CONTENT_TOP,
          paddingBottom: CONTENT_BOTTOM,
        }}
      >
        <Document
          file={url}
          options={PDF_OPTIONS}
          suspense={false}
          className="flex flex-col items-center gap-4"
          onItemClick={({ pageNumber }) => scrollToPage(pageNumber)}
          onLoadSuccess={async (pdf) => {
            try {
              const sizes = await Promise.all(
                Array.from({ length: pdf.numPages }, async (_, index) => {
                  const page = await pdf.getPage(index + 1);
                  const { width, height } = page.getViewport({ scale: 1 });
                  return { width, height };
                }),
              );
              setPageSizes(sizes);
            } catch {
              setPageError(true);
            }
          }}
          loading={
            <PdfMessage>
              <Spinner size="lg" />
              <span role="status">Laster PDF …</span>
            </PdfMessage>
          }
          error={
            <PdfMessage>
              <p role="alert">Kunne ikke vise PDF-en.</p>
            </PdfMessage>
          }
        >
          {pageError ? (
            <PdfMessage>
              <p role="alert">Kunne ikke vise PDF-en.</p>
            </PdfMessage>
          ) : (
            pageSizes.map((size, index) => {
              const pageNumber = index + 1;

              return (
                <PdfPage
                  key={pageNumber}
                  pageNumber={pageNumber}
                  pageSize={size}
                  pageHeight={pageHeight}
                  zoom={zoom}
                  renderZoom={renderZoom}
                />
              );
            })
          )}
        </Document>
      </div>
    </div>
  );
}
