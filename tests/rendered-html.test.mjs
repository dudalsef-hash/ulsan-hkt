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
  assert.match(html, /카메라로 촬영하기/);
  assert.match(html, /땅콩 알레르기/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview/);
});

test("connects the mobile image inputs to the server analysis endpoint", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /accept="image\/\*"/);
  assert.match(page, /capture="environment"/);
  assert.match(page, /fetch\("\/api\/analyze-menu"/);
  assert.doesNotMatch(page, /DUMMY|startDummyAnalysis|from "\.\/mock-data"/);
  assert.doesNotMatch(css, /dummy-notice/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
