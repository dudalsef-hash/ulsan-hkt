/**
 * Safe Plate 다국어 메뉴 분석 시스템 - 언어 및 통화 설정
 * 모든 언어/통화 관련 데이터를 한 곳에서 관리합니다.
 */

export interface LanguageInfo {
  code: string;         // ISO 639-1
  name: string;         // 영어 이름
  nativeName: string;   // 원어 이름
  flag: string;         // 국기 이모지
}

export interface CurrencyInfo {
  code: string;         // ISO 4217
  symbol: string;       // 통화 기호
  name: string;         // 통화 이름 (한국어)
}

export interface CountryInfo {
  code: string;         // ISO 3166-1 alpha-2
  name: string;         // 영어 이름
  nameKo: string;       // 한국어 이름
  flag: string;         // 국기 이모지
  languages: string[];  // 주요 사용 언어 코드
  currency: string;     // 주요 통화 코드
}

// ===== 지원 언어 목록 =====
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文简体", flag: "🇨🇳" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "中文繁體", flag: "🇹🇼" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tl", name: "Filipino", nativeName: "Filipino", flag: "🇵🇭" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮" },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷" },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱" },
  { code: "ro", name: "Romanian", nativeName: "Română", flag: "🇷🇴" },
];

// ===== 통화 목록 =====
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "JPY", symbol: "¥", name: "일본 엔" },
  { code: "KRW", symbol: "₩", name: "한국 원" },
  { code: "USD", symbol: "$", name: "미국 달러" },
  { code: "EUR", symbol: "€", name: "유로" },
  { code: "GBP", symbol: "£", name: "영국 파운드" },
  { code: "CNY", symbol: "¥", name: "중국 위안" },
  { code: "TWD", symbol: "NT$", name: "대만 달러" },
  { code: "THB", symbol: "฿", name: "태국 바트" },
  { code: "VND", symbol: "₫", name: "베트남 동" },
  { code: "SGD", symbol: "S$", name: "싱가포르 달러" },
  { code: "AUD", symbol: "A$", name: "호주 달러" },
  { code: "CAD", symbol: "C$", name: "캐나다 달러" },
  { code: "HKD", symbol: "HK$", name: "홍콩 달러" },
  { code: "MYR", symbol: "RM", name: "말레이시아 링깃" },
  { code: "PHP", symbol: "₱", name: "필리핀 페소" },
  { code: "IDR", symbol: "Rp", name: "인도네시아 루피아" },
  { code: "INR", symbol: "₹", name: "인도 루피" },
  { code: "TRY", symbol: "₺", name: "터키 리라" },
  { code: "RUB", symbol: "₽", name: "러시아 루블" },
  { code: "BRL", symbol: "R$", name: "브라질 레알" },
  { code: "MXN", symbol: "MX$", name: "멕시코 페소" },
  { code: "CHF", symbol: "CHF", name: "스위스 프랑" },
  { code: "SEK", symbol: "kr", name: "스웨덴 크로나" },
  { code: "NOK", symbol: "kr", name: "노르웨이 크로네" },
  { code: "DKK", symbol: "kr", name: "덴마크 크로네" },
  { code: "PLN", symbol: "zł", name: "폴란드 즈워티" },
  { code: "CZK", symbol: "Kč", name: "체코 코루나" },
  { code: "ILS", symbol: "₪", name: "이스라엘 셰켈" },
  { code: "AED", symbol: "د.إ", name: "UAE 디르함" },
  { code: "SAR", symbol: "﷼", name: "사우디 리얄" },
];

