# 알레르기 검색 엔진 + Gemini API 메뉴 분석

이 폴더에는 Safe Plate 앱의 핵심 기능인 **알레르기 검색 엔진**과 **Gemini API 메뉴 분석** 코드가 들어있습니다.

---

## 파일 설명

| 파일 | 역할 |
|------|------|
| `allergy-data.ts` | 70개+ 알레르기 항목 DB + 다국어 검색 함수 |
| `page.tsx` | 프론트엔드 UI (알레르기 검색/선택 + API 호출) |
| `worker-index.ts` | 백엔드 서버 코드 (Gemini API 호출 엔드포인트) |
| `.dev.vars` | Gemini API 키 (환경변수) |

---

## 작동 방식

```
[사용자] 알레르기 검색/선택 (page.tsx)
    ↓
[프론트] /api/analyze-menu POST 요청 (page.tsx)
    ↓
[서버] Gemini 2.0 Flash API 호출 (worker-index.ts)
    ↓
[Gemini] 메뉴판 이미지 분석 + 알레르기 대조 + 추천 조합 계산
    ↓
[사용자] 결과 화면 (안전/위험 판정, 추천 메뉴, 주문 문장)
```

---

## 합치는 방법

### 1. 알레르기 DB만 쓰고 싶을 때
`allergy-data.ts`만 복사해서 import하면 됩니다.

```typescript
import { searchAllergies, getAllergiesByCategory } from './allergy-data';

// 검색
const results = searchAllergies("땅콩");

// 카테고리별 조회
const grouped = getAllergiesByCategory();
```

### 2. Gemini API 메뉴 분석까지 쓰고 싶을 때
1. `worker-index.ts`의 `/api/analyze-menu` 엔드포인트 부분을 서버에 추가
2. `.dev.vars`의 `GEMINI_API_KEY`를 환경변수로 설정
3. `page.tsx`의 `startAnalysis` 함수 참고해서 프론트에서 API 호출

### 3. Cloudflare Workers 환경에서 사용할 때
```bash
# .dev.vars 파일을 프로젝트 루트에 복사
cp allergy-engine/.dev.vars ./.dev.vars

# 또는 Cloudflare 대시보드에서 시크릿 설정
wrangler secret put GEMINI_API_KEY
```

---

## Gemini API 키

`.dev.vars` 파일에 키가 들어있습니다.
무료 버전(Gemini 2.0 Flash)을 사용하며, 발급은 여기서:
https://aistudio.google.com/app/apikey

---

## 지원하는 알레르기 카테고리 (8개)

1. 주요 8대 알레르기 (땅콩, 우유, 달걀, 밀, 대두, 견과류, 갑각류, 생선)
2. 견과류 (아몬드, 호두, 캐슈넛, 피스타치오 등)
3. 해산물 (새우, 게, 랍스터, 오징어, 연어 등)
4. 유제품/계란 (치즈, 버터, 크림, 유당 등)
5. 곡물/채소/과일 (글루텐, 메밀, 참깨, 토마토, 복숭아 등)
6. 육류 (돼지, 소, 닭, 양, 젤라틴 등)
7. 조미료/첨가물 (MSG, 아황산염, 간장, 굴소스 등)
8. 기타 (알코올, 카페인, 꿀, 매운 음식, 발효 식품 등)

총 70개+ 항목, 다국어 검색 지원 (한/영/일/불어)
