import assert from "node:assert/strict";
import test from "node:test";
import {
  getEditionStoragePaths,
  resolveEditionAccess,
} from "../utils/editions.ts";

const available = (version) => ({ outcome: "available", version });

test("edition access policy implements the complete request matrix", () => {
  const cases = [
    ["auto", true, true, available("original")],
    ["auto", true, false, available("original")],
    ["auto", false, true, available("public")],
    ["auto", false, false, available("original")],
    ["public", true, true, available("public")],
    ["public", false, true, available("public")],
    ["public", true, false, { outcome: "public-not-found" }],
    ["public", false, false, { outcome: "public-not-found" }],
    ["original", true, true, available("original")],
    ["original", true, false, available("original")],
    ["original", false, true, { outcome: "authentication-required" }],
    ["original", false, false, available("original")],
  ];

  for (const [request, signedIn, hasPublic, expected] of cases) {
    assert.deepEqual(
      resolveEditionAccess(request, signedIn, hasPublic),
      expected,
      `${request}, signedIn=${signedIn}, hasPublic=${hasPublic}`,
    );
  }
});

test("edition storage paths distinguish the public PDF", () => {
  assert.deepEqual(getEditionStoragePaths("2020-05"), {
    originalPdf: "pdf/2020/2020-05.pdf",
    publicPdf: "pdf_public/2020/2020-05_public.pdf",
    thumbnail: "images/2020/2020-05.jpg",
  });
});