// ===== 국가-언어-통화 매핑 =====
export const COUNTRY_MAP: CountryInfo[] = [
  { code: "JP", name: "Japan", nameKo: "일본", flag: "🇯🇵", languages: ["ja"], currency: "JPY" },
  { code: "KR", name: "South Korea", nameKo: "한국", flag: "🇰🇷", languages: ["ko"], currency: "KRW" },
  { code: "US", name: "United States", nameKo: "미국", flag: "🇺🇸", languages: ["en"], currency: "USD" },
  { code: "GB", name: "United Kingdom", nameKo: "영국", flag: "🇬🇧", languages: ["en"], currency: "GBP" },
  { code: "CN", name: "China", nameKo: "중국", flag: "🇨🇳", languages: ["zh-CN"], currency: "CNY" },
  { code: "TW", name: "Taiwan", nameKo: "대만", flag: "🇹🇼", languages: ["zh-TW"], currency: "TWD" },
  { code: "FR", name: "France", nameKo: "프랑스", flag: "🇫🇷", languages: ["fr"], currency: "EUR" },
  { code: "DE", name: "Germany", nameKo: "독일", flag: "🇩🇪", languages: ["de"], currency: "EUR" },
  { code: "IT", name: "Italy", nameKo: "이탈리아", flag: "🇮🇹", languages: ["it"], currency: "EUR" },
  { code: "ES", name: "Spain", nameKo: "스페인", flag: "🇪🇸", languages: ["es"], currency: "EUR" },
  { code: "PT", name: "Portugal", nameKo: "포르투갈", flag: "🇵🇹", languages: ["pt"], currency: "EUR" },
  { code: "TH", name: "Thailand", nameKo: "태국", flag: "🇹🇭", languages: ["th"], currency: "THB" },
  { code: "VN", name: "Vietnam", nameKo: "베트남", flag: "🇻🇳", languages: ["vi"], currency: "VND" },
  { code: "ID", name: "Indonesia", nameKo: "인도네시아", flag: "🇮🇩", languages: ["id"], currency: "IDR" },
  { code: "MY", name: "Malaysia", nameKo: "말레이시아", flag: "🇲🇾", languages: ["ms"], currency: "MYR" },
  { code: "PH", name: "Philippines", nameKo: "필리핀", flag: "🇵🇭", languages: ["tl", "en"], currency: "PHP" },
  { code: "IN", name: "India", nameKo: "인도", flag: "🇮🇳", languages: ["hi", "en"], currency: "INR" },
  { code: "TR", name: "Turkey", nameKo: "터키", flag: "🇹🇷", languages: ["tr"], currency: "TRY" },
  { code: "RU", name: "Russia", nameKo: "러시아", flag: "🇷🇺", languages: ["ru"], currency: "RUB" },
  { code: "AU", name: "Australia", nameKo: "호주", flag: "🇦🇺", languages: ["en"], currency: "AUD" },
  { code: "CA", name: "Canada", nameKo: "캐나다", flag: "🇨🇦", languages: ["en", "fr"], currency: "CAD" },
  { code: "SG", name: "Singapore", nameKo: "싱가포르", flag: "🇸🇬", languages: ["en", "zh-CN", "ms"], currency: "SGD" },
  { code: "HK", name: "Hong Kong", nameKo: "홍콩", flag: "🇭🇰", languages: ["zh-TW", "en"], currency: "HKD" },
  { code: "NL", name: "Netherlands", nameKo: "네덜란드", flag: "🇳🇱", languages: ["nl"], currency: "EUR" },
  { code: "SE", name: "Sweden", nameKo: "스웨덴", flag: "🇸🇪", languages: ["sv"], currency: "SEK" },
  { code: "NO", name: "Norway", nameKo: "노르웨이", flag: "🇳🇴", languages: ["no"], currency: "NOK" },
  { code: "DK", name: "Denmark", nameKo: "덴마크", flag: "🇩🇰", languages: ["da"], currency: "DKK" },
  { code: "FI", name: "Finland", nameKo: "핀란드", flag: "🇫🇮", languages: ["fi"], currency: "EUR" },
  { code: "PL", name: "Poland", nameKo: "폴란드", flag: "🇵🇱", languages: ["pl"], currency: "PLN" },
  { code: "CZ", name: "Czech Republic", nameKo: "체코", flag: "🇨🇿", languages: ["cs"], currency: "CZK" },
  { code: "GR", name: "Greece", nameKo: "그리스", flag: "🇬🇷", languages: ["el"], currency: "EUR" },
  { code: "IL", name: "Israel", nameKo: "이스라엘", flag: "🇮🇱", languages: ["he"], currency: "ILS" },
  { code: "SA", name: "Saudi Arabia", nameKo: "사우디아라비아", flag: "🇸🇦", languages: ["ar"], currency: "SAR" },
  { code: "AE", name: "UAE", nameKo: "아랍에미리트", flag: "🇦🇪", languages: ["ar", "en"], currency: "AED" },
  { code: "MX", name: "Mexico", nameKo: "멕시코", flag: "🇲🇽", languages: ["es"], currency: "MXN" },
  { code: "BR", name: "Brazil", nameKo: "브라질", flag: "🇧🇷", languages: ["pt"], currency: "BRL" },
  { code: "UA", name: "Ukraine", nameKo: "우크라이나", flag: "🇺🇦", languages: ["uk"], currency: "UAH" },
  { code: "RO", name: "Romania", nameKo: "루마니아", flag: "🇷🇴", languages: ["ro"], currency: "RON" },
  { code: "CH", name: "Switzerland", nameKo: "스위스", flag: "🇨🇭", languages: ["de", "fr", "it"], currency: "CHF" },
];

