/** 전세계 주요 음식 알레르기 항목 데이터베이스 */

export interface AllergyItem {
  id: string;
  emoji: string;
  name: string;        // 한국어 이름
  nameEn: string;      // 영어 이름
  category: string;    // 분류
  keywords: string[];  // 검색용 키워드 (한/영/일 등)
}

export const ALLERGY_CATEGORIES = [
  "주요 8대 알레르기",
  "견과류",
  "해산물",
  "유제품/계란",
  "곡물/채소/과일",
  "육류",
  "조미료/첨가물",
  "기타",
] as const;

export const ALLERGY_DATABASE: AllergyItem[] = [
  // === 주요 8대 알레르기 ===
  { id: "peanut", emoji: "🥜", name: "땅콩", nameEn: "Peanut", category: "주요 8대 알레르기", keywords: ["땅콩", "peanut", "ピーナッツ", "落花生", "cacahuète", "arachide"] },
  { id: "milk", emoji: "🥛", name: "우유", nameEn: "Milk", category: "주요 8대 알레르기", keywords: ["우유", "유제품", "milk", "dairy", "牛乳", "乳", "lait", "milch"] },
  { id: "egg", emoji: "🥚", name: "달걀", nameEn: "Egg", category: "주요 8대 알레르기", keywords: ["달걀", "계란", "egg", "卵", "oeuf", "ei"] },
  { id: "wheat", emoji: "🌾", name: "밀", nameEn: "Wheat", category: "주요 8대 알레르기", keywords: ["밀", "글루텐", "wheat", "gluten", "小麦", "blé", "weizen"] },
  { id: "soy", emoji: "🫘", name: "대두", nameEn: "Soy", category: "주요 8대 알레르기", keywords: ["대두", "콩", "soy", "soybean", "大豆", "soja"] },
  { id: "treenut", emoji: "🌰", name: "견과류(전체)", nameEn: "Tree Nuts", category: "주요 8대 알레르기", keywords: ["견과류", "tree nut", "ナッツ", "noix"] },
  { id: "shellfish", emoji: "🦐", name: "갑각류", nameEn: "Shellfish", category: "주요 8대 알레르기", keywords: ["갑각류", "새우", "게", "shellfish", "shrimp", "crab", "エビ", "カニ", "甲殻類"] },
  { id: "fish", emoji: "🐟", name: "생선", nameEn: "Fish", category: "주요 8대 알레르기", keywords: ["생선", "어류", "fish", "魚", "poisson", "fisch"] },

  // === 견과류 상세 ===
  { id: "almond", emoji: "🔸", name: "아몬드", nameEn: "Almond", category: "견과류", keywords: ["아몬드", "almond", "アーモンド", "amande"] },
  { id: "walnut", emoji: "🔸", name: "호두", nameEn: "Walnut", category: "견과류", keywords: ["호두", "walnut", "クルミ", "noix"] },
  { id: "cashew", emoji: "🔸", name: "캐슈넛", nameEn: "Cashew", category: "견과류", keywords: ["캐슈넛", "캐슈", "cashew", "カシューナッツ", "cajou"] },
  { id: "pistachio", emoji: "🔸", name: "피스타치오", nameEn: "Pistachio", category: "견과류", keywords: ["피스타치오", "pistachio", "ピスタチオ", "pistache"] },
  { id: "macadamia", emoji: "🔸", name: "마카다미아", nameEn: "Macadamia", category: "견과류", keywords: ["마카다미아", "macadamia", "マカダミア"] },
  { id: "hazelnut", emoji: "🔸", name: "헤이즐넛", nameEn: "Hazelnut", category: "견과류", keywords: ["헤이즐넛", "hazelnut", "ヘーゼルナッツ", "noisette"] },
  { id: "pecan", emoji: "🔸", name: "피칸", nameEn: "Pecan", category: "견과류", keywords: ["피칸", "pecan", "ペカン", "pécan"] },
  { id: "brazilnut", emoji: "🔸", name: "브라질넛", nameEn: "Brazil Nut", category: "견과류", keywords: ["브라질넛", "brazil nut", "ブラジルナッツ"] },
  { id: "pine_nut", emoji: "🔸", name: "잣", nameEn: "Pine Nut", category: "견과류", keywords: ["잣", "pine nut", "松の実", "pignon"] },
  { id: "coconut", emoji: "🥥", name: "코코넛", nameEn: "Coconut", category: "견과류", keywords: ["코코넛", "coconut", "ココナッツ", "coco"] },

  // === 해산물 상세 ===
  { id: "shrimp", emoji: "🦐", name: "새우", nameEn: "Shrimp", category: "해산물", keywords: ["새우", "shrimp", "prawn", "エビ", "海老", "crevette"] },
  { id: "crab", emoji: "🦀", name: "게", nameEn: "Crab", category: "해산물", keywords: ["게", "crab", "カニ", "蟹", "crabe"] },
  { id: "lobster", emoji: "🦞", name: "랍스터", nameEn: "Lobster", category: "해산물", keywords: ["랍스터", "가재", "lobster", "ロブスター", "homard"] },
  { id: "squid", emoji: "🦑", name: "오징어", nameEn: "Squid", category: "해산물", keywords: ["오징어", "squid", "calamari", "イカ", "calmar"] },
  { id: "octopus", emoji: "🐙", name: "문어", nameEn: "Octopus", category: "해산물", keywords: ["문어", "octopus", "タコ", "poulpe"] },
  { id: "clam", emoji: "🐚", name: "조개", nameEn: "Clam", category: "해산물", keywords: ["조개", "clam", "mussel", "oyster", "貝", "アサリ", "牡蠣"] },
  { id: "salmon", emoji: "🐟", name: "연어", nameEn: "Salmon", category: "해산물", keywords: ["연어", "salmon", "サーモン", "鮭", "saumon"] },
  { id: "tuna", emoji: "🐟", name: "참치", nameEn: "Tuna", category: "해산물", keywords: ["참치", "tuna", "マグロ", "thon"] },
  { id: "mackerel", emoji: "🐟", name: "고등어", nameEn: "Mackerel", category: "해산물", keywords: ["고등어", "mackerel", "サバ", "maquereau"] },

  // === 유제품/계란 상세 ===
  { id: "cheese", emoji: "🧀", name: "치즈", nameEn: "Cheese", category: "유제품/계란", keywords: ["치즈", "cheese", "チーズ", "fromage", "käse"] },
  { id: "butter", emoji: "🧈", name: "버터", nameEn: "Butter", category: "유제품/계란", keywords: ["버터", "butter", "バター", "beurre"] },
  { id: "cream", emoji: "🍦", name: "크림", nameEn: "Cream", category: "유제품/계란", keywords: ["크림", "cream", "クリーム", "crème"] },
  { id: "yogurt", emoji: "🥛", name: "요거트", nameEn: "Yogurt", category: "유제품/계란", keywords: ["요거트", "요구르트", "yogurt", "ヨーグルト", "yaourt"] },
  { id: "lactose", emoji: "🥛", name: "유당(락토스)", nameEn: "Lactose", category: "유제품/계란", keywords: ["유당", "락토스", "lactose", "乳糖", "lactose"] },
  { id: "casein", emoji: "🥛", name: "카제인", nameEn: "Casein", category: "유제품/계란", keywords: ["카제인", "casein", "カゼイン", "caséine"] },

  // === 곡물/채소/과일 ===
  { id: "gluten", emoji: "🌾", name: "글루텐", nameEn: "Gluten", category: "곡물/채소/과일", keywords: ["글루텐", "gluten", "グルテン"] },
  { id: "buckwheat", emoji: "🌾", name: "메밀", nameEn: "Buckwheat", category: "곡물/채소/과일", keywords: ["메밀", "buckwheat", "そば", "蕎麦", "sarrasin"] },
  { id: "corn", emoji: "🌽", name: "옥수수", nameEn: "Corn", category: "곡물/채소/과일", keywords: ["옥수수", "corn", "maize", "トウモロコシ", "maïs"] },
  { id: "rice", emoji: "🍚", name: "쌀", nameEn: "Rice", category: "곡물/채소/과일", keywords: ["쌀", "rice", "米", "riz"] },
  { id: "sesame", emoji: "🔸", name: "참깨", nameEn: "Sesame", category: "곡물/채소/과일", keywords: ["참깨", "깨", "sesame", "ゴマ", "胡麻", "sésame"] },
  { id: "celery", emoji: "🥬", name: "셀러리", nameEn: "Celery", category: "곡물/채소/과일", keywords: ["셀러리", "celery", "セロリ", "céleri"] },
  { id: "mustard", emoji: "🟡", name: "겨자", nameEn: "Mustard", category: "곡물/채소/과일", keywords: ["겨자", "머스터드", "mustard", "マスタード", "からし", "moutarde"] },
  { id: "lupin", emoji: "🌱", name: "루핀", nameEn: "Lupin", category: "곡물/채소/과일", keywords: ["루핀", "lupin", "ルピナス"] },
  { id: "tomato", emoji: "🍅", name: "토마토", nameEn: "Tomato", category: "곡물/채소/과일", keywords: ["토마토", "tomato", "トマト", "tomate"] },
  { id: "garlic", emoji: "🧄", name: "마늘", nameEn: "Garlic", category: "곡물/채소/과일", keywords: ["마늘", "garlic", "ニンニク", "ail"] },
  { id: "onion", emoji: "🧅", name: "양파", nameEn: "Onion", category: "곡물/채소/과일", keywords: ["양파", "onion", "玉ねぎ", "oignon"] },
  { id: "kiwi", emoji: "🥝", name: "키위", nameEn: "Kiwi", category: "곡물/채소/과일", keywords: ["키위", "kiwi", "キウイ"] },
  { id: "banana", emoji: "🍌", name: "바나나", nameEn: "Banana", category: "곡물/채소/과일", keywords: ["바나나", "banana", "バナナ", "banane"] },
  { id: "mango", emoji: "🥭", name: "망고", nameEn: "Mango", category: "곡물/채소/과일", keywords: ["망고", "mango", "マンゴー", "mangue"] },
  { id: "peach", emoji: "🍑", name: "복숭아", nameEn: "Peach", category: "곡물/채소/과일", keywords: ["복숭아", "peach", "桃", "モモ", "pêche"] },
  { id: "apple", emoji: "🍎", name: "사과", nameEn: "Apple", category: "곡물/채소/과일", keywords: ["사과", "apple", "りんご", "リンゴ", "pomme"] },
  { id: "strawberry", emoji: "🍓", name: "딸기", nameEn: "Strawberry", category: "곡물/채소/과일", keywords: ["딸기", "strawberry", "イチゴ", "fraise"] },
  { id: "avocado", emoji: "🥑", name: "아보카도", nameEn: "Avocado", category: "곡물/채소/과일", keywords: ["아보카도", "avocado", "アボカド", "avocat"] },

  // === 육류 ===
  { id: "pork", emoji: "🐷", name: "돼지고기", nameEn: "Pork", category: "육류", keywords: ["돼지고기", "돼지", "pork", "豚肉", "porc", "schwein"] },
  { id: "beef", emoji: "🐄", name: "소고기", nameEn: "Beef", category: "육류", keywords: ["소고기", "쇠고기", "beef", "牛肉", "boeuf", "rind"] },
  { id: "chicken", emoji: "🐔", name: "닭고기", nameEn: "Chicken", category: "육류", keywords: ["닭고기", "닭", "chicken", "鶏肉", "poulet", "huhn"] },
  { id: "lamb", emoji: "🐑", name: "양고기", nameEn: "Lamb", category: "육류", keywords: ["양고기", "lamb", "mutton", "ラム", "羊肉", "agneau"] },
  { id: "duck", emoji: "🦆", name: "오리고기", nameEn: "Duck", category: "육류", keywords: ["오리고기", "오리", "duck", "鴨肉", "canard"] },
  { id: "gelatin", emoji: "🔸", name: "젤라틴", nameEn: "Gelatin", category: "육류", keywords: ["젤라틴", "gelatin", "ゼラチン", "gélatine"] },

  // === 조미료/첨가물 ===
  { id: "msg", emoji: "🧂", name: "MSG(글루타민산)", nameEn: "MSG", category: "조미료/첨가물", keywords: ["msg", "글루타민산", "조미료", "味の素", "glutamate"] },
  { id: "sulfite", emoji: "🔸", name: "아황산염", nameEn: "Sulfite", category: "조미료/첨가물", keywords: ["아황산", "sulfite", "亜硫酸", "sulfite"] },
  { id: "artificial_color", emoji: "🎨", name: "인공색소", nameEn: "Artificial Color", category: "조미료/첨가물", keywords: ["인공색소", "색소", "artificial color", "着色料", "colorant"] },
  { id: "preservative", emoji: "🧪", name: "방부제", nameEn: "Preservative", category: "조미료/첨가물", keywords: ["방부제", "preservative", "防腐剤", "conservateur"] },
  { id: "soy_sauce", emoji: "🫗", name: "간장", nameEn: "Soy Sauce", category: "조미료/첨가물", keywords: ["간장", "soy sauce", "醤油", "しょうゆ"] },
  { id: "fish_sauce", emoji: "🫗", name: "액젓/피쉬소스", nameEn: "Fish Sauce", category: "조미료/첨가물", keywords: ["액젓", "피쉬소스", "fish sauce", "ナンプラー", "nuoc mam"] },
  { id: "oyster_sauce", emoji: "🫗", name: "굴소스", nameEn: "Oyster Sauce", category: "조미료/첨가물", keywords: ["굴소스", "oyster sauce", "オイスターソース"] },

  // === 기타 ===
  { id: "alcohol", emoji: "🍺", name: "주류/알코올", nameEn: "Alcohol", category: "기타", keywords: ["알코올", "술", "주류", "alcohol", "アルコール", "alcool"] },
  { id: "caffeine", emoji: "☕", name: "카페인", nameEn: "Caffeine", category: "기타", keywords: ["카페인", "caffeine", "カフェイン", "caféine"] },
  { id: "honey", emoji: "🍯", name: "꿀", nameEn: "Honey", category: "기타", keywords: ["꿀", "honey", "ハチミツ", "蜂蜜", "miel"] },
  { id: "latex_fruit", emoji: "🍌", name: "라텍스 과일 증후군", nameEn: "Latex Fruit Syndrome", category: "기타", keywords: ["라텍스", "latex", "ラテックス"] },
  { id: "spicy", emoji: "🌶️", name: "매운 음식", nameEn: "Spicy Food", category: "기타", keywords: ["매운", "spicy", "辛い", "épicé", "고추", "唐辛子"] },
  { id: "raw_food", emoji: "🥩", name: "날 음식(생식)", nameEn: "Raw Food", category: "기타", keywords: ["생식", "날것", "raw", "生", "cru"] },
  { id: "fermented", emoji: "🫙", name: "발효 식품", nameEn: "Fermented Food", category: "기타", keywords: ["발효", "fermented", "発酵", "fermenté"] },
];

/** 검색 함수: 키워드, 이름, 카테고리로 검색 */
export function searchAllergies(query: string): AllergyItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return ALLERGY_DATABASE.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.category.includes(q) ||
      item.keywords.some((kw) => kw.toLowerCase().includes(q))
  );
}

/** 카테고리별 그룹핑 */
export function getAllergiesByCategory(): Record<string, AllergyItem[]> {
  const grouped: Record<string, AllergyItem[]> = {};
  for (const cat of ALLERGY_CATEGORIES) {
    grouped[cat] = ALLERGY_DATABASE.filter((item) => item.category === cat);
  }
  return grouped;
}
