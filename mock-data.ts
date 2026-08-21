export type RiskLevel = "safe" | "caution" | "danger";

export interface MockMenuItem {
  id: string;
  sourceName: string;
  translatedName: string;
  price: number;
  risk: RiskLevel;
  evidence: string;
}

export const mockMenuItems: MockMenuItem[] = [
  { id: "ramen-tonkotsu", sourceName: "豚骨ラーメン", translatedName: "돈코츠라멘", price: 1000, risk: "safe", evidence: "밀·달걀·대두 표시" },
  { id: "ramen-shoyu", sourceName: "醤油ラーメン", translatedName: "쇼유라멘", price: 900, risk: "safe", evidence: "밀·달걀·대두 표시" },
  { id: "tantanmen", sourceName: "担々麺", translatedName: "탄탄멘", price: 1100, risk: "danger", evidence: "땅콩 포함 · 매운맛 3단계" },
  { id: "gyoza", sourceName: "焼き餃子（6個）", translatedName: "교자 6개", price: 600, risk: "safe", evidence: "밀·돼지고기·대두 표시" },
  { id: "chashu-don", sourceName: "チャーシュー丼", translatedName: "차슈덮밥", price: 900, risk: "safe", evidence: "돼지고기·대두 표시" },
  { id: "karaage", sourceName: "鶏の唐揚げ（5個）", translatedName: "닭튀김 5개", price: 700, risk: "caution", evidence: "소스 성분은 직원 확인 필요" },
  { id: "peanut-tofu", sourceName: "ピーナッツ冷奴", translatedName: "피넛 냉두부", price: 500, risk: "danger", evidence: "땅콩·대두 포함" },
  { id: "edamame", sourceName: "枝豆", translatedName: "에다마메", price: 400, risk: "safe", evidence: "대두 표시" },
];

export const recommendation = {
  items: [
    { emoji: "🍜", name: "돈코츠라멘", quantity: 1, price: 1000 },
    { emoji: "🍜", name: "쇼유라멘", quantity: 1, price: 900 },
    { emoji: "🍚", name: "차슈덮밥", quantity: 1, price: 900 },
    { emoji: "🥟", name: "교자 6개", quantity: 1, price: 600 },
  ],
  totalPrice: 3400,
};
