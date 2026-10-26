"use client";

function pageHash() {
  const match = /^#page=([1-9]\d*)$/.exec(window.location.hash);
  return match ? `#page=${match[1]}` : "";
}

export default function PdfEditionViewer({ url }: { url: string }) {
  const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}${pageHash()}`;

  return (
    <iframe
      src={viewerUrl}
      title="PDF-visning"
      className="fixed inset-0 z-50 h-full w-full border-0 bg-[#2b2a33]"
      allow="clipboard-write; fullscreen"
      allowFullScreen
    />
  );
}
