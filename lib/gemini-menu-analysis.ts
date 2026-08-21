export const GEMINI_MENU_MODEL = "gemini-3.5-flash-lite";

export type SpicyLevel = "none" | "mild" | "medium" | "hot" | "unknown";
export type MenuCategory =
  | "noodle"
  | "rice"
  | "meat"
  | "seafood"
  | "dessert"
  | "drink"
  | "side"
  | "other"
  | "unknown";

export interface AnalyzedMenuItem {
  original_name: string;
  korean_name: string;
  original_description: string | null;
  korean_description: string;
  price: number | null;
  currency: string | null;
  ingredients: string[];
  allergens: string[];
  spicy_level: SpicyLevel;
  category: MenuCategory;
  confidence: number;
  warning: string | null;
}

export interface MenuAnalysisResult {
  success: true;
  detected_language: string | null;
  restaurant_context: string | null;
  menus: AnalyzedMenuItem[];
  warnings: string[];
}

export interface MenuAnalysisError {
  success: false;
  error: string;
}

export const MENU_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    success: {
      type: "boolean",
      description: "분석이 완료된 응답에서는 항상 true입니다.",
    },
    detected_language: {
      type: ["string", "null"],
      description: "메뉴판에서 감지한 주 언어의 ISO 639-1 코드입니다.",
    },
    restaurant_context: {
      type: ["string", "null"],
      description: "사진에 식당명이나 음식 종류가 명시된 경우의 짧은 문맥입니다.",
    },
    menus: {
      type: "array",
      description: "사진에서 실제로 읽힌 메뉴만 포함합니다.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original_name: {
            type: "string",
            description: "메뉴판에 실제로 적힌 원문 메뉴명입니다.",
          },
          korean_name: {
            type: "string",
            description: "원문 메뉴명의 자연스러운 한국어 번역입니다.",
          },
          original_description: {
            type: ["string", "null"],
            description: "메뉴판에 실제 설명이 보일 때만 원문 그대로 반환합니다.",
          },
          korean_description: {
            type: "string",
            description: "읽힌 정보에 근거한 한국어 1~2문장 음식 설명입니다.",
          },
          price: {
            type: ["number", "null"],
            description: "사진에서 명확히 읽힌 숫자 가격이며 불명확하면 null입니다.",
          },
          currency: {
            type: ["string", "null"],
            description: "JPY, KRW, USD 같은 통화 코드이며 불명확하면 null입니다.",
          },
          ingredients: {
            type: "array",
            items: { type: "string" },
            description: "사진 또는 메뉴명으로 합리적으로 알 수 있는 대표 재료입니다.",
          },
          allergens: {
            type: "array",
            items: { type: "string" },
            description: "가능성이 있는 대표 알레르기 유발 재료입니다.",
          },
          spicy_level: {
            type: "string",
            enum: ["none", "mild", "medium", "hot", "unknown"],
          },
          category: {
            type: "string",
            enum: [
              "noodle",
              "rice",
              "meat",
              "seafood",
              "dessert",
              "drink",
              "side",
              "other",
              "unknown",
            ],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          warning: {
            type: ["string", "null"],
            description: "추정 정보 또는 직원 확인이 필요한 사항입니다.",
          },
        },
        required: [
          "original_name",
          "korean_name",
          "original_description",
          "korean_description",
          "price",
          "currency",
          "ingredients",
          "allergens",
          "spicy_level",
          "category",
          "confidence",
          "warning",
        ],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      description: "전체 분석에 적용되는 불확실성 및 안전 안내입니다.",
    },
  },
  required: [
    "success",
    "detected_language",
    "restaurant_context",
    "menus",
    "warnings",
  ],
} as const;

export function isMenuAnalysisResult(value: unknown): value is MenuAnalysisResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<MenuAnalysisResult>;
  if (result.success !== true || !Array.isArray(result.menus)) return false;
  if (!Array.isArray(result.warnings)) return false;

  return result.menus.every((menu) => {
    if (!menu || typeof menu !== "object") return false;
    const item = menu as Partial<AnalyzedMenuItem>;
    return (
      typeof item.original_name === "string" &&
      item.original_name.length > 0 &&
      typeof item.korean_name === "string" &&
      typeof item.korean_description === "string" &&
      Array.isArray(item.ingredients) &&
      Array.isArray(item.allergens) &&
      typeof item.confidence === "number" &&
      item.confidence >= 0 &&
      item.confidence <= 1
    );
  });
}