// ===== 유틸리티 함수 =====

/** 언어 코드로 LanguageInfo 조회 */
export function getLanguageByCode(code: string): LanguageInfo | undefined {
  const normalized = code.toLowerCase();
  return SUPPORTED_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === normalized,
  );
}

/** 통화 코드로 CurrencyInfo 조회 */
export function getCurrencyByCode(code: string): CurrencyInfo | undefined {
  return SUPPORTED_CURRENCIES.find(
    (curr) => curr.code.toUpperCase() === code.toUpperCase(),
  );
}

/** 국가 코드로 CountryInfo 조회 */
export function getCountryByCode(code: string): CountryInfo | undefined {
  return COUNTRY_MAP.find(
    (country) => country.code.toUpperCase() === code.toUpperCase(),
  );
}

/** 언어 코드에서 국기 이모지 반환 */
export function getFlagForLanguage(langCode: string): string {
  const lang = getLanguageByCode(langCode);
  return lang?.flag ?? "🌐";
}

/** 언어 코드에서 표시용 이름 반환 (예: "🇯🇵 Japanese") */
export function getLanguageDisplayName(langCode: string): string {
  const lang = getLanguageByCode(langCode);
  if (lang) return `${lang.flag} ${lang.name}`;
  return `🌐 ${langCode}`;
}

/** 여러 언어 코드를 표시용 문자열로 변환 */
export function formatDetectedLanguages(codes: string[]): string {
  if (codes.length === 0) return "🌐 알 수 없음";
  return codes.map(getLanguageDisplayName).join(" + ");
}

/** 통화 코드로 가격 포맷 */
export function formatPriceWithCurrency(price: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: currencyCode === "JPY" || currencyCode === "KRW" ? 0 : 2,
    }).format(price);
  } catch {
    const curr = getCurrencyByCode(currencyCode);
    return `${curr?.symbol ?? currencyCode} ${price.toLocaleString()}`;
  }
}

/** 통화의 기본 예산 추천값 (해당 통화에서 일반적인 1인 식사 비용 수준) */
export function getDefaultBudget(currencyCode: string): { budget: number; min: number; step: number } {
  switch (currencyCode.toUpperCase()) {
    case "JPY": return { budget: 4000, min: 500, step: 500 };
    case "KRW": return { budget: 50000, min: 5000, step: 5000 };
    case "USD": return { budget: 50, min: 5, step: 5 };
    case "EUR": return { budget: 40, min: 5, step: 5 };
    case "GBP": return { budget: 35, min: 5, step: 5 };
    case "CNY": return { budget: 200, min: 20, step: 20 };
    case "TWD": return { budget: 1000, min: 100, step: 100 };
    case "THB": return { budget: 1000, min: 100, step: 100 };
    case "VND": return { budget: 500000, min: 50000, step: 50000 };
    case "SGD": return { budget: 60, min: 5, step: 5 };
    case "HKD": return { budget: 300, min: 50, step: 50 };
    case "MYR": return { budget: 100, min: 10, step: 10 };
    case "PHP": return { budget: 2000, min: 200, step: 200 };
    case "IDR": return { budget: 300000, min: 50000, step: 50000 };
    case "INR": return { budget: 2000, min: 200, step: 200 };
    case "TRY": return { budget: 500, min: 50, step: 50 };
    case "RUB": return { budget: 3000, min: 500, step: 500 };
    case "AUD": case "CAD": return { budget: 50, min: 5, step: 5 };
    default: return { budget: 50, min: 5, step: 5 };
  }
}

/** 통화 기호 반환 */
export function getCurrencySymbol(currencyCode: string): string {
  const curr = getCurrencyByCode(currencyCode);
  return curr?.symbol ?? currencyCode;
}

