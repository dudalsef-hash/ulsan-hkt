import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the integrated allergy, order, and modern Gemini flows connected", async () => {
  const [page, allergyData, worker, gemini, gitignore, varsExample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/allergy-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/gemini-menu-analysis.ts", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    readFile(new URL("../.dev.vars.example", import.meta.url), "utf8"),
  ]);

  assert.equal((allergyData.match(/^ {2}\{ id:/gm) ?? []).length, 71);
  assert.match(page, /searchAllergies/);
  assert.match(page, /getAllergiesByCategory/);
  assert.match(page, /conditions\.allergies/);
  assert.match(page, /conditions\.dietaryRestrictions/);
  assert.match(page, /selectedQuantities/);
  assert.match(page, /buildOrderText/);
  assert.match(page, /buildAllergyQuestion/);
  assert.match(page, /splitTotal/);
  assert.match(page, /사진 없이 샘플 메뉴로 체험하기 \(SAMPLE\)/);
  assert.doesNotMatch(page, /mockMenuItems|startDummyAnalysis|폴백 모드/);

  assert.match(worker, /handleAnalyzeMenuRequest/);
  assert.match(worker, /handleMenuImageRequest/);
  assert.match(worker, /handleRecommendMenuRequest/);
  assert.doesNotMatch(worker, /gemini-2\.0-flash|generateContent|analyzeMenuWithGemini/);
  assert.match(gemini, /gemini-3\.5-flash-lite/);

  assert.match(gitignore, /^\.dev\.vars$/m);
  assert.match(gitignore, /^\.dev\.vars\.\*$/m);
  assert.match(gitignore, /^!\.dev\.vars\.example$/m);
  assert.match(gitignore, /^\*\.tsbuildinfo$/m);
  assert.equal(varsExample.trim().endsWith("GEMINI_API_KEY="), true);
});
