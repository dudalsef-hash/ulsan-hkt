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

  switch (language) {
    case "ja": {
      const local = `${validItems
        .map((item) => `${item.originalName}を${formatJapaneseCount(item.quantity)}`)
        .join("、")}お願いします。`;
      return { local, korean };
    }
    case "zh-CN":
    case "zh-TW":
      return {
        local: `请给我${validItems.map((item) => `${item.originalName} ${item.quantity}份`).join("、")}。`,
        korean,
      };
    case "ko":
      return { local: korean, korean };
    case "es":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, por favor.`,
        korean,
      };
    case "fr":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, s'il vous plaît.`,
        korean,
      };
    case "de":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, bitte.`,
        korean,
      };
    case "it":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, per favore.`,
        korean,
      };
    case "th":
      return {
        local: `ขอ${validItems.map((item) => `${item.originalName} ${item.quantity} ที่`).join(" ")} ครับ/ค่ะ`,
        korean,
      };
    case "vi":
      return {
        local: `Cho tôi ${validItems.map((item) => `${item.originalName} ${item.quantity} phần`).join(", ")}.`,
        korean,
      };
    case "ru":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, пожалуйста.`,
        korean,
      };
    case "pt":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, por favor.`,
        korean,
      };
    case "ar":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join("، ")} من فضلك`,
        korean,
      };
    case "tr":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, lütfen.`,
        korean,
      };
    case "hi":
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, कृपया।`,
        korean,
      };
    case "id":
    case "ms":
      return {
        local: `Tolong ${validItems.map((item) => `${item.originalName} ${item.quantity} porsi`).join(", ")}.`,
        korean,
      };
    default:
      // English and other languages
      return {
        local: `${validItems.map((item) => `${item.originalName} × ${item.quantity}`).join(", ")}, please.`,
        korean,
      };
  }
}

export function buildAllergyCheckPhrase({
  language,
  allergies,
}: {
  language: string | null;
  allergies: AllergyPhraseItem[];
}) {
  const koreanNames = allergies.map((item) => item.koreanName).join(", ");
  const englishNames = allergies.map((item) => item.englishName).join(", ");
  const koreanSentence = `${koreanNames} 알레르기·식이제한이 있습니다. 음식, 소스 또는 조리 과정에 포함되는지 확인해주세요.`;

  switch (language) {
    case "ja": {
      const localNames = allergies
        .map((item) => item.localName || item.englishName)
        .join("、");
      return {
        local: `${localNames}のアレルギー・食事制限があります。${localNames}は入っていますか？`,
        korean: koreanSentence,
      };
    }
    case "zh-CN":
    case "zh-TW":
      return {
        local: `我有以下过敏/饮食限制：${englishNames}。请问菜品、酱料或烹饪过程中是否含有这些成分？`,
        korean: koreanSentence,
      };
    case "ko":
      return { local: koreanSentence, korean: koreanSentence };
    case "es":
      return {
        local: `Tengo alergia/restricción dietética: ${englishNames}. ¿Este plato contiene alguno de estos ingredientes?`,
        korean: koreanSentence,
      };
    case "fr":
      return {
        local: `J'ai une allergie/restriction alimentaire: ${englishNames}. Est-ce que ce plat en contient?`,
        korean: koreanSentence,
      };
    case "de":
      return {
        local: `Ich habe folgende Allergien/Ernährungseinschränkungen: ${englishNames}. Enthält dieses Gericht diese Zutaten?`,
        korean: koreanSentence,
      };
    case "it":
      return {
        local: `Ho le seguenti allergie/restrizioni alimentari: ${englishNames}. Questo piatto li contiene?`,
        korean: koreanSentence,
      };
    case "th":
      return {
        local: `ผม/ดิฉันแพ้ ${englishNames} กรุณาตรวจสอบว่าอาหารมีส่วนผสมเหล่านี้หรือไม่ครับ/ค่ะ`,
        korean: koreanSentence,
      };
    case "vi":
      return {
        local: `Tôi bị dị ứng với ${englishNames}. Xin kiểm tra xem món ăn có chứa những thành phần này không?`,
        korean: koreanSentence,
      };
    case "ru":
      return {
        local: `У меня аллергия/диетические ограничения: ${englishNames}. Содержит ли это блюдо эти ингредиенты?`,
        korean: koreanSentence,
      };
    case "pt":
      return {
        local: `Tenho alergia/restrição alimentar: ${englishNames}. Este prato contém algum desses ingredientes?`,
        korean: koreanSentence,
      };
    case "ar":
      return {
        local: `لدي حساسية/قيود غذائية: ${englishNames}. هل يحتوي هذا الطبق على أي من هذه المكونات؟`,
        korean: koreanSentence,
      };
    case "tr":
      return {
        local: `Şu alerjilerim/diyet kısıtlamalarım var: ${englishNames}. Bu yemek bunları içeriyor mu?`,
        korean: koreanSentence,
      };
    case "hi":
      return {
        local: `मुझे ${englishNames} से एलर्जी है। कृपया जांचें कि इस व्यंजन में ये सामग्री हैं या नहीं।`,
        korean: koreanSentence,
      };
    case "id":
    case "ms":
      return {
        local: `Saya memiliki alergi/pembatasan diet: ${englishNames}. Apakah hidangan ini mengandung bahan-bahan tersebut?`,
        korean: koreanSentence,
      };
    default:
      return {
        local: `I have the following allergies or dietary restrictions: ${englishNames}. Does this order contain any of them?`,
        korean: koreanSentence,
      };
  }
}

function formatJapaneseCount(quantity: number): string {
  return JAPANESE_COUNTS[quantity] ?? `${quantity}つ`;
}
