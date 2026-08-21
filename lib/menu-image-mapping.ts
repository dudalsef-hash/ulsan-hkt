export interface LocalMenuImageMapping {
  number: string;
  group: string;
  classId: string;
  japanese: string;
  korean: string;
  english: string;
  fileName: string;
  aliases?: string[];
}

export interface ResolvedLocalMenuImage {
  url: string;
  alt: string;
  source_url: null;
  attribution: string;
  license: null;
}

export const LOCAL_MENU_IMAGE_MAPPINGS: readonly LocalMenuImageMapping[] = [
  { number: "01", group: "우동류", classId: "enoki_udon", japanese: "えのきうどん", korean: "팽이버섯 우동", english: "Enoki Mushroom Udon", fileName: "01_팽이버섯우동_enoki_mushroom_udon.jpg" },
  { number: "02", group: "우동류", classId: "kitsune_udon", japanese: "きつねうどん", korean: "유부 우동", english: "Kitsune Udon", fileName: "02_유부우동_kitsune_udon.jpg" },
  { number: "03", group: "우동류", classId: "wakame_udon", japanese: "わかめうどん", korean: "미역 우동", english: "Wakame Seaweed Udon", fileName: "03_미역우동_wakame_udon.jpg" },
  { number: "04", group: "우동류", classId: "tempura_udon", japanese: "天ぷらうどん", korean: "튀김 우동", english: "Tempura Udon", fileName: "04_튀김우동_tempura_udon.jpg" },
  { number: "05", group: "우동류", classId: "egg_udon", japanese: "玉子うどん", korean: "계란 우동", english: "Egg Udon", fileName: "05_계란우동_egg_udon.jpg", aliases: ["달걀 우동"] },
  { number: "06", group: "우동류", classId: "meat_udon", japanese: "肉うどん", korean: "고기 우동", english: "Meat Udon", fileName: "06_고기우동_meat_udon.jpg" },
  { number: "07", group: "우동류", classId: "kayaku_udon", japanese: "かやくうどん", korean: "가야쿠 우동", english: "Kayaku Udon", fileName: "07_가야쿠우동_kayaku_udon.jpg" },
  { number: "08", group: "우동류", classId: "curry_udon", japanese: "カレーうどん", korean: "카레 우동", english: "Curry Udon", fileName: "08_카레우동_curry_udon.jpg" },
  { number: "09", group: "우동류", classId: "yaki_udon", japanese: "焼うどん", korean: "야끼우동", english: "Yaki Udon", fileName: "09_야끼우동_yaki_udon.jpg", aliases: ["焼きうどん", "야키 우동", "야끼 우동"] },
  { number: "10", group: "소바/면류", classId: "yakisoba", japanese: "焼きそば", korean: "야키소바", english: "Yakisoba", fileName: "10_야키소바_yakisoba.jpg" },
  { number: "11", group: "정식류", classId: "udon_set", japanese: "うどん定食", korean: "우동 정식", english: "Udon Set Meal", fileName: "11_우동정식_udon_set_meal.jpg" },
  { number: "12", group: "정식류", classId: "yaki_udon_set", japanese: "焼うどん定食", korean: "야끼우동 정식", english: "Yaki Udon Set Meal", fileName: "12_야끼우동정식_yaki_udon_set_meal.jpg", aliases: ["焼きうどん定食", "야키 우동 정식", "야끼 우동 정식"] },
  { number: "13", group: "정식류", classId: "yakisoba_set", japanese: "焼きそば定食", korean: "야키소바 정식", english: "Yakisoba Set Meal", fileName: "13_야키소바정식_yakisoba_set_meal.jpg" },
  { number: "14", group: "소바/면류", classId: "champon", japanese: "チャンポン", korean: "짬뽕", english: "Champon", fileName: "14_짬뽕_champon.jpg", aliases: ["ちゃんぽん", "Champong"] },
  { number: "15", group: "우동류", classId: "zaru_udon", japanese: "ざるうどん(夏期のみ)", korean: "자루우동 (하절기 한정)", english: "Zaru Udon (Summer Only)", fileName: "15_자루우동_zaru_udon.jpg", aliases: ["ざるうどん", "자루우동", "Zaru Udon"] },
  { number: "16", group: "소바/면류", classId: "zaru_soba", japanese: "ざるそば(夏期のみ)", korean: "자루소바 (하절기 한정)", english: "Zaru Soba (Summer Only)", fileName: "16_자루소바_zaru_soba.jpg", aliases: ["ざるそば", "자루소바", "Zaru Soba"] },
  { number: "17", group: "소바/면류", classId: "chilled_somen", japanese: "冷しそうめん(夏期のみ)", korean: "냉소면 (하절기 한정)", english: "Chilled Somen (Summer Only)", fileName: "17_냉소면_chilled_somen.jpg", aliases: ["冷しそうめん", "冷やしそうめん", "냉소면", "Chilled Somen"] },
  { number: "18", group: "소바/면류", classId: "hiyashi_chuka", japanese: "冷し中華(夏期のみ)", korean: "히야시추카 (하절기 한정)", english: "Hiyashi Chuka (Summer Only)", fileName: "18_히야시추카_hiyashi_chuka.jpg", aliases: ["冷し中華", "冷やし中華", "히야시추카", "Hiyashi Chuka"] },
  { number: "19", group: "우동류", classId: "nabeyaki_udon", japanese: "鍋焼うどん(冬期のみ)", korean: "나베야키우동 (동절기 한정)", english: "Nabeyaki Udon (Winter Only)", fileName: "19_나베야키우동_nabeyaki_udon.jpg", aliases: ["鍋焼うどん", "鍋焼きうどん", "나베야키우동", "Nabeyaki Udon"] },
  { number: "20", group: "정식류", classId: "nabeyaki_udon_set", japanese: "鍋焼うどん定食(冬期のみ)", korean: "나베야키우동 정식 (동절기 한정)", english: "Nabeyaki Udon Set Meal (Winter Only)", fileName: "20_나베야키우동정식_nabeyaki_udon_set_meal.jpg", aliases: ["鍋焼うどん定食", "鍋焼きうどん定食", "나베야키우동 정식", "Nabeyaki Udon Set Meal"] },
  { number: "21", group: "라멘류", classId: "shoyu_ramen", japanese: "醤油ラーメン", korean: "간장 라멘", english: "Shoyu Ramen", fileName: "21_간장라멘_shoyu_ramen.jpg", aliases: ["쇼유 라멘", "쇼유라멘"] },
  { number: "22", group: "라멘류", classId: "tonkotsu_ramen", japanese: "とんこつラーメン", korean: "돈코츠 라멘", english: "Tonkotsu Ramen", fileName: "22_돈코츠라멘_tonkotsu_ramen.jpg", aliases: ["豚骨ラーメン"] },
  { number: "23", group: "라멘류", classId: "stamina_ramen", japanese: "スタミナラーメン", korean: "스태미나 라멘", english: "Stamina Ramen", fileName: "23_스태미나라멘_stamina_ramen.jpg" },
  { number: "24", group: "라멘류", classId: "stamina_chashu", japanese: "スタミナチャーシュー", korean: "스태미나 차슈 라멘", english: "Stamina Chashu Ramen", fileName: "24_스태미나차슈라멘_stamina_chashu_ramen.jpg", aliases: ["スタミナチャーシューメン"] },
  { number: "25", group: "라멘류", classId: "chashu_ramen", japanese: "チャーシューメン", korean: "차슈멘", english: "Chashu Ramen", fileName: "25_차슈멘_chashu_ramen.jpg", aliases: ["차슈 라멘"] },
  { number: "26", group: "라멘류", classId: "special_ramen", japanese: "特製ラーメン", korean: "특제 라멘", english: "Special Ramen", fileName: "26_특제라멘_special_ramen.jpg" },
  { number: "27", group: "정식류", classId: "ramen_set", japanese: "ラーメン定食", korean: "라멘 정식", english: "Ramen Set Meal", fileName: "27_라멘정식_ramen_set_meal.jpg" },
  { number: "28", group: "덮밥류", classId: "egg_rice_bowl", japanese: "玉子丼", korean: "계란 덮밥 (타마고동)", english: "Egg Rice Bowl", fileName: "28_계란덮밥_egg_rice_bowl.jpg", aliases: ["계란 덮밥", "타마고동", "달걀 덮밥"] },
  { number: "29", group: "덮밥류", classId: "oyakodon", japanese: "親子丼", korean: "오야코동", english: "Oyakodon", fileName: "29_오야코동_oyakodon.jpg" },
  { number: "30", group: "덮밥류", classId: "tanindon", japanese: "他人丼", korean: "타닌동", english: "Tanindon", fileName: "30_타닌동_tanindon.jpg" },
  { number: "31", group: "덮밥류", classId: "meat_rice_bowl", japanese: "肉丼", korean: "고기 덮밥", english: "Meat Rice Bowl", fileName: "31_고기덮밥_meat_rice_bowl.jpg" },
  { number: "32", group: "정식류", classId: "gyudon_set", japanese: "牛丼定食", korean: "규동 정식", english: "Gyudon Set Meal", fileName: "32_규동정식_gyudon_set_meal.jpg" },
  { number: "33", group: "정식류", classId: "katsudon_set", japanese: "かつ丼定食", korean: "가츠동 정식", english: "Katsudon Set Meal", fileName: "33_가츠동정식_katsudon_set_meal.jpg", aliases: ["カツ丼定食"] },
  { number: "34", group: "볶음밥류", classId: "fried_rice", japanese: "焼めし〈並〉", korean: "볶음밥 (보통)", english: "Fried Rice (Regular)", fileName: "34_볶음밥_보통_fried_rice_regular.jpg", aliases: ["焼めし", "볶음밥", "볶음밥 보통", "Fried Rice"] },
  { number: "35", group: "볶음밥류", classId: "fried_rice_large", japanese: "焼めし〈大〉", korean: "볶음밥 (곱빼기/대)", english: "Fried Rice (Large)", fileName: "35_볶음밥_곱빼기_fried_rice_large.jpg", aliases: ["볶음밥 곱빼기", "볶음밥 대", "곱빼기 볶음밥"] },
] as const;

