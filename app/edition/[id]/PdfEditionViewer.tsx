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
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

type PageSize = { width: number; height: number };
type Point = { x: number; y: number };
type ZoomAnchor = Point & {
  element: HTMLElement;
  clientX: number;
  clientY: number;
};
type GestureEvent = Event & {
  clientX: number;
  clientY: number;
  scale: number;
};
type PdfState =
  | { status: "loading" }
  | { status: "ready"; pdf: PDFDocumentProxy; pageSizes: PageSize[] }
  | { status: "error" };

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const RENDER_DELAY_MS = 400;
const MAX_PAGE_WIDTH = 960;
const MAX_RENDERED_PAGE_WIDTH = 6000;
const PAGE_GUTTER = 16;
const RENDER_BUFFER_PX = 3000;
const TOOLBAR_TOP = "max(0.75rem, env(safe-area-inset-top))";
const TOOLBAR_RIGHT = "max(0.75rem, env(safe-area-inset-right))";
const CONTENT_TOP = `calc(${TOOLBAR_TOP} + 3.25rem)`;
const CONTENT_BOTTOM = "max(1rem, env(safe-area-inset-bottom))";

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function requestedPageFromHash() {
  const match = /^#page=([1-9]\d*)$/.exec(window.location.hash);
  const page = Number(match?.[1]);
  return Number.isSafeInteger(page) ? page : null;
}

function ViewerMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center gap-3 p-6 text-center">
      {children}
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  pageSize,
  pageHeight,
  zoom,
  renderZoom,
  canRender,
  onFirstRender,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  pageSize: PageSize;
  pageHeight: number;
  zoom: number;
  renderZoom: number;
  canRender: boolean;
  onFirstRender?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstCanvasRef = useRef<HTMLCanvasElement>(null);
  const secondCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef(0);
  const hasRenderedRef = useRef(false);
  const [isNearViewport, setIsNearViewport] = useState(
    () => pageNumber === 1 || typeof IntersectionObserver === "undefined",
  );
  const [hasRendered, setHasRendered] = useState(false);
  const [hasError, setHasError] = useState(false);

  const pageRatio = pageSize.width / pageSize.height;
  const layoutHeight = Math.max(1, Math.floor(pageHeight * zoom));
  const layoutWidth = Math.max(1, Math.floor(layoutHeight * pageRatio));
  const shouldRender = canRender && isNearViewport;

  useEffect(() => {
    const container = containerRef.current;
    if (
      !container ||
      isNearViewport ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      {
        root: container.closest<HTMLElement>("[data-pdf-scroller]"),
        rootMargin: `${RENDER_BUFFER_PX}px 0px`,
      },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isNearViewport]);

  useEffect(() => {
    if (!shouldRender) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;

    async function renderPage() {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const canvasRefs = [firstCanvasRef, secondCanvasRef];
      const currentCanvas = activeCanvasRef.current;
      const nextCanvas = hasRenderedRef.current ? 1 - currentCanvas : 0;
      const canvas = canvasRefs[nextCanvas].current;
      if (!canvas) return;

      const scale = (pageHeight * renderZoom) / pageSize.height;
      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.max(
        1,
        Math.min(
          window.devicePixelRatio || 1,
          MAX_RENDERED_PAGE_WIDTH / Math.max(1, viewport.width),
        ),
      );

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.visibility = "hidden";

      renderTask = page.render({
        canvas,
        viewport,
        transform:
          pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      await renderTask.promise;
      if (cancelled) return;

      if (hasRenderedRef.current) {
        const previousCanvas = canvasRefs[currentCanvas].current;
        if (previousCanvas) previousCanvas.style.visibility = "hidden";
      }
      canvas.style.visibility = "visible";
      activeCanvasRef.current = nextCanvas;
      hasRenderedRef.current = true;
      setHasRendered(true);
      setHasError(false);
      onFirstRender?.();
    }

    void renderPage().catch((error: unknown) => {
      if (
        cancelled ||
        (error instanceof Error && error.name === "RenderingCancelledException")
      ) {
        return;
      }
      setHasError(true);
      onFirstRender?.();
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [
    onFirstRender,
    pageHeight,
    pageNumber,
    pageSize.height,
    pdf,
    renderZoom,
    shouldRender,
  ]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      data-pdf-page={pageNumber}
      role="group"
      aria-label={`Side ${pageNumber}`}
      className="relative shrink-0 overflow-hidden bg-white shadow-lg"
      style={{
        height: layoutHeight,
        width: layoutWidth,
        scrollMarginTop: CONTENT_TOP,
      }}
    >
      {shouldRender && !hasRendered && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {hasError && !hasRendered && (
        <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-danger">
          Kunne ikke vise side {pageNumber}.
        </p>
      )}
      <canvas
        ref={firstCanvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ visibility: "hidden" }}
      />
      <canvas
        ref={secondCanvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ visibility: "hidden" }}
      />
    </div>
  );
}

function usePdf(url: string): PdfState {
  const [state, setState] = useState<PdfState>({ status: "loading" });

  useEffect(() => {
    let disposed = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    async function load() {
      setState({ status: "loading" });

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument({
          url,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          iccUrl: "/pdfjs/iccs/",
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
        });

        const pdf = await loadingTask.promise;
        const pageSizes = await Promise.all(
          Array.from({ length: pdf.numPages }, async (_, index) => {
            const page = await pdf.getPage(index + 1);
            const viewport = page.getViewport({ scale: 1 });
            return { width: viewport.width, height: viewport.height };
          }),
        );

        if (!disposed) setState({ status: "ready", pdf, pageSizes });
      } catch {
        if (!disposed) setState({ status: "error" });
      }
    }

    void load();
    return () => {
      disposed = true;
      void loadingTask?.destroy();
    };
  }, [url]);

  return state;
}

export default function PdfEditionViewer({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const zoomAnchorRef = useRef<ZoomAnchor | null>(null);
  const gestureActiveRef = useRef(false);
  const pdfState = usePdf(url);
  const [viewportWidth, setViewportWidth] = useState(320);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [renderZoom, setRenderZoom] = useState(1);
  const [firstPageRendered, setFirstPageRendered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const handleFirstPageRender = useCallback(
    () => setFirstPageRendered(true),
    [],
  );

  const pageSizes = pdfState.status === "ready" ? pdfState.pageSizes : [];

  const captureZoomAnchor = useCallback((point?: Point) => {
    const scroller = scrollerRef.current;
    const pdfDocument = documentRef.current;
    if (!scroller || !pdfDocument) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const clientX = point?.x ?? scrollerRect.left + scrollerRect.width / 2;
    const clientY = point?.y ?? scrollerRect.top + scrollerRect.height / 3;
    const page = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-pdf-page]");
    const element = page ?? pdfDocument;
    const rect = element.getBoundingClientRect();

    zoomAnchorRef.current = {
      element,
      clientX,
      clientY,
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const updateZoom = useCallback(
    (value: number, point?: Point) => {
      const nextZoom = clampZoom(value);
      if (nextZoom === zoomRef.current) return;

      captureZoomAnchor(point);
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    },
    [captureZoomAnchor],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const measure = () => {
      const width = Math.max(1, Math.floor(scroller.clientWidth));
      setViewportWidth((current) => {
        if (current === width) return current;
        captureZoomAnchor();
        return width;
      });
    };
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [captureZoomAnchor]);

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
      RENDER_DELAY_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [zoom]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame: number | null = null;
    let pendingZoom = zoomRef.current;
    let pointer = { x: 0, y: 0 };

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (gestureActiveRef.current) return;

      if (Math.abs(event.deltaX) > 0.1) {
        scroller.scrollLeft += event.deltaX;
      }
      if (!event.deltaY) return;

      if (frame === null) pendingZoom = zoomRef.current;
      const delta =
        event.deltaMode === 0
          ? Math.min(20, Math.max(-20, event.deltaY))
          : Math.sign(event.deltaY) * 10;
      pendingZoom = clampZoom(pendingZoom * Math.exp(-delta / 100));
      pointer = { x: event.clientX, y: event.clientY };

      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateZoom(pendingZoom, pointer);
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
    let previousPoint: Point | null = null;
    const eventPoint = (event: GestureEvent): Point => {
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
      const event = rawEvent as GestureEvent;
      event.preventDefault();
      gestureActiveRef.current = true;
      startZoom = zoomRef.current;
      previousPoint = eventPoint(event);
    };
    const handleGestureChange = (rawEvent: Event) => {
      const event = rawEvent as GestureEvent;
      event.preventDefault();
      const point = eventPoint(event);

      if (previousPoint) {
        scroller.scrollBy(previousPoint.x - point.x, previousPoint.y - point.y);
      }
      previousPoint = point;
      if (Number.isFinite(event.scale)) {
        updateZoom(startZoom * event.scale, point);
      }
    };
    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      gestureActiveRef.current = false;
      previousPoint = null;
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
      const requestedPage = requestedPageFromHash();
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
      if (frame === null) {
        frame = window.requestAnimationFrame(updateCurrentPage);
      }
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

  const downloadPdf = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not fetch PDF");

      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setDownloadError("Kunne ikke laste ned PDF-en.");
    } finally {
      setIsDownloading(false);
    }
  }, [filename, isDownloading, url]);

  function scrollToPage(page: number) {
    window.history.replaceState(window.history.state, "", `#page=${page}`);
    document.getElementById(`pdf-page-${page}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "center",
    });
  }

  function submitPageInput(value: string) {
    const page = Number(value);
    if (!Number.isFinite(page) || !pageSizes.length) return;
    scrollToPage(Math.min(pageSizes.length, Math.max(1, Math.trunc(page))));
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
      style={{ overflowAnchor: "none", touchAction: "pan-x pan-y" }}
    >
      <div
        role="group"
        aria-label="PDF-kontroller"
        className="pointer-events-none fixed left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2"
        style={{ top: TOOLBAR_TOP }}
      >
        <label
          htmlFor="pdf-page-number"
          className="pointer-events-auto flex h-9 cursor-text items-center whitespace-nowrap rounded-full bg-default px-2 text-sm tabular-nums shadow-lg transition-colors focus-within:bg-default-hover md:h-8"
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
          <span className="mr-1 min-w-4 text-left">
            {pageSizes.length || "–"}
          </span>
        </label>

        <ButtonGroup
          size="sm"
          variant="tertiary"
          className="pointer-events-auto gap-0 overflow-hidden rounded-full bg-default shadow-lg"
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
          size="sm"
          variant="tertiary"
          className="pointer-events-auto bg-default shadow-lg"
          aria-label="Last ned PDF"
          isPending={isDownloading}
          onPress={() => void downloadPdf()}
        >
          <ArrowDownToLine />
        </Button>
      </div>

      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        className="fixed z-[60] bg-default shadow-lg"
        style={{ top: TOOLBAR_TOP, right: TOOLBAR_RIGHT }}
        aria-label="Lukk fane"
        onPress={() => window.close()}
      >
        <Xmark />
      </Button>

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
        {pdfState.status === "loading" && (
          <ViewerMessage>
            <Spinner size="lg" />
            <span role="status">Laster PDF …</span>
          </ViewerMessage>
        )}
        {pdfState.status === "error" && (
          <ViewerMessage>
            <p role="alert">Kunne ikke vise PDF-en.</p>
          </ViewerMessage>
        )}
        {pdfState.status === "ready" && (
          <div className="flex flex-col items-center gap-4">
            {pdfState.pageSizes.map((pageSize, index) => {
              const pageNumber = index + 1;
              return (
                <PdfPage
                  key={pageNumber}
                  pdf={pdfState.pdf}
                  pageNumber={pageNumber}
                  pageSize={pageSize}
                  pageHeight={pageHeight}
                  zoom={zoom}
                  renderZoom={renderZoom}
                  canRender={pageNumber === 1 || firstPageRendered}
                  onFirstRender={
                    pageNumber === 1 ? handleFirstPageRender : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
