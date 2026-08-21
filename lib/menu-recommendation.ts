import type { AnalyzedMenuItem } from "./gemini-menu-analysis";

export interface RecommendationConditions {
  people: number;
  budget: number;
  allergies: string[];
  dietary_restrictions: string[];
  avoid_spicy: boolean;
}

export interface MenuRecommendationRequest {
  conditions: RecommendationConditions;
  menus: AnalyzedMenuItem[];
  previous_combination?: RecommendationSelectionItem[];
}

export interface RecommendationSelectionItem {
  menu_id: string;
  quantity: number;
}

export interface GeminiRecommendationSelection {
  items: RecommendationSelectionItem[];
  reason: string;
}

export interface RecommendedMenuItem extends RecommendationSelectionItem {
  original_name: string;
  korean_name: string;
  unit_price: number;
  subtotal: number;
  currency: string;
}

export interface MenuRecommendation {
  items: RecommendedMenuItem[];
  total_price: number;
  total_budget: number;
  remaining_budget: number;
  currency: string;
  reason: string;
}

export interface MenuRecommendationSuccess {
  success: true;
  recommendation: MenuRecommendation;
  has_alternative: boolean;
  message: string | null;
}

export interface MenuRecommendationError {
  success: false;
  error: string;
  code?:
    | "INVALID_REQUEST"
    | "MISSING_API_KEY"
    | "NO_ELIGIBLE_MENUS"
    | "BUDGET_TOO_LOW"
    | "INVALID_AI_SELECTION"
    | "AI_ERROR";
  minimum_additional_budget?: number;
}

export type MenuRecommendationResponse =
  | MenuRecommendationSuccess
  | MenuRecommendationError;

export interface EligibleMenu {
  menu_id: string;
  menu: AnalyzedMenuItem;
  price: number;
  currency: string;
}

const ALLERGY_ALIASES: Record<string, string[]> = {
  "땅콩": ["땅콩", "낙화생", "peanut", "groundnut"],
  peanut: ["땅콩", "낙화생", "peanut", "groundnut"],
  "새우": [
    "새우",
    "shrimp",
    "prawn",
    "갑각류",
    "crustacean",
    "게살",
    "대게",
    "꽃게",
    "crab",
    "랍스터",
    "lobster",
    "가재",
  ],
  shrimp: [
    "새우",
    "shrimp",
    "prawn",
    "갑각류",
    "crustacean",
    "게살",
    "대게",
    "꽃게",
    "crab",
    "랍스터",
    "lobster",
    "가재",
  ],
  "갑각류": [
    "새우",
    "shrimp",
    "prawn",
    "갑각류",
    "crustacean",
    "게살",
    "대게",
    "꽃게",
    "crab",
    "랍스터",
    "lobster",
    "가재",
  ],
  "우유": ["우유", "유제품", "milk", "dairy", "치즈", "cheese", "버터", "butter", "크림", "cream"],
  "달걀": ["달걀", "계란", "egg"],
  "밀": ["밀", "글루텐", "wheat", "gluten"],
  "대두": ["대두", "콩", "soy", "soya"],
  "생선": ["생선", "fish"],
  "조개": ["조개", "패류", "shellfish", "mollusk", "mollusc"],
};

export const MENU_RECOMMENDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          menu_id: {
            type: "string",
            description: "후보 목록에 실제로 있는 menu_id입니다.",
          },
          quantity: {
            type: "integer",
            minimum: 1,
            maximum: 12,
          },
        },
        required: ["menu_id", "quantity"],
      },
    },
    reason: {
      type: "string",
      description: "선택한 조합이 조건에 적절한 이유를 한국어 1~2문장으로 설명합니다.",
    },
  },
  required: ["items", "reason"],
} as const;

export function isMenuRecommendationRequest(
  value: unknown,
): value is MenuRecommendationRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<MenuRecommendationRequest>;
  const conditions = request.conditions as Partial<RecommendationConditions> | undefined;

  return Boolean(
    conditions &&
      Number.isInteger(conditions.people) &&
      (conditions.people ?? 0) >= 1 &&
      (conditions.people ?? 0) <= 20 &&
      typeof conditions.budget === "number" &&
      Number.isFinite(conditions.budget) &&
      conditions.budget > 0 &&
      Array.isArray(conditions.allergies) &&
      conditions.allergies.every((item) => typeof item === "string") &&
      Array.isArray(conditions.dietary_restrictions) &&
      conditions.dietary_restrictions.every((item) => typeof item === "string") &&
      typeof conditions.avoid_spicy === "boolean" &&
      Array.isArray(request.menus) &&
      request.menus.length > 0 &&
      request.menus.length <= 100 &&
      request.menus.every(isAnalyzedMenuItem) &&
      (request.previous_combination === undefined ||
        (Array.isArray(request.previous_combination) &&
          request.previous_combination.every(isRecommendationSelectionItem))),
  );
}

