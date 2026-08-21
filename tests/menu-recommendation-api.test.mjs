import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function menu(overrides) {
  return {
    original_name: "メニュー",
    korean_name: "메뉴",
    original_description: null,
    korean_description: "테스트 메뉴입니다.",
    price: 700,
    currency: "JPY",
    ingredients: [],
    allergens: [],
    spicy_level: "none",
    category: "other",
    confidence: 0.95,
    warning: null,
    ...overrides,
  };
}

const menus = [
  menu({
    original_name: "海老ラーメン",
    korean_name: "새우 라멘",
    price: 1_000,
    ingredients: ["면", "새우"],
    allergens: ["갑각류", "밀"],
    category: "seafood",
  }),
  menu({ original_name: "うどん", korean_name: "유부 우동", price: 700, category: "noodle" }),
  menu({ original_name: "カツ丼", korean_name: "가츠동", price: 900, category: "rice" }),
  menu({ original_name: "醤油ラーメン", korean_name: "간장 라멘", price: 850, category: "noodle" }),
  menu({ original_name: "餃子", korean_name: "교자", price: 450, category: "side" }),
  menu({ original_name: "本日の料理", korean_name: "오늘의 요리", price: null }),
  menu({ original_name: "辛麺", korean_name: "매운 면", price: 600, spicy_level: "hot", category: "noodle" }),
];

function requestBody(overrides = {}) {
  return {
    conditions: {
      people: 3,
      budget: 4_000,
      allergies: [],
      dietary_restrictions: [],
      avoid_spicy: false,
      ...overrides,
    },
    menus,
  };
}

function recommendationRequest(body) {
  return new Request("http://localhost/api/recommend-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function geminiResponse(selection) {
  const json = JSON.stringify(selection);
  const splitAt = Math.floor(json.length / 2);
  return Response.json({
    status: "completed",
    steps: [
      { type: "user_input", content: [{ type: "text", text: "not output" }] },
      {
        type: "model_output",
        content: [
          { type: "text", text: json.slice(0, splitAt) },
          { type: "text", text: json.slice(splitAt) },
        ],
      },
    ],
  });
}

async function callRecommendation(body, selection, inspectRequest) {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    inspectRequest?.({ input, init });
    return geminiResponse(selection);
  };
  try {
    return await worker.fetch(
      recommendationRequest(body),
      { GEMINI_API_KEY: "test-only-key" },
      {},
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("A. 3명 / 4,000엔 조건에서 계산이 일치하는 예산 이하 조합을 반환한다", async () => {
  let upstream;
  const response = await callRecommendation(
    requestBody(),
    {
      items: [
        { menu_id: "menu-1", quantity: 1 },
        { menu_id: "menu-2", quantity: 1 },
        { menu_id: "menu-3", quantity: 1 },
        { menu_id: "menu-4", quantity: 1 },
      ],
      reason: "서로 다른 메인과 공유 사이드를 예산 안에서 골랐습니다.",
    },
    (request) => {
      upstream = request;
    },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(payload.recommendation.total_price, 2_900);
  assert.equal(payload.recommendation.remaining_budget, 1_100);
  assert.equal(
    payload.recommendation.items.reduce((sum, item) => sum + item.subtotal, 0),
    payload.recommendation.total_price,
  );
  const upstreamBody = JSON.parse(upstream.init.body);
  assert.equal(upstreamBody.model, "gemini-3.5-flash-lite");
  assert.equal(upstreamBody.response_format.mime_type, "application/json");
  assert.doesNotMatch(upstream.init.body, /test-only-key/);
});

test("B. 2명 / 2,000엔 조건에서 최소 2인분 조합을 반환한다", async () => {
  const response = await callRecommendation(
    requestBody({ people: 2, budget: 2_000 }),
    {
      items: [
        { menu_id: "menu-1", quantity: 1 },
        { menu_id: "menu-2", quantity: 1 },
      ],
      reason: "두 사람이 한 가지씩 고를 수 있는 구성입니다.",
    },
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.recommendation.total_price, 1_600);
  assert.equal(
    payload.recommendation.items.reduce((sum, item) => sum + item.quantity, 0),
    2,
  );
});

test("C. 새우 알레르기 조건은 새우와 갑각류 메뉴를 Gemini 후보에서 제외한다", async () => {
  let prompt = "";
  const response = await callRecommendation(
    requestBody({ people: 2, budget: 2_000, allergies: ["새우"] }),
    {
      items: [
        { menu_id: "menu-1", quantity: 1 },
        { menu_id: "menu-3", quantity: 1 },
      ],
      reason: "새우 관련 메뉴를 제외했습니다.",
    },
    ({ init }) => {
      prompt = JSON.parse(init.body).input[0].text;
    },
  );
  assert.equal(response.status, 200);
  assert.doesNotMatch(prompt, /"menu_id":"menu-0"/);
  const payload = await response.json();
  assert.equal(payload.recommendation.items.some((item) => item.menu_id === "menu-0"), false);
});

test("D. 매우 낮은 예산이면 Gemini를 호출하지 않고 계산된 부족 예산을 안내한다", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("Gemini must not be called");
  };
  try {
    const response = await worker.fetch(
      recommendationRequest(requestBody({ people: 3, budget: 100 })),
      { GEMINI_API_KEY: "test-only-key" },
      {},
    );
    const payload = await response.json();
    assert.equal(response.status, 422);
    assert.equal(payload.code, "BUDGET_TOO_LOW");
    assert.equal(payload.minimum_additional_budget, 1_700);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("E. 가격 정보가 없는 메뉴는 추천 후보와 총액 계산에서 제외한다", async () => {
  let prompt = "";
  const response = await callRecommendation(
    requestBody({ people: 2 }),
    {
      items: [{ menu_id: "menu-1", quantity: 2 }],
      reason: "가격을 확인할 수 있는 메뉴만 골랐습니다.",
    },
    ({ init }) => {
      prompt = JSON.parse(init.body).input[0].text;
    },
  );
  assert.equal(response.status, 200);
  assert.doesNotMatch(prompt, /"menu_id":"menu-5"/);
  assert.equal((await response.json()).recommendation.total_price, 1_400);
});

test("F. Gemini가 현재 메뉴 목록에 없는 menu_id를 반환하면 차단한다", async () => {
  const response = await callRecommendation(requestBody(), {
    items: [{ menu_id: "menu-999", quantity: 3 }],
    reason: "존재하지 않는 메뉴입니다.",
  });
  const payload = await response.json();
  assert.equal(response.status, 422);
  assert.equal(payload.success, false);
  assert.equal(payload.code, "INVALID_AI_SELECTION");
});

test("G. Gemini가 총예산을 초과하는 조합을 반환하면 차단한다", async () => {
  const response = await callRecommendation(
    requestBody({ people: 2, budget: 2_000 }),
    {
      items: [{ menu_id: "menu-2", quantity: 3 }],
      reason: "예산을 초과하는 잘못된 후보입니다.",
    },
  );
  const payload = await response.json();
  assert.equal(response.status, 422);
  assert.equal(payload.success, false);
  assert.equal(payload.code, "INVALID_AI_SELECTION");
  assert.match(payload.error, /총예산/);
});
