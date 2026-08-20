import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the MenuMate mobile prototype", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MenuMate/);
  assert.match(html, /낯선 메뉴도/);
  assert.match(html, /메뉴판 촬영하기/);
  assert.match(html, /땅콩 알레르기/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview/);
});

test("keeps mock data separate from the interactive screen", async () => {
  const [page, mockData, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/mock-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /from "\.\/mock-data"/);
  assert.match(page, /accept="image\/\*"/);
  assert.match(page, /capture="environment"/);
  assert.match(page, /startDummyAnalysis/);
  assert.match(mockData, /totalPrice:\s*3400/);
  assert.match(mockData, /risk:\s*"danger"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
