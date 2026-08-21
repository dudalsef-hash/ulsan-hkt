import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

test("falls back to Wikimedia only when a menu has no local image", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  let upstreamRequest;

  globalThis.fetch = async (input, init) => {
    upstreamRequest = { input: String(input), init };
    return Response.json({
      pages: [
        {
          key: "File:Shoyu ramen.jpg",
          title: "File:Shoyu ramen.jpg",
          thumbnail: {
            mimetype: "image/jpeg",
            url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Shoyu_ramen.jpg/60px-Shoyu_ramen.jpg",
          },
        },
      ],
    });
  };

  try {
    const response = await worker.fetch(
      new Request(
        "http://localhost/api/menu-image?original_name=%E3%83%88%E3%83%A0%E3%83%A4%E3%83%A0%E3%82%AF%E3%83%B3&korean_name=%EB%98%A0%EC%96%8C%EA%BF%8D",
      ),
      {},
      {},
    );

    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /max-age=86400/);
    assert.deepEqual(await response.json(), {
      success: true,
      image: {
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Shoyu_ramen.jpg/960px-Shoyu_ramen.jpg",
        alt: "トムヤムクン 대표 이미지",
        source_url: "https://commons.wikimedia.org/wiki/File%3AShoyu_ramen.jpg",
        attribution: "Wikimedia Commons",
        license: null,
      },
    });

    const apiUrl = new URL(upstreamRequest.input);
    assert.equal(apiUrl.origin, "https://api.wikimedia.org");
    assert.equal(apiUrl.searchParams.get("q"), "トムヤムクン");
    assert.equal(apiUrl.searchParams.get("limit"), "10");
    assert.match(upstreamRequest.init.headers["User-Agent"], /MenuMate/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

const requiredLocalCases = [
  ["えのきうどん", "팽이버섯 우동", "01_팽이버섯우동_enoki_mushroom_udon.jpg"],
  ["きつねうどん", "유부 우동", "02_유부우동_kitsune_udon.jpg"],
  ["カレーうどん", "카레 우동", "08_카레우동_curry_udon.jpg"],
  ["醤油ラーメン", "간장 라멘", "21_간장라멘_shoyu_ramen.jpg"],
  ["親子丼", "오야코동", "29_오야코동_oyakodon.jpg"],
  ["焼めし", "볶음밥", "34_볶음밥_보통_fried_rice_regular.jpg"],
];

test("maps the six required demo menus locally without calling Wikimedia", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    throw new Error("Wikimedia must not be called for a local menu image");
  };

  try {
    for (const [originalName, koreanName, fileName] of requiredLocalCases) {
      const params = new URLSearchParams({
        original_name: originalName,
        korean_name: koreanName,
      });
      const response = await worker.fetch(
        new Request(`http://localhost/api/menu-image?${params}`),
        {},
        {},
      );
      const payload = await response.json();

      assert.equal(response.status, 200, originalName);
      assert.equal(payload.success, true, originalName);
      assert.equal(decodeURIComponent(payload.image.url), `/menu-images/${fileName}`);
      assert.equal(payload.image.attribution, "MenuMate 로컬 메뉴 이미지");
    }
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("connects all 35 CSV mappings to existing local JPEG files", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    throw new Error("No external lookup expected");
  };

  try {
    const csv = (await readFile(new URL("../data/menu_images_result.csv", import.meta.url), "utf8"))
      .replace(/^\uFEFF/, "");
    const rows = csv
      .split(/\r?\n/)
      .slice(1)
      .filter(Boolean)
      .map((line) => line.split(",").map((value) => value.replace(/^"|"$/g, "")));
    const files = await readdir(new URL("../public/menu-images/", import.meta.url));

    assert.equal(rows.length, 35);
    assert.equal(files.filter((name) => name.endsWith(".jpg")).length, 35);

    for (const row of rows) {
      const [, , originalName, koreanName, , fileName, acquired] = row;
      await access(new URL(`../public/menu-images/${fileName}`, import.meta.url));
      assert.equal(acquired, "O", koreanName);

      const params = new URLSearchParams({
        original_name: originalName,
        korean_name: koreanName,
      });
      const response = await worker.fetch(
        new Request(`http://localhost/api/menu-image?${params}`),
        {},
        {},
      );
      const payload = await response.json();
      assert.equal(response.status, 200, koreanName);
      assert.equal(decodeURIComponent(payload.image.url), `/menu-images/${fileName}`, koreanName);
    }

    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps set meals distinct from single dishes", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("No external lookup expected");
  };

  try {
    const singleResponse = await worker.fetch(
      new Request("http://localhost/api/menu-image?original_name=%E9%8D%8B%E7%84%BC%E3%81%86%E3%81%A9%E3%82%93&korean_name=%EB%82%98%EB%B2%A0%EC%95%BC%ED%82%A4%EC%9A%B0%EB%8F%99"),
      {},
      {},
    );
    const setResponse = await worker.fetch(
      new Request("http://localhost/api/menu-image?original_name=%E9%8D%8B%E7%84%BC%E3%81%86%E3%81%A9%E3%82%93%E5%AE%9A%E9%A3%9F&korean_name=%EB%82%98%EB%B2%A0%EC%95%BC%ED%82%A4%EC%9A%B0%EB%8F%99%20%EC%A0%95%EC%8B%9D"),
      {},
      {},
    );
    const single = await singleResponse.json();
    const setMeal = await setResponse.json();

    assert.match(decodeURIComponent(single.image.url), /^\/menu-images\/19_/);
    assert.match(decodeURIComponent(setMeal.image.url), /^\/menu-images\/20_/);
    assert.notEqual(single.image.url, setMeal.image.url);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("supports class IDs, English names, and conservative normalized matching", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("No external lookup expected");
  };

  try {
    const cases = [
      ["curry_udon", "", "08_"],
      ["Oyakodon", "", "29_"],
      ["", " 간장-라멘 ", "21_"],
    ];
    for (const [originalName, koreanName, prefix] of cases) {
      const params = new URLSearchParams({
        original_name: originalName,
        korean_name: koreanName,
      });
      const response = await worker.fetch(
        new Request(`http://localhost/api/menu-image?${params}`),
        {},
        {},
      );
      const payload = await response.json();
      assert.match(decodeURIComponent(payload.image.url), new RegExp(`^/menu-images/${prefix}`));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns a clear response when Wikimedia has no matching image", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ pages: [] });

  try {
    const response = await worker.fetch(
      new Request("http://localhost/api/menu-image?korean_name=unknown-menu"),
      {},
      {},
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, image: null });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects an image lookup without a menu name", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/menu-image"),
    {},
    {},
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "사진을 찾을 메뉴명이 필요합니다.",
  });
});