/** 다국어 주문 문장 생성 */
export function buildMultilingualOrderText(
  menus: Array<{ original_name: string; korean_name: string; quantity: number }>,
  detectedLanguage: string | null,
): { local: string; korean: string } {
  const korean = menus.map((m) => `${m.korean_name} ${m.quantity}개`).join(", ");

  switch (detectedLanguage) {
    case "ja":
      return {
        local: `${menus.map((m) => `${m.original_name}を${m.quantity}つ`).join("、\n")}お願いします。`,
        korean,
      };
    case "zh-CN":
    case "zh-TW":
      return {
        local: `请给我${menus.map((m) => `${m.original_name} ${m.quantity}份`).join("、")}。`,
        korean,
      };
    case "ko":
      return {
        local: korean,
        korean,
      };
    case "es":
      return {
        local: `${menus.map((m) => `${m.original_name} × ${m.quantity}`).join(", ")}, por favor.`,
        korean,
      };
    case "fr":
      return {
        local: `${menus.map((m) => `${m.original_name} × ${m.quantity}`).join(", ")}, s'il vous plaît.`,
        korean,
      };
    case "de":
      return {
        local: `${menus.map((m) => `${m.original_name} × ${m.quantity}`).join(", ")}, bitte.`,
        korean,
      };
    case "it":
      return {
        local: `${menus.map((m) => `${m.original_name} × ${m.quantity}`).join(", ")}, per favore.`,
        korean,
      };
    case "th":
      return {
        local: `ขอ${menus.map((m) => `${m.original_name} ${m.quantity} ที่`).join(" ")} ครับ/ค่ะ`,
        korean,
      };
    case "vi":
      return {
        local: `Cho tôi ${menus.map((m) => `${m.original_name} ${m.quantity} phần`).join(", ")}.`,
        korean,
      };
    default:
      // 영어 또는 기타 언어
      return {
        local: `${menus.map((m) => `${m.original_name} × ${m.quantity}`).join(", ")}, please.`,
        korean,
      };
  }
}

/** 다국어 알레르기 확인 문장 생성 */
export function buildMultilingualAllergyQuestion(
  allergyNames: { korean: string; english: string },
  detectedLanguage: string | null,
): { local: string; korean: string } {
  const { korean, english } = allergyNames;
  const koreanSentence = `${korean} 알레르기·식이제한이 있습니다. 음식, 소스 또는 조리 과정에 포함되는지 확인해주세요.`;

  switch (detectedLanguage) {
    case "ja":
      return {
        local: `${english}のアレルギー・食事制限があります。料理やソース、調理過程に含まれていますか？`,
        korean: koreanSentence,
      };
    case "zh-CN":
    case "zh-TW":
      return {
        local: `我有${english}过敏/饮食限制。请问菜品、酱料或烹饪过程中是否含有这些成分？`,
        korean: koreanSentence,
      };
    case "ko":
      return {
        local: koreanSentence,
        korean: koreanSentence,
      };
    case "es":
      return {
        local: `Tengo alergia/restricción dietética a: ${english}. ¿Contiene alguno de estos ingredientes?`,
        korean: koreanSentence,
      };
    case "fr":
      return {
        local: `J'ai une allergie/restriction alimentaire: ${english}. Est-ce que ce plat en contient?`,
        korean: koreanSentence,
      };
    case "de":
      return {
        local: `Ich habe eine Allergie/Ernährungseinschränkung: ${english}. Enthält dieses Gericht diese Zutaten?`,
        korean: koreanSentence,
      };
    case "it":
      return {
        local: `Ho un'allergia/restrizione alimentare: ${english}. Questo piatto contiene questi ingredienti?`,
        korean: koreanSentence,
      };
    case "th":
      return {
        local: `ผม/ฉันแพ้ ${english} กรุณาตรวจสอบว่าอาหารมีส่วนผสมเหล่านี้หรือไม่`,
        korean: koreanSentence,
      };
    case "vi":
      return {
        local: `Tôi bị dị ứng với ${english}. Xin hãy kiểm tra xem món ăn có chứa những thành phần này không?`,
        korean: koreanSentence,
      };
    default:
      return {
        local: `I have the following allergies or dietary restrictions: ${english}. Does this order contain any of them?`,
        korean: koreanSentence,
      };
  }
}