export function isGeminiRecommendationSelection(
  value: unknown,
): value is GeminiRecommendationSelection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GeminiRecommendationSelection>;
  return Boolean(
    Array.isArray(candidate.items) &&
      candidate.items.length > 0 &&
      candidate.items.every(isRecommendationSelectionItem) &&
      typeof candidate.reason === "string" &&
      candidate.reason.trim().length > 0 &&
      candidate.reason.length <= 500,
  );
}

export function getEligibleMenus(
  menus: AnalyzedMenuItem[],
  conditions: RecommendationConditions,
): { eligible: EligibleMenu[]; currency: string } {
  const currency = choosePrimaryCurrency(menus);
  const eligible = menus.flatMap((menu, index) => {
    if (
      menu.price === null ||
      !Number.isFinite(menu.price) ||
      menu.price < 0 ||
      !menu.currency ||
      menu.currency.toUpperCase() !== currency ||
      conditions.allergies.some((allergy) => menuMatchesAllergy(menu, allergy)) ||
      conditions.dietary_restrictions.some((restriction) =>
        menuViolatesDietaryRestriction(menu, restriction),
      ) ||
      (conditions.avoid_spicy && menu.spicy_level !== "none" && menu.spicy_level !== "unknown")
    ) {
      return [];
    }

    return [
      {
        menu_id: `menu-${index}`,
        menu,
        price: roundMoney(menu.price),
        currency,
      },
    ];
  });

  return { eligible, currency };
}

export function getMinimumAdditionalBudget(
  eligible: EligibleMenu[],
  people: number,
  budget: number,
): number | undefined {
  if (eligible.length === 0) return undefined;
  const mealCandidates = eligible.filter(
    ({ menu }) => !["side", "drink", "dessert"].includes(menu.category),
  );
  const pricedMeals = mealCandidates.length > 0 ? mealCandidates : eligible;
  const cheapest = Math.min(...pricedMeals.map((item) => item.price));
  const minimumTotal = roundMoney(cheapest * people);
  return minimumTotal > budget ? roundMoney(minimumTotal - budget) : undefined;
}

export function validateRecommendation(
  selection: GeminiRecommendationSelection,
  eligible: EligibleMenu[],
  conditions: RecommendationConditions,
  previousCombination: RecommendationSelectionItem[] = [],
): MenuRecommendationSuccess | MenuRecommendationError {
  const byId = new Map(eligible.map((item) => [item.menu_id, item]));
  const quantities = new Map<string, number>();

  for (const item of selection.items) {
    if (!byId.has(item.menu_id)) {
      return invalidSelection("AI가 현재 메뉴판에 없는 메뉴를 선택해 추천을 중단했습니다.");
    }
    quantities.set(item.menu_id, (quantities.get(item.menu_id) ?? 0) + item.quantity);
  }

  const totalQuantity = [...quantities.values()].reduce((sum, quantity) => sum + quantity, 0);
  if (totalQuantity < conditions.people) {
    return invalidSelection("인원수에 맞지 않는 조합이어서 추천을 표시하지 않았습니다.");
  }

  const maximumReasonableQuantity = conditions.people + Math.max(2, Math.ceil(conditions.people / 2));
  if (totalQuantity > maximumReasonableQuantity) {
    return invalidSelection("인원수에 비해 수량이 너무 많은 조합이어서 추천을 표시하지 않았습니다.");
  }

  const items: RecommendedMenuItem[] = [];
  let totalPrice = 0;
  for (const [menuId, quantity] of quantities) {
    const eligibleMenu = byId.get(menuId);
    if (!eligibleMenu) {
      return invalidSelection("추천 메뉴를 현재 메뉴판에서 확인할 수 없습니다.");
    }
    const subtotal = roundMoney(eligibleMenu.price * quantity);
    totalPrice = roundMoney(totalPrice + subtotal);
    items.push({
      menu_id: menuId,
      original_name: eligibleMenu.menu.original_name,
      korean_name: eligibleMenu.menu.korean_name,
      unit_price: eligibleMenu.price,
      quantity,
      subtotal,
      currency: eligibleMenu.currency,
    });
  }

  if (totalPrice > conditions.budget) {
    return invalidSelection("AI 추천 조합이 총예산을 초과해 결과를 표시하지 않았습니다.");
  }

  const signature = combinationSignature(items);
  const previousSignature = combinationSignature(previousCombination);
  const repeatsPrevious = previousSignature.length > 0 && signature === previousSignature;

  return {
    success: true,
    recommendation: {
      items,
      total_price: totalPrice,
      total_budget: roundMoney(conditions.budget),
      remaining_budget: roundMoney(conditions.budget - totalPrice),
      currency: items[0]?.currency ?? "USD",
      reason: selection.reason.trim(),
    },
    has_alternative: !repeatsPrevious,
    message: repeatsPrevious ? "현재 조건에서는 이 조합이 가장 적합해요." : null,
  };
}

