export interface OrderPhraseItem {
  originalName: string;
  koreanName: string;
  quantity: number;
}

export interface AllergyPhraseItem {
  koreanName: string;
  englishName: string;
  localName?: string;
}

export interface RecommendationQuantityItem {
  menu_id: string;
  quantity: number;
}

const JAPANESE_COUNTS: Record<number, string> = {
  1: "一つ",
  2: "二つ",
  3: "三つ",
  4: "四つ",
  5: "五つ",
  6: "六つ",
  7: "七つ",
  8: "八つ",
  9: "九つ",
  10: "十",
};

export function mergeRecommendationQuantities(
  current: Record<string, number>,
  items: RecommendationQuantityItem[],
  menuCount: number,
): Record<string, number> {
  const next = { ...current };

  for (const item of items) {
    const match = /^menu-(\d+)$/.exec(item.menu_id);
    const menuIndex = match ? Number(match[1]) : -1;
    if (
      !Number.isInteger(menuIndex) ||
      menuIndex < 0 ||
      menuIndex >= menuCount ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error("추천 결과에 현재 메뉴판에 없는 메뉴가 포함되어 있어 주문에 추가하지 않았어요.");
    }
    next[item.menu_id] = (next[item.menu_id] ?? 0) + item.quantity;
  }

  return next;
}

export function buildOrderPhrase({
  language,
  items,
}: {
  language: string | null;
  items: OrderPhraseItem[];
}) {
  const validItems = items.filter((item) => item.quantity > 0);
  const korean = `${validItems
    .map((item) => `${item.koreanName || item.originalName} ${item.quantity}개`)
    .join(", ")} 부탁드립니다.`;

  if (language === "ja") {
    const local = `${validItems
      .map((item) => `${item.originalName}を${formatJapaneseCount(item.quantity)}`)
      .join("、")}お願いします。`;
    return { local, korean };
  }

  return {
    local: validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", "),
    korean,
  };
}

export function buildAllergyCheckPhrase({
  language,
  allergies,
}: {
  language: string | null;
  allergies: AllergyPhraseItem[];
}) {
  const koreanNames = allergies.map((item) => item.koreanName).join(", ");
  if (language === "ja") {
    const localNames = allergies
      .map((item) => item.localName || item.englishName)
      .join("、");
    return {
      local: `${localNames}のアレルギー・食事制限があります。${localNames}は入っていますか？`,
      korean: `${koreanNames} 알레르기·식이제한이 있습니다. 음식, 소스 또는 조리 과정에 포함되는지 확인해주세요.`,
    };
  }

  const englishNames = allergies.map((item) => item.englishName).join(", ");
  return {
    local: `I have the following allergies or dietary restrictions: ${englishNames}. Does this order contain any of them?`,
    korean: `${koreanNames} 알레르기·식이제한이 있습니다. 주문 전 포함 여부를 확인해주세요.`,
  };
}

function formatJapaneseCount(quantity: number): string {
  return JAPANESE_COUNTS[quantity] ?? `${quantity}つ`;
}
