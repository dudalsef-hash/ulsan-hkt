/** Cloudflare Worker entry point for the vinext application. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  GEMINI_API_KEY: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface AllergyInfo {
  id: string;
  name: string;
  nameEn: string;
}

interface AnalyzeMenuRequest {
  image: string | null;  // base64 encoded image
  allergies: AllergyInfo[];
  people: number;
  budget: number;
}

/**
 * Gemini API를 사용하여 메뉴판을 분석하는 함수
 */
async function analyzeMenuWithGemini(
  request: AnalyzeMenuRequest,
  apiKey: string,
): Promise<Response> {
  const allergyList = request.allergies.map((a) => `${a.name}(${a.nameEn})`).join(", ");

  const prompt = `당신은 레스토랑 메뉴판을 분석하는 AI 도우미입니다.

사용자 조건:
- 인원: ${request.people}명
- 예산: ¥${request.budget} (현지 통화)
- 알레르기/식이제한: ${allergyList || "없음"}

${request.image ? "첨부된 메뉴판 이미지를 분석하여" : "다음 샘플 일본 식당 메뉴를 분석하여"} 아래 JSON 형식으로 응답해주세요.

${!request.image ? `샘플 메뉴:
- 豚骨ラーメン (돈코츠라멘) ¥1,000
- 醤油ラーメン (쇼유라멘) ¥900
- 担々麺 (탄탄멘) ¥1,100 - 땅콩 소스 사용, 매운맛
- 焼き餃子 6個 (교자 6개) ¥600
- チャーシュー丼 (차슈덮밥) ¥900
- 鶏の唐揚げ 5個 (닭튀김 5개) ¥700
- ピーナッツ冷奴 (피넛 냉두부) ¥500 - 땅콩, 대두
- 枝豆 (에다마메) ¥400 - 대두
` : ""}

분석 시 각 메뉴에 대해:
1. 원래 이름, 한국어 번역, 가격을 정리
2. 각 메뉴의 주요 식재료를 추론하고, 사용자의 알레르기 목록과 대조
3. risk를 판정: "safe"(안전), "caution"(확인필요), "danger"(위험-알레르기 물질 포함)
4. 예산과 인원에 맞는 최적 주문 조합 추천
5. 현지어로 주문 문장과 알레르기 확인 문장 생성

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "menuItems": [
    {
      "id": "고유id",
      "sourceName": "원래 메뉴명",
      "translatedName": "한국어 번역",
      "price": 숫자,
      "risk": "safe|caution|danger",
      "evidence": "판정 근거 (예: 밀·달걀·대두 표시)"
    }
  ],
  "recommendation": {
    "items": [
      { "emoji": "이모지", "name": "메뉴명(한국어)", "quantity": 숫자, "price": 숫자 }
    ],
    "totalPrice": 숫자,
    "reason": "추천 이유 설명"
  },
  "allergyWarnings": ["경고 메시지 배열"],
  "orderText": {
    "local": "현지어 주문 문장",
    "korean": "한국어 번역"
  },
  "allergyQuestion": {
    "local": "현지어 알레르기 확인 질문",
    "korean": "한국어 번역"
  }
}`;

  // Gemini API 호출 (gemini-2.0-flash 모델 사용)
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const parts: Array<Record<string, unknown>> = [];

  // 이미지가 있으면 멀티모달로 전송
  if (request.image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: request.image,
      },
    });
  }

  parts.push({ text: prompt });

  const geminiResponse = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!geminiResponse.ok) {
    const error = await geminiResponse.text();
    return new Response(JSON.stringify({ error: "Gemini API 호출 실패", details: error }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const geminiData = await geminiResponse.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return new Response(JSON.stringify({ error: "Gemini 응답이 비어있습니다" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // JSON 파싱 시도
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Gemini 응답 파싱 실패", raw: text }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Gemini 메뉴 분석 API 엔드포인트
    if (url.pathname === "/api/analyze-menu" && request.method === "POST") {
      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GEMINI_API_KEY가 설정되지 않았습니다" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const body = (await request.json()) as AnalyzeMenuRequest;
        return await analyzeMenuWithGemini(body, apiKey);
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "요청 처리 중 오류 발생", details: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      );
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
