import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAllergyCheckPhrase,
  buildOrderPhrase,
  mergeRecommendationQuantities,
} from "../lib/order-display.ts";

test("builds a natural Japanese phrase from analyzed original menu names", () => {
  const phrase = buildOrderPhrase({
    language: "ja",
    items: [
      { originalName: "豚骨ラーメン", koreanName: "돈코츠 라멘", quantity: 1 },
      { originalName: "トンカツ", koreanName: "돈카츠", quantity: 1 },
    ],
  });

  assert.equal(phrase.local, "豚骨ラーメンを一つ、トンカツを一つお願いします。");
  assert.equal(phrase.korean, "돈코츠 라멘 1개, 돈카츠 1개 부탁드립니다.");
});

test("uses the Japanese counter for a quantity of two", () => {
  const phrase = buildOrderPhrase({
    language: "ja",
    items: [{ originalName: "豚骨ラーメン", koreanName: "돈코츠 라멘", quantity: 2 }],
  });
  assert.equal(phrase.local, "豚骨ラーメンを二つお願いします。");
});

test("merges duplicate recommendation quantities and rejects unknown menu ids", () => {
  assert.deepEqual(
    mergeRecommendationQuantities(
      { "menu-0": 1 },
      [{ menu_id: "menu-0", quantity: 1 }, { menu_id: "menu-1", quantity: 2 }],
      2,
    ),
    { "menu-0": 2, "menu-1": 2 },
  );
  assert.throws(
    () => mergeRecommendationQuantities({}, [{ menu_id: "menu-9", quantity: 1 }], 2),
    /현재 메뉴판에 없는 메뉴/,
  );
});

test("builds a Japanese allergy confirmation question", () => {
  const phrase = buildAllergyCheckPhrase({
    language: "ja",
    allergies: [{ koreanName: "땅콩", englishName: "Peanut", localName: "ピーナッツ" }],
  });
  assert.match(phrase.local, /ピーナッツのアレルギー/);
  assert.match(phrase.local, /ピーナッツは入っていますか/);
});