export function findLocalMenuImage(
  originalName: string,
  koreanName: string,
): ResolvedLocalMenuImage | null {
  const original = exactKey(originalName);
  const korean = exactKey(koreanName);

  const mapping =
    findByExactField("japanese", original) ??
    findByExactField("korean", korean) ??
    findByEnglishOrClass(original, korean) ??
    findByNormalizedValue(originalName, koreanName);

  if (!mapping) return null;
  return {
    url: `/menu-images/${encodeURIComponent(mapping.fileName)}`,
    alt: `${mapping.korean} 대표 이미지`,
    source_url: null,
    attribution: "MenuMate 로컬 메뉴 이미지",
    license: null,
  };
}

function findByExactField(
  field: "japanese" | "korean",
  query: string,
): LocalMenuImageMapping | undefined {
  if (!query) return undefined;
  return LOCAL_MENU_IMAGE_MAPPINGS.find(
    (mapping) =>
      exactKey(mapping[field]) === query ||
      mapping.aliases?.some((alias) => exactKey(alias) === query),
  );
}

function findByEnglishOrClass(
  original: string,
  korean: string,
): LocalMenuImageMapping | undefined {
  const queries = new Set([original, korean].filter(Boolean));
  return LOCAL_MENU_IMAGE_MAPPINGS.find(
    (mapping) =>
      queries.has(exactKey(mapping.english)) ||
      queries.has(exactKey(mapping.classId)),
  );
}

function findByNormalizedValue(
  originalName: string,
  koreanName: string,
): LocalMenuImageMapping | undefined {
  const queries = new Set(
    [originalName, koreanName].map(normalizedKey).filter(Boolean),
  );
  if (queries.size === 0) return undefined;

  return LOCAL_MENU_IMAGE_MAPPINGS.find((mapping) =>
    [
      mapping.japanese,
      mapping.korean,
      mapping.english,
      mapping.classId,
      ...(mapping.aliases ?? []),
    ].some((value) => queries.has(normalizedKey(value))),
  );
}

function exactKey(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function normalizedKey(value: string): string {
  return exactKey(value).replace(/[\p{P}\p{S}\s]+/gu, "");
}
