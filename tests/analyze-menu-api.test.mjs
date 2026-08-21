import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function imageRequest() {
  const formData = new FormData();
  formData.append(
    "image",
    new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
      type: "image/jpeg",
    }),
    "menu.jpg",
  );
  return new Request("http://localhost/api/analyze-menu", {
    method: "POST",
    body: formData,
  });
}

test("returns a clear error when GEMINI_API_KEY is missing", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(imageRequest(), {}, {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Gemini API Key가 설정되지 않았습니다. 관리자에게 문의해주세요.",
  });
});

test("sends the image to the Gemini Interactions API and returns structured menus", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  let upstreamRequest;

  const analysis = {
    success: true,
    detected_language: "ja",
    restaurant_context: null,
    warnings: ["알레르기 정보는 사진 기반 AI 추정입니다."],
    menus: [
      {
        original_name: "醤油ラーメン",
        korean_name: "쇼유 라멘",
        original_description: null,
        korean_description: "간장 맛 육수를 사용하는 일본식 라멘입니다.",
        price: 900,
        currency: "JPY",
        ingredients: ["면", "간장 육수"],
        allergens: ["밀", "대두"],
        spicy_level: "unknown",
        category: "noodle",
        confidence: 0.94,
        warning: "알레르기와 교차오염 여부를 직원에게 확인하세요.",
      },
    ],
  };

  const structuredOutput = JSON.stringify(analysis);
  const splitAt = Math.floor(structuredOutput.length / 2);

  globalThis.fetch = async (input, init) => {
    upstreamRequest = { input, init };
    return Response.json({
      status: "completed",
      steps: [
        {
          type: "user_input",
          content: [{ type: "text", text: "이 내용은 결과가 아닙니다." }],
        },
        {
          type: "model_output",
          content: [
            { type: "text", text: structuredOutput.slice(0, splitAt) },
            { type: "text", text: structuredOutput.slice(splitAt) },
          ],
        },
      ],
    });
  };

  try {
    const response = await worker.fetch(
      imageRequest(),
      { GEMINI_API_KEY: "test-only-key" },
      {},
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), analysis);

    assert.equal(
      upstreamRequest.input,
      "https://generativelanguage.googleapis.com/v1beta/interactions",
    );
    assert.equal(upstreamRequest.init.headers["x-goog-api-key"], "test-only-key");
    const body = JSON.parse(upstreamRequest.init.body);
    assert.equal(body.model, "gemini-3.5-flash-lite");
    assert.equal(body.response_format.mime_type, "application/json");
    assert.equal(body.input[1].type, "image");
    assert.equal(body.input[1].mime_type, "image/jpeg");
    assert.match(body.input[1].data, /^[A-Za-z0-9+/]+=*$/);
    assert.doesNotMatch(upstreamRequest.init.body, /test-only-key/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test(
  "calls the real Gemini API only when GEMINI_API_KEY is present",
  { skip: !process.env.GEMINI_API_KEY },
  async () => {
    const worker = await loadWorker();
    const formData = new FormData();
    const onePixelPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2VQAAAABJRU5ErkJggg==",
      "base64",
    );
    formData.append(
      "image",
      new Blob([onePixelPng], { type: "image/png" }),
      "not-a-menu.png",
    );

    const response = await worker.fetch(
      new Request("http://localhost/api/analyze-menu", {
        method: "POST",
        body: formData,
      }),
      { GEMINI_API_KEY: process.env.GEMINI_API_KEY },
      {},
    );
    const payload = await response.json();

    assert.notEqual(response.status, 503);
    assert.equal(typeof payload.success, "boolean");
  },
);