export function menuMatchesAllergy(
  menu: AnalyzedMenuItem,
  allergy: string,
): boolean {
  const normalizedAllergy = normalize(allergy)
    .replace(/알레르기/g, "")
    .replace(/allergy/g, "")
    .trim();
  if (!normalizedAllergy) return false;
  const aliases = ALLERGY_ALIASES[normalizedAllergy] ?? [normalizedAllergy];
  const searchableText = normalize(
    [
      menu.original_name,
      menu.korean_name,
      menu.original_description ?? "",
      menu.korean_description,
      ...menu.ingredients,
      ...menu.allergens,
      menu.warning ?? "",
    ].join(" "),
  );
  return aliases.some((alias) => searchableText.includes(normalize(alias)));
}

function menuViolatesDietaryRestriction(
  menu: AnalyzedMenuItem,
  restriction: string,
): boolean {
  const normalizedRestriction = normalize(restriction);
  if (!normalizedRestriction || /맵지|안\s*맵|not\s*spicy/.test(normalizedRestriction)) {
    return false;
  }

  const searchableText = normalize(
    [
      menu.original_name,
      menu.korean_name,
      menu.original_description ?? "",
      menu.korean_description,
      ...menu.ingredients,
      ...menu.allergens,
      menu.warning ?? "",
    ].join(" "),
  );
  const containsAny = (terms: string[]) =>
    terms.some((term) => searchableText.includes(normalize(term)));

  if (/비건|vegan/.test(normalizedRestriction)) {
    return (
      ["meat", "seafood"].includes(menu.category) ||
      containsAny([
        "고기", "육류", "돼지", "소고기", "쇠고기", "닭", "생선", "해산물",
        "새우", "게", "우유", "치즈", "버터", "크림", "달걀", "계란",
        "meat", "pork", "beef", "chicken", "fish", "seafood", "milk", "dairy", "egg",
      ])
    );
  }
  if (/채식|vegetarian/.test(normalizedRestriction)) {
    return (
      ["meat", "seafood"].includes(menu.category) ||
      containsAny([
        "고기", "육류", "돼지", "소고기", "쇠고기", "닭", "생선", "해산물",
        "새우", "게", "meat", "pork", "beef", "chicken", "fish", "seafood",
      ])
    );
  }
  if (/할랄|halal|돼지고기|pork/.test(normalizedRestriction)) {
    return containsAny(["돼지", "돈육", "포크", "pork", "ham", "bacon", "술", "알코올", "alcohol"]);
  }
  if (/글루텐|gluten|밀\s*제외|wheat/.test(normalizedRestriction)) {
    return containsAny(["밀", "글루텐", "wheat", "gluten"]);
  }

  return false;
}

function isAnalyzedMenuItem(value: unknown): value is AnalyzedMenuItem {
  if (!value || typeof value !== "object") return false;
  const menu = value as Partial<AnalyzedMenuItem>;
  return Boolean(
    typeof menu.original_name === "string" &&
      menu.original_name.length > 0 &&
      typeof menu.korean_name === "string" &&
      (menu.original_description === null || typeof menu.original_description === "string") &&
      typeof menu.korean_description === "string" &&
      (menu.price === null ||
        (typeof menu.price === "number" && Number.isFinite(menu.price))) &&
      (menu.currency === null || typeof menu.currency === "string") &&
      Array.isArray(menu.ingredients) &&
      menu.ingredients.every((item) => typeof item === "string") &&
      Array.isArray(menu.allergens) &&
      menu.allergens.every((item) => typeof item === "string") &&
      typeof menu.spicy_level === "string" &&
      typeof menu.category === "string"
  );
}

function isRecommendationSelectionItem(
  value: unknown,
): value is RecommendationSelectionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RecommendationSelectionItem>;
  return (
    typeof item.menu_id === "string" &&
    /^menu-\d+$/.test(item.menu_id) &&
    Number.isInteger(item.quantity) &&
    (item.quantity ?? 0) >= 1 &&
    (item.quantity ?? 0) <= 12
  );
}

function choosePrimaryCurrency(menus: AnalyzedMenuItem[]): string {
  const counts = new Map<string, number>();
  for (const menu of menus) {
    if (menu.price === null || !menu.currency) continue;
    const currency = menu.currency.toUpperCase();
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
}

function combinationSignature(
  items: Array<{ menu_id: string; quantity: number }>,
): string {
  return items
    .map((item) => `${item.menu_id}:${item.quantity}`)
    .sort()
    .join("|");
}

function normalize(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function invalidSelection(error: string): MenuRecommendationError {
  return { success: false, code: "INVALID_AI_SELECTION", error };
}
