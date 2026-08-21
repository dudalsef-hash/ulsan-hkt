import assert from "node:assert/strict";
import test from "node:test";

import { ALLERGY_DATABASE } from "../app/allergy-data.ts";
import {
  MENU_RISK_LABELS,
  menuAllergyInfoIsUncertain,
  menuConflictsWithSelectedConditions,
  menuMatchesAllergy,
  resolveMenuRiskLevel,
} from "../lib/menu-recommendation.ts";

const PEANUT = ALLERGY_DATABASE.find((item) => item.id === "peanut");
const MILK = ALLERGY_DATABASE.find((item) => item.id === "milk");

function menu(overrides) {
  return {
    original_name: "メニュー",
    korean_name: "메뉴",
    original_description: null,
    korean_description: "테스트 메뉴입니다.",
    price: 900,
    currency: "JPY",
    ingredients: ["밀", "간장"],
    allergens: ["밀"],
    spicy_level: "none",
    category: "noodle",
    confidence: 0.95,
    warning: null,
    ...overrides,
  };
}

const tonkotsuRamen = menu({
  original_name: "豚骨ラーメン",
  korean_name: "돈코츠 라멘",
  korean_description: "돼지뼈로 우린 진한 국물 라멘입니다.",
  ingredients: ["돼지뼈", "밀 면", "간장"],
  allergens: ["밀", "대두"],
});

const peanutTantanmen = menu({
  original_name: "担々麺",
  korean_name: "땅콩소스 탄탄멘",
  korean_description: "땅콩 소스를 넣은 매운 탄탄멘입니다.",
  ingredients: ["밀 면", "땅콩 소스", "참깨"],
  allergens: ["밀", "땅콩"],
});

test("알레르기 충돌 메뉴는 danger(빨간색 점)로 판정된다", () => {
  assert.equal(resolveMenuRiskLevel(peanutTantanmen, [PEANUT]), "danger");
  assert.equal(menuConflictsWithSelectedConditions(peanutTantanmen, [PEANUT]), true);
});

test("알레르기 충돌이 없는 메뉴는 safe(초록색 점)로 판정된다", () => {
  assert.equal(resolveMenuRiskLevel(tonkotsuRamen, [PEANUT]), "safe");
  assert.equal(menuConflictsWithSelectedConditions(tonkotsuRamen, [PEANUT]), false);
});

test("allergens 배열이 비어 있지 않아도 사용자 알레르기와 무관하면 초록색이다", () => {
  // 이전 구현은 allergens.length > 0 이면 무조건 danger 였으므로 모든 메뉴가 빨간 점이 됐다.
  assert.ok(tonkotsuRamen.allergens.length > 0);
  assert.equal(resolveMenuRiskLevel(tonkotsuRamen, [PEANUT]), "safe");
});

test("원문 메뉴명에만 알레르기 표기가 있어도 충돌로 잡는다", () => {
  const peanutTofu = menu({
    original_name: "ピーナッツ冷奴",
    korean_name: "피넛 냉두부",
    korean_description: "차가운 두부 요리입니다.",
    ingredients: ["두부"],
    allergens: ["대두"],
  });
  assert.equal(resolveMenuRiskLevel(peanutTofu, [PEANUT]), "danger");
});

test("추천 엔진과 동일한 별칭 판정을 재사용한다", () => {
  const creamUdon = menu({
    original_name: "クリームうどん",
    korean_name: "크림 우동",
    korean_description: "생크림을 사용한 우동입니다.",
    ingredients: ["생크림", "밀 면"],
    allergens: [],
  });
  // menuMatchesAllergy("우유")는 "크림"을 별칭으로 포함한다. 상태 점도 같은 결론을 내야 한다.
  assert.equal(menuMatchesAllergy(creamUdon, MILK.name), true);
  assert.equal(resolveMenuRiskLevel(creamUdon, [MILK]), "danger");
});

test("판정이 불확실한 메뉴는 초록색이 아니라 caution으로 유지된다", () => {
  const unknownInfo = menu({
    korean_name: "이름을 읽을 수 없는 메뉴",
    ingredients: [],
    allergens: [],
    warning: null,
  });
  assert.equal(menuAllergyInfoIsUncertain(unknownInfo), true);
  assert.equal(resolveMenuRiskLevel(unknownInfo, [PEANUT]), "caution");

  const warned = menu({ warning: "소스 성분은 직원 확인이 필요합니다." });
  assert.equal(menuAllergyInfoIsUncertain(warned), true);
  assert.equal(resolveMenuRiskLevel(warned, [PEANUT]), "caution");
});

test("충돌 판정이 불확실 판정보다 우선한다", () => {
  const conflictAndUncertain = menu({
    korean_name: "땅콩 소스 무침",
    ingredients: [],
    allergens: [],
    warning: "재료를 정확히 확인할 수 없습니다.",
  });
  assert.equal(resolveMenuRiskLevel(conflictAndUncertain, [PEANUT]), "danger");
});

test("알레르기를 선택하지 않으면 충돌은 없지만 불확실 판정은 유지된다", () => {
  assert.equal(resolveMenuRiskLevel(tonkotsuRamen, []), "safe");
  assert.equal(resolveMenuRiskLevel(menu({ ingredients: [], allergens: [] }), []), "caution");
});

test("모든 등급이 색 이외의 텍스트 라벨을 가진다", () => {
  for (const level of ["safe", "caution", "danger"]) {
    assert.equal(typeof MENU_RISK_LABELS[level], "string");
    assert.ok(MENU_RISK_LABELS[level].length > 0);
  }
});

test("상태 점은 세 가지 CSS 클래스 중 하나만 사용한다", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const level of ["safe", "caution", "danger"]) {
    assert.match(css, new RegExp(`\\.risk-dot\\.${level}\\s*\\{[^}]*background`));
  }
});
